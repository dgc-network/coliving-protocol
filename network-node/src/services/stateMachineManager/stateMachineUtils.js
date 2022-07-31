const BullQueue = require('bull')

const { libs } = require('@coliving/sdk')
const CreatorNode = libs.CreatorNode
const axios = require('axios')
const retry = require('async-retry')

const {
  METRIC_RECORD_TYPE,
  METRIC_NAMES,
  METRIC_LABELS
} = require('../prometheusMonitoring/prometheus.constants')
const config = require('../../config')
const { logger, createChildLogger } = require('../../logging')
const { generateTimestampAndSignature } = require('../../apiSigning')
const {
  BATCH_CLOCK_STATUS_REQUEST_TIMEOUT,
  CLOCK_STATUS_REQUEST_TIMEOUT_MS,
  MAX_USER_BATCH_CLOCK_FETCH_RETRIES
} = require('./stateMachineConstants')

const MAX_BATCH_CLOCK_STATUS_BATCH_SIZE = config.get(
  'maxBatchClockStatusBatchSize'
)
const DELEGATE_PRIVATE_KEY = config.get('delegatePrivateKey')

/**
 * Given map(replica set node => userWallets[]), retrieves user info for every (node, userWallet) pair
 * Also updates unhealthyPeers param with nodes that were unhealthy when queried
 *
 * @param {Object} replicaSetNodesToUserWalletsMap map of <replica set node : wallets>
 *
 * @returns {Object} response
 * @returns {Object} response.replicaToAllUserInfoMaps map(replica => map(wallet => { clock, filesHash }))
 * @returns {Set} response.unhealthyPeers unhealthy peer endpoints
 */
const retrieveUserInfoFromReplicaSet = async (replicaToWalletMap) => {
  const replicaToAllUserInfoMaps = {}
  const unhealthyPeers = new Set()

  const spID = config.get('spID')

  /** In parallel for every replica, fetch clock status for all users on that replica */
  const replicas = Object.keys(replicaToWalletMap)
  await Promise.all(
    replicas.map(async (replica) => {
      replicaToAllUserInfoMaps[replica] = {}

      const walletsOnReplica = replicaToWalletMap[replica]

      // Make requests in batches, sequentially, since this is an expensive query
      for (
        let i = 0;
        i < walletsOnReplica.length;
        i += MAX_BATCH_CLOCK_STATUS_BATCH_SIZE
      ) {
        const walletsOnReplicaSlice = walletsOnReplica.slice(
          i,
          i + MAX_BATCH_CLOCK_STATUS_BATCH_SIZE
        )

        const axiosReqParams = {
          baseURL: replica,
          url: '/users/batch_clock_status?returnFilesHash=true',
          method: 'post',
          data: { walletPublicKeys: walletsOnReplicaSlice },
          timeout: BATCH_CLOCK_STATUS_REQUEST_TIMEOUT
        }

        // Generate and attach SP signature to bypass route rate limits
        const { timestamp, signature } = generateTimestampAndSignature(
          { spID: spID },
          DELEGATE_PRIVATE_KEY
        )
        axiosReqParams.params = { spID: spID, timestamp, signature }

        let batchClockStatusResp = []
        let errorMsg
        try {
          batchClockStatusResp = (
            await retry(async () => axios(axiosReqParams), {
              retries: MAX_USER_BATCH_CLOCK_FETCH_RETRIES
            })
          ).data.data.users
        } catch (e) {
          errorMsg = e
        }

        // If failed to get response after all attempts, add replica to `unhealthyPeers` list for reconfig
        if (errorMsg) {
          logger.error(
            `[retrieveUserInfoFromReplicaSet] Could not fetch clock values from replica ${replica}: ${errorMsg.toString()}`
          )
          unhealthyPeers.add(replica)
        }

        // Add response data to output aggregate map
        batchClockStatusResp.forEach((clockStatusResp) => {
          /**
           * @notice `filesHash` will be null if node has no files for user. This can happen even if clock > 0 if user has ColivingUser or Track table records without any File table records
           */
          const { walletPublicKey, clock, filesHash } = clockStatusResp
          replicaToAllUserInfoMaps[replica][walletPublicKey] = {
            clock,
            filesHash
          }
        })
      }
    })
  )

  return {
    replicaToAllUserInfoMaps,
    unhealthyPeers
  }
}

/**
 * Make request to given replica to get its clock value for given user
 * Signs request with spID to bypass rate limits
 */
const retrieveClockValueForUserFromReplica = async (replica, wallet) => {
  const spID = config.get('spID')

  const { timestamp, signature } = generateTimestampAndSignature(
    { spID },
    DELEGATE_PRIVATE_KEY
  )

  const clockValue = await CreatorNode.getClockValue(
    replica,
    wallet,
    CLOCK_STATUS_REQUEST_TIMEOUT_MS,
    {
      spID,
      timestamp,
      signature
    }
  )

  return clockValue
}

/**
 * Returns an object that can be returned from any state machine job to record a histogram metric being observed.
 * Example: to call responseTimeHistogram.observe({ code: '200' }, 1000), you would call this function with:
 * makeHistogramToRecord('response_time', 1000, { code: '200' })
 * @param {string} metricName the name of the metric from prometheus.constants
 * @param {number} metricValue the value to observe
 * @param {string} [metricLabels] the optional mapping of metric label name => metric label value
 */
