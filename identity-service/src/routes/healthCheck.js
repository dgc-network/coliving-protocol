const config = require('../config.js')
const models = require('../models')
const { handleResponse, successResponse, errorResponseServerError } = require('../apiHelpers')
const { sequelize } = require('../models')
const { getRelayerFunds, fundRelayerIfEmpty } = require('../relay/txRelay')
const { getEthRelayerFunds } = require('../relay/ethTxRelay')
const solanaWeb3 = require('@solana/web3.js')
const Web3 = require('web3')
const colivingLibsWrapper = require('../colivingLibsInstance')
const {
  NOTIFICATION_JOB_LAST_SUCCESS_KEY,
  NOTIFICATION_EMAILS_JOB_LAST_SUCCESS_KEY,
  NOTIFICATION_ANNOUNCEMENTS_JOB_LAST_SUCCESS_KEY
} = require('../notifications/index.js')

const axios = require('axios')
const moment = require('moment')
const { REDIS_ATTESTER_STATE } = require('../utils/configureAttester.js')

// Defaults used in relay health check endpoint
const RELAY_HEALTH_TEN_MINS_AGO_BLOCKS = 120 // 1 block/5sec = 120 blocks/10 minutes
const RELAY_HEALTH_MAX_TRANSACTIONS = 100 // max transactions to look into
const RELAY_HEALTH_MAX_ERRORS = 5 // max acceptable errors for a 200 response
const RELAY_HEALTH_MAX_BLOCK_RANGE = 360 // max block range allowed from query params
const RELAY_HEALTH_MIN_TRANSACTIONS = 5 // min number of tx's that must have happened within block diff
const RELAY_HEALTH_ACCOUNTS = new Set(config.get('relayerWallets').map(wallet => wallet.publicKey))
const ETH_RELAY_HEALTH_ACCOUNTS = new Set(config.get('ethRelayerWallets').map(wallet => wallet.publicKey))

// flatten one level of nexted arrays
const flatten = (arr) => arr.reduce((acc, val) => acc.concat(val), [])

