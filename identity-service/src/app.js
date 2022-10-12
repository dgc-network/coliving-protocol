const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const mailgun = require('mailgun-js')
const { redisClient, Lock } = require('./redis')
const optimizelySDK = require('@optimizely/optimizely-sdk')
const Sentry = require('@sentry/node')
const cluster = require('cluster')

const config = require('./config.js')
const txRelay = require('./relay/txRelay')
const ethTxRelay = require('./relay/ethTxRelay')
const { runMigrations } = require('./migrationManager')
const colivingLibsWrapper = require('./colivingLibsInstance')

const NotificationProcessor = require('./notifications/index.js')
const { generateWalletLockKey } = require('./relay/txRelay.js')
const { generateETHWalletLockKey } = require('./relay/ethTxRelay.js')

const { SlackReporter } = require('./utils/slackReporter')
const { sendResponse, errorResponseServerError } = require('./apiHelpers')
const { fetchAnnouncements } = require('./announcements')
const { logger, loggingMiddleware } = require('./logging')
const {
  getRateLimiter,
  getRateLimiterMiddleware,
  isIPWhitelisted,
  getIP
} = require('./rateLimiter.js')
const cors = require('./corsMiddleware')
const { getFeatureFlag, FEATURE_FLAGS } = require('./featureFlag')
const { setupRewardsAttester } = require('./utils/configureAttester')
const { startRegistrationQueue } = require('./solanaNodeRegistration')

const DOMAIN = 'mail.coliving.lol'

class App {
  constructor (port) {
    this.port = port
    this.express = express()
    this.redisClient = redisClient
    this.configureSentry()
    this.configureMailgun()

    this.optimizelyPromise = null
    this.optimizelyClientInstance = this.configureOptimizely()

    // Async job configuration
    this.notificationProcessor = new NotificationProcessor({
      errorHandler: (error) => {
        try {
          return Sentry.captureException(error)
        } catch (sentryError) {
          logger.error(`Received error from Sentry ${sentryError}`)
        }
      }
    })

    // Note: The order of the following functions is IMPORTANT, as it sets the functions
    // that process a request in the order applied
    this.expressSettings()
    this.setMiddleware()
    this.setRateLimiters()
    this.setRoutes()
    this.setErrorHandler()
  }

  async init () {
    let server
    await this.getColivingAnnouncements()

    /**
     * From the cluster docs - https://nodejs.org/docs/latest-v14.x/api/cluster.html#cluster_cluster
     * "A single instance of Node.js runs in a single thread. To take advantage of multi-core systems,
     * the user will sometimes want to launch a cluster of Node.js processes to handle the load.
     * The cluster module allows easy creation of child processes that all share server ports."
     *
     * We have the master node in the cluster run migrations and start notifications processor
     * The workers start express server processes
     */
    if (cluster.isMaster) {
      // run all migrations
      // this is a stupid solution to a timing bug, because migrations attempt to get run when
      // the db port is exposed, not when it's ready to accept incoming connections. the timeout
      // attempts to wait until the db is accepting connections
      await new Promise(resolve => setTimeout(resolve, 2000))
      await this.runMigrations()

      // clear DATA & ETH relayer keys
      await Lock.clearAllLocks(generateWalletLockKey('*'))
      await Lock.clearAllLocks(generateETHWalletLockKey('*'))

      // if it's a non test run
      // 1. start notifications processing
      // 2. fork web server worker processes
      if (!config.get('isTestRun')) {
        const colivingInstance = await this.configureColivingInstance()
        cluster.fork({ 'WORKER_TYPE': 'notifications' })

        await this.configureRewardsAttester(colivingInstance)
        await this.configureDiscoveryNodeRegistration(colivingInstance)
        await this.configureReporter()

        // Fork extra web server workers
        // note - we can't have more than 1 worker at the moment because DATA and ETH relays
        // use in memory wallet locks
        for (let i = 0; i < config.get('clusterForkProcessCount'); i++) {
          cluster.fork({ 'WORKER_TYPE': 'web_server' })
        }

        cluster.on('exit', (worker, code, signal) => {
          logger.info(`Cluster: Worker ${worker.process.pid} died, forking another worker`)
          cluster.fork(worker.process.env)
        })
      } else {
        // if it's a test run only start the server
        await new Promise(resolve => {
          server = this.express.listen(this.port, resolve)
        })
        server.setTimeout(config.get('setTimeout'))
        server.timeout = config.get('timeout')
        server.keepAliveTimeout = config.get('keepAliveTimeout')
        server.headersTimeout = config.get('headersTimeout')

        this.express.set('redis', this.redisClient)

        logger.info(`Listening on port ${this.port}...`)
      }

      try {
        await txRelay.fundRelayerIfEmpty()
      } catch (e) {
        logger.error(`Failed to fund relayer - ${e}`)
      }

      try {
        await ethTxRelay.fundEthRelayerIfEmpty()
      } catch (e) {
        logger.error(`Failed to fund L1 relayer - ${e}`)
      }

      return { app: this.express, server }
    } else {
      // if it's not the master worker in the cluster
      const colivingInstance = await this.configureColivingInstance()
      await this.configureReporter()

      if (process.env['WORKER_TYPE'] === 'notifications') {
        await this.notificationProcessor.init(
          colivingInstance,
          this.express,
          this.redisClient
        )
      } else {
        await new Promise(resolve => {
          server = this.express.listen(this.port, resolve)
        })
        server.setTimeout(config.get('setTimeout'))
        server.timeout = config.get('timeout')
        server.keepAliveTimeout = config.get('keepAliveTimeout')
        server.headersTimeout = config.get('headersTimeout')

        this.express.set('redis', this.redisClient)

        logger.info(`Listening on port ${this.port}...`)
        return { app: this.express, server }
      }
    }
  }