const makeHistogramToRecord = (metricName, metricValue, metricLabels = {}) => {
  return makeMetricToRecord(
    METRIC_RECORD_TYPE.HISTOGRAM_OBSERVE,
    metricName,
    metricValue,
    metricLabels
  )
}

/**
 * Returns an object that can be returned from any state machine job to record an increase in a gauge metric.
 * Example: to call testGuage.inc({ status: 'success' }, 1), you would call this function with:
 * makeGaugeIncToRecord('test_gauge', 1, { status: 'success' })
 * @param {string} metricName the name of the metric from prometheus.constants
 * @param {number} incBy the metric value to increment by in Metric#inc for the prometheus gauge
 * @param {string} [metricLabels] the optional mapping of metric label name => metric label value
 */
const makeGaugeIncToRecord = (metricName, incBy, metricLabels = {}) => {
  return makeMetricToRecord(
    METRIC_RECORD_TYPE.GAUGE_INC,
    metricName,
    incBy,
    metricLabels
  )
}

/**
 * Returns an object that can be returned from any state machine job to record a change in a metric.
 * Validates the params to make sure the metric is valid.
 * @param {string} metricType the type of metric being recorded -- HISTOGRAM or GAUGE_INC
 * @param {string} metricName the name of the metric from prometheus.constants
 * @param {number} metricValue the value to observe
 * @param {string} [metricLabels] the optional mapping of metric label name => metric label value
 */
const makeMetricToRecord = (
  metricType,
  metricName,
  metricValue,
  metricLabels = {}
) => {
  if (!Object.values(METRIC_RECORD_TYPE).includes(metricType)) {
    throw new Error(
      `Invalid metricType. metricType=${metricType} metricName=${metricName} metricValue=${metricValue} metricLabels=${JSON.stringify(
        metricLabels
      )}`
    )
  }
  if (!Object.values(METRIC_NAMES).includes(metricName)) {
    throw new Error(
      `Invalid metricName. metricType=${metricType} metricName=${metricName} metricValue=${metricValue} metricLabels=${JSON.stringify(
        metricLabels
      )}`
    )
  }
  if (typeof metricValue !== 'number') {
    throw new Error(
      `Invalid non-numerical metricValue. metricType=${metricType} metricName=${metricName} metricValue=${metricValue} metricLabels=${JSON.stringify(
        metricLabels
      )}`
    )
  }
  const labelNames = Object.keys(METRIC_LABELS[metricName])
  for (const [labelName, labelValue] of Object.entries(metricLabels)) {
    if (!labelNames?.includes(labelName)) {
      throw new Error(
        `Metric label has invalid name: '${labelName}'. metricType=${metricType} metricName=${metricName} metricValue=${metricValue} metricLabels=${JSON.stringify(
          metricLabels
        )}`
      )
    }
    const labelValues = METRIC_LABELS[metricName][labelName]
    if (!labelValues?.includes(labelValue) && labelValues?.length !== 0) {
      throw new Error(
        `Metric label has invalid value: '${labelValue}'. metricType=${metricType} metricName=${metricName} metricValue=${metricValue} metricLabels=${JSON.stringify(
          metricLabels
        )}`
      )
    }
  }

  const metric = {
    metricName,
    metricType,
    metricValue,
    metricLabels
  }
  return metric
}

const makeQueue = ({
  name,
  removeOnComplete,
  removeOnFail,
  lockDuration,
  limiter = null
}) => {
  // Settings config from https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#advanced-settings
  return new BullQueue(name, {
    redis: {
      host: config.get('redisHost'),
      port: config.get('redisPort')
    },
    defaultJobOptions: {
      removeOnComplete,
      removeOnFail
    },
    settings: {
      // Should be sufficiently larger than expected job runtime
      lockDuration,
      // We never want to re-process stalled jobs
      maxStalledCount: 0
    },
    limiter
  })
}

const registerQueueEvents = (queue, queueLogger) => {
  queue.on('global:waiting', (jobId) => {
    const logger = createChildLogger(queueLogger, { jobId })
    logger.info('Job waiting')
  })
  queue.on('global:active', (jobId, jobPromise) => {
    const logger = createChildLogger(queueLogger, { jobId })
    logger.info('Job active')
  })
  queue.on('global:lock-extension-failed', (jobId, err) => {
    const logger = createChildLogger(queueLogger, { jobId })
    logger.error(`Job lock extension failed. Error: ${err}`)
  })
  queue.on('global:stalled', (jobId) => {
    const logger = createChildLogger(queueLogger, { jobId })
    logger.error('Job stalled')
  })
  queue.on('global:error', (error) => {
    queueLogger.error(`Queue Job Error - ${error}`)
  })
}

module.exports = {
  retrieveClockValueForUserFromReplica,
  makeHistogramToRecord,
  makeGaugeIncToRecord,
  retrieveUserInfoFromReplicaSet,
  makeQueue,
  registerQueueEvents
}