module.exports = function (app) {
  /**
   * Relay health check endpoint. Takes the query params startBlock, endBlock, maxTransactions, and maxErrors.
   * If those query params are not specified, use default values.
   */
  /*
  There are a few scenarios where a health check should return unhealthy
  1. Some number of relays are failing for some number of users
     To solve this, traverse the blocks for Coliving transactions and count failures
     for users. If it's greater than some threshold, return error
  2. Relays are not being sent / sent but not acknowledged by blockchain
  */
  app.get('/health_check/relay', handleResponse(async (req, res) => {
    const start = Date.now()
    const colivingLibsInstance = req.app.get('colivingLibs')
    const redis = req.app.get('redis')
    const web3 = colivingLibsInstance.web3Manager.getWeb3()

    let endBlockNumber = parseInt((await web3.eth.getBlockNumber()), 10)
    let blockDiff = parseInt(req.query.blockDiff, 10) || RELAY_HEALTH_TEN_MINS_AGO_BLOCKS
    let maxTransactions = parseInt(req.query.maxTransactions, 10) || RELAY_HEALTH_MAX_TRANSACTIONS
    let maxErrors = parseInt(req.query.maxErrors, 10) || RELAY_HEALTH_MAX_ERRORS
    let minTransactions = parseInt(req.query.minTransactions) || RELAY_HEALTH_MIN_TRANSACTIONS
    let isVerbose = req.query.verbose || false

    // In the case that endBlockNumber - blockDiff goes negative, default startBlockNumber to 0
    let startBlockNumber = Math.max(endBlockNumber - blockDiff, 0)

    // If query params are invalid, throw server error
    if (
      isNaN(startBlockNumber) ||
      isNaN(endBlockNumber) ||
      startBlockNumber < 0 ||
      endBlockNumber < 0 ||
      endBlockNumber < startBlockNumber
    ) {
      return errorResponseServerError(`Invalid start and/or end block. startBlock: ${startBlockNumber}, endBlock: ${endBlockNumber}`)
    }

    if (endBlockNumber - startBlockNumber > RELAY_HEALTH_MAX_BLOCK_RANGE) {
      return errorResponseServerError(`Block difference is over ${RELAY_HEALTH_MAX_BLOCK_RANGE}. startBlock: ${startBlockNumber}, endBlock: ${endBlockNumber}`)
    }

    if (
      isNaN(maxTransactions) ||
      isNaN(maxErrors) ||
      maxTransactions < 0 ||
      maxErrors < 0
    ) {
      return errorResponseServerError(`Invalid number of transactions and/or errors. maxTransactions: ${maxTransactions}, maxErrors: ${maxErrors}`)
    }

    let failureTxs = {} // senderAddress: [<txHash>]
    let txCounter = 0
    let minBlockTime = null
    let maxBlockTime = null

    req.logger.info(
      `Searching for transactions to/from relay accounts within blocks ${startBlockNumber} and ${endBlockNumber}`
    )

    // Iterate through the range of blocks, looking into the max number of transactions that are from coliving
    for (let i = endBlockNumber; i > startBlockNumber; i--) {
      // If the max number of transactions have been evaluated, break out
      if (txCounter > maxTransactions) break
      let block = await web3.eth.getBlock(i, true)
      if (!block) {
        req.logger.error(`Could not find block for health_check/relay ${i}`)
        continue
      }
      if (!minBlockTime || block.timestamp < minBlockTime) minBlockTime = block.timestamp
      if (!maxBlockTime || block.timestamp > maxBlockTime) maxBlockTime = block.timestamp
      if (block.transactions.length) {
        for (const tx of block.transactions) {
          // If transaction is from coliving account, determine success or fail status
          if (RELAY_HEALTH_ACCOUNTS.has(tx.from)) {
            const txHash = tx.hash
            const resp = await web3.eth.getTransactionReceipt(txHash)
            txCounter++

            // tx failed
            if (!resp.status) {
              const senderAddress = await redis.hget('txHashToSenderAddress', txHash)
              if (senderAddress) {
                if (!failureTxs[senderAddress]) failureTxs[senderAddress] = [txHash]
                else failureTxs[senderAddress].push(txHash)
              } else {
                failureTxs['unknown'] = (failureTxs['unknown'] || []).concat(txHash)
              }
            }
          }
        }
      }
    }

    let isError = false

    // delete old entries from set in redis
    const epochOneHourAgo = Math.floor(Date.now() / 1000) - 3600
    await redis.zremrangebyscore('relayTxAttempts', '-inf', epochOneHourAgo)
    await redis.zremrangebyscore('relayTxFailures', '-inf', epochOneHourAgo)
    await redis.zremrangebyscore('relayTxSuccesses', '-inf', epochOneHourAgo)

    // check if there have been any attempts in the time window that we processed the block health check
    const attemptedTxsInRedis = await redis.zrangebyscore('relayTxAttempts', minBlockTime, maxBlockTime)
    const successfulTxsInRedis = await redis.zrangebyscore('relayTxSuccesses', minBlockTime, maxBlockTime)
    const failureTxsInRedis = await redis.zrangebyscore('relayTxFailures', minBlockTime, maxBlockTime)
    if (txCounter < minTransactions) isError = true

    const serverResponse = {
      blockchain: {
        numberOfTransactions: txCounter,
        minTransactions,
        numberOfFailedTransactions: flatten(Object.values(failureTxs)).length,
        failedTransactionHashes: failureTxs,
        startBlock: startBlockNumber,
        endBlock: endBlockNumber
      },
      redis: {
        attemptedTxsCount: attemptedTxsInRedis.length,
        successfulTxsCount: successfulTxsInRedis.length,
        failureTxsCount: failureTxsInRedis.length
      },
      healthCheckComputeTime: Date.now() - start
    }

    if (isVerbose) {
      serverResponse.redis = {
        ...serverResponse.redis,
        attemptedTxsInRedis,
        successfulTxsInRedis,
        failureTxsInRedis
      }
    }

    if (isError) return errorResponseServerError(serverResponse)
    else return successResponse(serverResponse)
  }))

  app.get('/health_check', handleResponse(async (req, res) => {
    // for now we just check db connectivity
    await sequelize.query('SELECT 1', { type: sequelize.QueryTypes.SELECT })

    // get connected discprov via libs
    const colivingLibsInstance = req.app.get('colivingLibs')
    return successResponse({ 'healthy': true, 'git': process.env.GIT_SHA, selectedDiscoveryProvider: colivingLibsInstance.discoveryProvider.discoveryProviderEndpoint })
  }))

  app.get('/balance_check', handleResponse(async (req, res) => {
    let { minimumBalance, minimumRelayerBalance } = req.query
    minimumBalance = parseFloat(minimumBalance || config.get('minimumBalance'))
    minimumRelayerBalance = parseFloat(minimumRelayerBalance || config.get('minimumRelayerBalance'))
    let belowMinimumBalances = []
    let balances = []

    // run fundRelayerIfEmpty so it'll auto top off any accounts below the threshold
    try {
      await fundRelayerIfEmpty()
    } catch (err) {
      req.logger.error(`Failed to fund relayer with error: ${err}`)
    }

    balances = await Promise.all(
      [...RELAY_HEALTH_ACCOUNTS].map(async account => {
        let balance = parseFloat(Web3.utils.fromWei(await getRelayerFunds(account), 'ether'))
        if (balance < minimumBalance) {
          belowMinimumBalances.push({ account, balance })
        }
        return { account, balance }
      })
    )

    const relayerPublicKey = config.get('relayerPublicKey')
    const relayerBalance = parseFloat(Web3.utils.fromWei(await getRelayerFunds(relayerPublicKey), 'ether'))
    const relayerAboveMinimum = relayerBalance >= minimumRelayerBalance

    // no accounts below minimum balance
    if (!belowMinimumBalances.length && relayerAboveMinimum) {
      return successResponse({
        'above_balance_minimum': true,
        'minimum_balance': minimumBalance,
        'balances': balances,
        'relayer': {
          'wallet': relayerPublicKey,
          'balance': relayerBalance,
          'above_balance_minimum': relayerAboveMinimum
        }
      })
    } else {
      return errorResponseServerError({
        'above_balance_minimum': false,
        'minimum_balance': minimumBalance,
        'balances': balances,
        'below_minimum_balance': belowMinimumBalances,
        'relayer': {
          'wallet': relayerPublicKey,
          'balance': relayerBalance,
          'above_balance_minimum': relayerAboveMinimum
        }
      })
    }
  }))

  app.get('/eth_balance_check', handleResponse(async (req, res) => {
    let { minimumBalance, minimumFunderBalance } = req.query
    minimumBalance = parseFloat(minimumBalance || config.get('ethMinimumBalance'))
    minimumFunderBalance = parseFloat(minimumFunderBalance || config.get('ethMinimumFunderBalance'))
    let funderAddress = config.get('ethFunderAddress')
    let funderBalance = parseFloat(Web3.utils.fromWei(await getEthRelayerFunds(funderAddress), 'ether'))
    let funderAboveMinimum = funderBalance >= minimumFunderBalance
    let belowMinimumBalances = []

    const balances = await Promise.all(
      [...ETH_RELAY_HEALTH_ACCOUNTS].map(async account => {
        let balance = parseFloat(Web3.utils.fromWei(await getEthRelayerFunds(account), 'ether'))
        if (balance < minimumBalance) {
          belowMinimumBalances.push({ account, balance })
        }
        return { account, balance }
      })
    )

    let balanceResponse = {
      'minimum_balance': minimumBalance,
      'balances': balances,
      'funder': {
        'wallet': funderAddress,
        'balance': funderBalance,
        'above_balance_minimum': funderAboveMinimum
      }
    }

    // no accounts below minimum balance
    if (!belowMinimumBalances.length && funderAboveMinimum) {
      return successResponse({
        'above_balance_minimum': true,
        ...balanceResponse
      })
    } else {
      return errorResponseServerError({
        'above_balance_minimum': false,
        'below_minimum_balance': belowMinimumBalances,
        ...balanceResponse
      })
    }
  }))

  app.get('/sol_balance_check', handleResponse(async (req, res) => {
    const minimumBalance = parseFloat(req.query.minimumBalance || config.get('solMinimumBalance'))
    const solanaFeePayerWallets = config.get('solanaFeePayerWallets')
    const libs = req.app.get('colivingLibs')
    const connection = libs.solanaWeb3Manager.connection

    let solanaFeePayerBalances = {}
    let belowMinimumBalances = []

    if (solanaFeePayerWallets) {
      await Promise.all([...solanaFeePayerWallets].map(async wallet => {
        const feePayerPubKey = solanaWeb3.Keypair.fromSecretKey(Uint8Array.from(wallet.privateKey)).publicKey
        const feePayerBase58 = feePayerPubKey.toBase58()
        const balance = await connection.getBalance(feePayerPubKey)
        if (balance < minimumBalance) {
          belowMinimumBalances.push({ wallet: feePayerBase58, balance })
        }
        solanaFeePayerBalances[feePayerBase58] = balance
        return { wallet: feePayerBase58, balance }
      }))
    }

    const solanaFeePayerBalancesArr = Object.keys(solanaFeePayerBalances).map(key => [key, solanaFeePayerBalances[key]])

    if (belowMinimumBalances.length === 0) {
      return successResponse({
        above_balance_minimum: true,
        minimum_balance: minimumBalance,
        balances: solanaFeePayerBalancesArr
      })
    }

    return errorResponseServerError({
      above_balance_minimum: false,
      minimum_balance: minimumBalance,
      belowMinimumBalances,
      balances: solanaFeePayerBalancesArr
    })
  }))

  app.get('/notification_check', handleResponse(async (req, res) => {
    let { maxBlockDifference, maxDrift } = req.query
    maxBlockDifference = maxBlockDifference || 100

    let highestBlockNumber = await models.NotificationAction.max('blocknumber')
    if (!highestBlockNumber) {
      highestBlockNumber = config.get('notificationStartBlock')
    }
    let redis = req.app.get('redis')
    let maxFromRedis = await redis.get('maxBlockNumber')
    if (maxFromRedis) {
      highestBlockNumber = parseInt(maxFromRedis)
    }

    // Get job success timestamps
    const notificationJobLastSuccess = await redis.get(NOTIFICATION_JOB_LAST_SUCCESS_KEY)
    const notificationEmailsJobLastSuccess = await redis.get(NOTIFICATION_EMAILS_JOB_LAST_SUCCESS_KEY)
    const notificationAnnouncementsJobLastSuccess = await redis.get(NOTIFICATION_ANNOUNCEMENTS_JOB_LAST_SUCCESS_KEY)

    const { discoveryProvider } = colivingLibsWrapper.getColivingLibs()

    let body = (await axios({
      method: 'get',
      url: `${discoveryProvider.discoveryProviderEndpoint}/health_check`
    })).data
    let discProvDbHighestBlock = body.data['db']['number']
    let notifBlockDiff = discProvDbHighestBlock - highestBlockNumber
    let resp = {
      'discProv': body.data,
      'identity': highestBlockNumber,
      'notifBlockDiff': notifBlockDiff,
      notificationJobLastSuccess,
      notificationEmailsJobLastSuccess,
      notificationAnnouncementsJobLastSuccess
    }

    // Test if last runs were recent enough
    let withinBounds = true
    if (maxDrift) {
      const cutoff = moment().subtract(maxDrift, 'seconds')
      const isWithinBounds = (key) => key ? moment(key).isAfter(cutoff) : true
      withinBounds = (
        isWithinBounds(notificationJobLastSuccess) &&
        isWithinBounds(notificationEmailsJobLastSuccess) &&
        isWithinBounds(notificationAnnouncementsJobLastSuccess)
      )
    }
    if (!withinBounds || notifBlockDiff > maxBlockDifference) {
      return errorResponseServerError(resp)
    }

    return successResponse(resp)
  }))

  /**
   * Exposes current and max db connection stats.
   * Returns error if db connection threshold exceeded, else success.
   */
  app.get('/db_check', handleResponse(async (req, res) => {
    const verbose = (req.query.verbose === 'true')
    const maxConnections = config.get('pgConnectionPoolMax')

    let numConnections = 0
    let connectionInfo = null
    let activeConnections = null
    let idleConnections = null

    // Get number of open DB connections
    const numConnectionsQuery = await sequelize.query("SELECT numbackends from pg_stat_database where datname = 'coliving_centralized_service'")
    if (numConnectionsQuery && numConnectionsQuery[0] && numConnectionsQuery[0][0] && numConnectionsQuery[0][0].numbackends) {
      numConnections = numConnectionsQuery[0][0].numbackends
    }

    // Get detailed connection info
    const connectionInfoQuery = (await sequelize.query("select wait_event_type, wait_event, state, query from pg_stat_activity where datname = 'coliving_centralized_service'"))
    if (connectionInfoQuery && connectionInfoQuery[0]) {
      connectionInfo = connectionInfoQuery[0]
      activeConnections = (connectionInfo.filter(conn => conn.state === 'active')).length
      idleConnections = (connectionInfo.filter(conn => conn.state === 'idle')).length
    }

    const resp = {
      'git': process.env.GIT_SHA,
      connectionStatus: {
        total: numConnections,
        active: activeConnections,
        idle: idleConnections
      },
      maxConnections
    }

    if (verbose) { resp.connectionInfo = connectionInfo }

    return (numConnections >= maxConnections) ? errorResponseServerError(resp) : successResponse(resp)
  }))

  /**
   * Healthcheck the rewards attester
   * Accepts optional query params `maxDrift` and `maxSuccessDrift`, which
   * correspond to the last seen attempted challenge attestation, and the last sucessful
   * attestation, respectively.
   */
  app.get('/rewards_check', handleResponse(async (req, res) => {
    const { maxDrift, maxSuccessDrift, maxActionDrift } = req.query
    const redis = req.app.get('redis')
    let state = await redis.get(REDIS_ATTESTER_STATE)
    if (!state) {
      return errorResponseServerError('No last state')
    }
    state = JSON.parse(state)

    const { lastChallengeTime, lastSuccessChallengeTime, phase, lastActionTime } = state
    const lastChallengeDelta = lastChallengeTime ? (Date.now() - lastChallengeTime) / 1000 : Number.POSITIVE_INFINITY
    const lastSuccessChallengeDelta = lastSuccessChallengeTime ? (Date.now() - lastSuccessChallengeTime) / 1000 : Number.POSITIVE_INFINITY
    const lastActionDelta = lastActionTime ? (Date.now() - lastActionTime) / 1000 : Number.POSITIVE_INFINITY

    // Only use the deltas if the corresponding drift parameter exists
    const healthyMaxDrift = !maxDrift || lastChallengeDelta < maxDrift
    const healthySuccessDrift = !maxSuccessDrift || lastSuccessChallengeDelta < maxSuccessDrift
    const healthyActionDrift = !maxActionDrift || lastActionDelta < maxActionDrift

    const isHealthy = healthyMaxDrift && healthySuccessDrift && healthyActionDrift

    const resp = { phase, lastChallengeDelta, lastSuccessChallengeDelta, lastActionDelta }
    return (isHealthy ? successResponse : errorResponseServerError)(resp)
  }))
}