  configureMailgun () {
    // Configure mailgun instance
    let mg = null
    if (config.get('mailgunApiKey')) {
      mg = mailgun({ apiKey: config.get('mailgunApiKey'), domain: DOMAIN })
    }
    this.express.set('mailgun', mg)
  }

  configureSentry () {
    const dsn = config.get('sentryDSN')
    if (dsn) {
      Sentry.init({
        dsn
      })
    }
  }

  configureOptimizely () {
    const sdkKey = config.get('optimizelySdkKey')
    const optimizelyClientInstance = optimizelySDK.createInstance({
      sdkKey,
      datafileOptions: {
        autoUpdate: true,
        updateInterval: 5000 // Poll for updates every 5s
      }
    })

    this.optimizelyPromise = new Promise(resolve => {
      optimizelyClientInstance.onReady().then(() => {
        this.express.set('optimizelyClient', optimizelyClientInstance)

        resolve()
      })
    })
    return optimizelyClientInstance
  }

  configureReporter () {
    const slackWormholeErrorReporter = new SlackReporter({
      slackUrl: config.get('errorWormholeReporterSlackUrl'),
      childLogger: logger
    })
    this.express.set('slackWormholeErrorReporter', slackWormholeErrorReporter)
  }

  async configureDiscoveryNodeRegistration (libs) {
    const childLogger = logger.child({ 'service': 'Discovery Node Registration' })
    await startRegistrationQueue(libs, childLogger)
  }

  async configureColivingInstance () {
    await colivingLibsWrapper.init()
    const colivingInstance = colivingLibsWrapper.getColivingLibs()
    this.express.set('colivingLibs', colivingInstance)
    return colivingInstance
  }

  async configureRewardsAttester (libs) {
    // Await for optimizely config so we know
    // whether rewards attestation is enabled,
    // returning early if false
    await this.optimizelyPromise
    const isEnabled = getFeatureFlag(this.optimizelyClientInstance, FEATURE_FLAGS.REWARDS_ATTESTATION_ENABLED)
    if (!isEnabled) {
      logger.info('Attestation disabled!')
      return
    }

    const attester = await setupRewardsAttester(libs, this.optimizelyClientInstance, this.redisClient)
    this.express.set('rewardsAttester', attester)
    return attester
  }

  async runMigrations () {
    logger.info('Executing database migrations...')
    try {
      await runMigrations()
    } catch (err) {
      logger.error('Error in migrations: ', err)
      process.exit(1)
    }
  }

  expressSettings () {
    // https://expressjs.com/en/guide/behind-proxies.html
    this.express.set('trust proxy', true)
  }

  setMiddleware () {
    this.express.use(loggingMiddleware)
    this.express.use(bodyParser.json({ limit: '1mb' }))
    this.express.use(cookieParser())
    this.express.use(cors())
  }

  // Create rate limits for listens on a per digital_content per user basis and per digital_content per ip basis
  _createRateLimitsForListenCounts (interval, timeInSeconds) {
    const listenCountLimiter = getRateLimiter({
      prefix: `listenCountLimiter:::${interval}-digital-content:::`,
      expiry: timeInSeconds,
      max: config.get(`rateLimitingListensPerAgreementPer${interval}`), // max requests per interval
      skip: function (req) {
        const { ip, senderIP } = getIP(req)
        const ipToCheck = senderIP || ip
        // Do not apply user-specific rate limits for any whitelisted IP
        return isIPWhitelisted(ipToCheck, req)
      },
      keyGenerator: function (req) {
        const agreementId = req.params.id
        const userId = req.body.userId
        return `${agreementId}:::${userId}`
      }
    })

    const listenCountIPAgreementLimiter = getRateLimiter({
      prefix: `listenCountLimiter:::${interval}-ip-digital-content:::`,
      expiry: timeInSeconds,
      max: config.get(`rateLimitingListensPerIPAgreementPer${interval}`), // max requests per interval
      keyGenerator: function (req) {
        const agreementId = req.params.id
        const { ip } = getIP(req)
        return `${ip}:::${agreementId}`
      }
    })

    // Create a rate limiter for listens  based on IP
    const listenCountIPRequestLimiter = getRateLimiter({
      prefix: `listenCountLimiter:::${interval}-ip-exclusive:::`,
      expiry: interval,
      max: config.get(`rateLimitingListensPerIPPer${interval}`), // max requests per interval
      keyGenerator: function (req) {
        const { ip } = getIP(req)
        return `${ip}`
      }
    })

    return [listenCountLimiter, listenCountIPAgreementLimiter, listenCountIPRequestLimiter]
  }

  setRateLimiters () {
    const requestRateLimiter = getRateLimiter({ prefix: 'reqLimiter', max: config.get('rateLimitingReqLimit') })
    this.express.use(requestRateLimiter)

    const authRequestRateLimiter = getRateLimiter({ prefix: 'authLimiter', max: config.get('rateLimitingAuthLimit') })
    // This limiter double dips with the reqLimiter. The 5 requests every hour are also counted here
    this.express.use('/authentication/', authRequestRateLimiter)

    const twitterRequestRateLimiter = getRateLimiter({ prefix: 'twitterLimiter', max: config.get('rateLimitingTwitterLimit') })
    // This limiter double dips with the reqLimiter. The 5 requests every hour are also counted here
    this.express.use('/twitter/', twitterRequestRateLimiter)

    const tikTokRequestRateLimiter = getRateLimiter({ prefix: 'tikTokLimiter', max: config.get('rateLimitingTikTokLimit') })
    // This limiter double dips with the reqLimiter. The 5 requests every hour are also counted here
    this.express.use('/tiktok/', tikTokRequestRateLimiter)

    const ONE_HOUR_IN_SECONDS = 60 * 60
    const [listenCountHourlyLimiter, listenCountHourlyIPAgreementLimiter] = this._createRateLimitsForListenCounts('Hour', ONE_HOUR_IN_SECONDS)
    const [listenCountDailyLimiter, listenCountDailyIPAgreementLimiter, listenCountDailyIPLimiter] = this._createRateLimitsForListenCounts('Day', ONE_HOUR_IN_SECONDS * 24)
    const [listenCountWeeklyLimiter, listenCountWeeklyIPAgreementLimiter] = this._createRateLimitsForListenCounts('Week', ONE_HOUR_IN_SECONDS * 24 * 7)

    // This limiter double dips with the reqLimiter. The 5 requests every hour are also counted here
    this.express.use(
      '/agreements/:id/listen',
      listenCountWeeklyIPAgreementLimiter,
      listenCountWeeklyLimiter,
      listenCountDailyIPAgreementLimiter,
      listenCountDailyLimiter,
      listenCountHourlyIPAgreementLimiter,
      listenCountHourlyLimiter,
      listenCountDailyIPLimiter
    )

    // Eth relay rate limits
    // Default to 50 per ip per day and one of 10 per wallet per day
    const ethRelayIPRateLimiter = getRateLimiter({
      prefix: 'ethRelayIPRateLimiter',
      expiry: ONE_HOUR_IN_SECONDS * 24,
      max: config.get('rateLimitingEthRelaysPerIPPerDay'),
      skip: function (req) {
        return isIPWhitelisted(req.ip, req)
      }
    })
    const ethRelayWalletRateLimiter = getRateLimiter({
      prefix: `ethRelayWalletRateLimiter`,
      expiry: ONE_HOUR_IN_SECONDS * 24,
      max: config.get('rateLimitingEthRelaysPerWalletPerDay'),
      skip: function (req) {
        return isIPWhitelisted(req.ip, req)
      },
      keyGenerator: function (req) {
        return req.body.senderAddress
      }
    })

    this.express.use(
      '/eth_relay',
      ethRelayWalletRateLimiter,
      ethRelayIPRateLimiter
    )
    this.express.use(getRateLimiterMiddleware())
  }

  setRoutes () {
    // import routes
    require('./routes')(this.express)
  }

  setErrorHandler () {
    function errorHandler (err, req, res, next) {
      req.logger.error('Internal server error')
      req.logger.error(err.stack)
      Sentry.captureException(err)
      sendResponse(req, res, errorResponseServerError('Internal server error'))
    }
    this.express.use(errorHandler)
  }

  async getColivingAnnouncements () {
    try {
      let { announcements, announcementMap } = await fetchAnnouncements()
      this.express.set('announcements', announcements)
      this.express.set('announcementMap', announcementMap)
    } catch (err) {
      const colivingNotificationUrl = config.get('colivingNotificationUrl')
      logger.error(`Error, unable to get coliving announcements from ${colivingNotificationUrl} \n [Err]:`, err)
    }
  }
}

module.exports = App
