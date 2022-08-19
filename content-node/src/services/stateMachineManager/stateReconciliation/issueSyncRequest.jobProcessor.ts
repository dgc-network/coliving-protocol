import type Logger from 'bunyan'
import type { LoDashStatic } from 'lodash'
import type {
  DecoratedJobParams,
  DecoratedJobReturnValue,
  JobsToEnqueue
} from '../types'
import type {
  IssueSyncRequestJobParams,
  IssueSyncRequestJobReturnValue,
  SyncRequestAxiosParams
} from './types'

const axios = require('axios')
const _: LoDashStatic = require('lodash')

const config = require('../../../config')
const models = require('../../../models')
const Utils = require('../../../utils')
const {
  METRIC_NAMES
} = require('../../prometheusMonitoring/prometheus.constants')
const {
  retrieveClockValueForUserFromReplica,
  makeHistogramToRecord
} = require('../stateMachineUtils')
const SecondarySyncHealthAgreementer = require('./SecondarySyncHealthAgreementer')
const {
  SYNC_MONITORING_RETRY_DELAY_MS,
  QUEUE_NAMES,
  SYNC_MODES,
  SyncType,
  MAX_ISSUE_MANUAL_SYNC_JOB_ATTEMPTS,
  MAX_ISSUE_RECURRING_SYNC_JOB_ATTEMPTS
} = require('../stateMachineConstants')
const primarySyncFromSecondary = require('../../sync/primarySyncFromSecondary')

const secondaryUserSyncDailyFailureCountThreshold = config.get(
  'secondaryUserSyncDailyFailureCountThreshold'
)
const maxSyncMonitoringDurationInMs = config.get(
  'maxSyncMonitoringDurationInMs'
)
const maxManualSyncMonitoringDurationInMs = config.get(
  'maxManualSyncMonitoringDurationInMs'
)
const mergePrimaryAndSecondaryEnabled = config.get(
  'mergePrimaryAndSecondaryEnabled'
)

type HandleIssueSyncReqParams = {
  syncType: string
  syncMode: string
  syncRequestParameters: SyncRequestAxiosParams
  logger: Logger
  attemptNumber: number
}
type HandleIssueSyncReqResult = {
  result: string
  error?: any
  syncReqToEnqueue?: IssueSyncRequestJobParams
}
type AdditionalSyncIsRequiredResponse = {
  outcome: string
  syncReqToEnqueue?: IssueSyncRequestJobParams
}

/**
 * Processes a job to issue a sync request from a user's primary (this node) to a user's secondary with syncType and syncMode
 * Secondary is specified in param.syncRequestParameters
 *
 * @param {Object} param job data
 * @param {Object} param.logger the logger that can be filtered by jobName and jobId
 * @param {string} param.syncType the type of sync (manual or recurring)
 * @param {string} param.syncMode from SYNC_MODES object
 * @param {Object} param.syncRequestParameters axios params to make the sync request. Shape: { baseURL, url, method, data }
 * @param {number} [param.attemptNumber] optional number of times this job has been run. It will be a no-op if it exceeds MAX_ISSUE_SYNC_JOB_ATTEMPTS
 */
module.exports = async function ({
  syncType,
  syncMode,
  syncRequestParameters,
  logger,
  attemptNumber = 1
}: DecoratedJobParams<IssueSyncRequestJobParams>): Promise<
  DecoratedJobReturnValue<IssueSyncRequestJobReturnValue>
> {
  let jobsToEnqueue: JobsToEnqueue = {}
  let metricsToRecord = []
  let error: any = {}

  const startTimeMs = Date.now()

  const {
    syncReqToEnqueue,
    result,
    error: errorResp
  } = await _handleIssueSyncRequest({
    syncType,
    syncMode,
    syncRequestParameters,
    logger,
    attemptNumber
  })
  if (errorResp) {
    error = errorResp
    logger.error(error.message)
  }

  // Enqueue a new sync request if one needs to be enqueued and we haven't retried too many times yet
  const maxRetries =
    syncReqToEnqueue?.syncType === SyncType.Manual
      ? MAX_ISSUE_MANUAL_SYNC_JOB_ATTEMPTS
      : MAX_ISSUE_RECURRING_SYNC_JOB_ATTEMPTS
  if (!_.isEmpty(syncReqToEnqueue) && attemptNumber < maxRetries) {
    logger.info(`Retrying issue-sync-request after attempt #${attemptNumber}`)
    const queueName =
      syncReqToEnqueue?.syncType === SyncType.Manual
        ? QUEUE_NAMES.MANUAL_SYNC
        : QUEUE_NAMES.RECURRING_SYNC
    jobsToEnqueue = {
      [queueName]: [{ attemptNumber: attemptNumber + 1, ...syncReqToEnqueue }]
    }
  } else {
    logger.info(
      `Gave up retrying issue-sync-request (type: ${syncReqToEnqueue?.syncType}) after ${attemptNumber} failed attempts`
    )
  }

  // Make metrics to record
  metricsToRecord = [
    makeHistogramToRecord(
      METRIC_NAMES.ISSUE_SYNC_REQUEST_DURATION_SECONDS_HISTOGRAM,
      (Date.now() - startTimeMs) / 1000, // Metric is in seconds
      {
        sync_type: _.snakeCase(syncType),
        sync_mode: _.snakeCase(syncMode),
        result: _.snakeCase(result)
      }
    )
  ]

  return {
    jobsToEnqueue,
    metricsToRecord,
    error
  }
}

async function _handleIssueSyncRequest({
  syncType,
  syncMode,
  syncRequestParameters,
  logger,
  attemptNumber
}: HandleIssueSyncReqParams): Promise<HandleIssueSyncReqResult> {
  if (!syncRequestParameters?.data?.wallet?.length) {
    return { result: 'failure_missing_wallet' }
  }
  if (syncMode === SYNC_MODES.None) {
    return { result: 'success' }
  }

  const userWallet = syncRequestParameters.data.wallet[0]
  const secondaryEndpoint = syncRequestParameters.baseURL

  const logMsgString = `_handleIssueSyncRequest() (${syncType})(${syncMode}) User ${userWallet} | Secondary: ${secondaryEndpoint}`

  /**
   * Remove sync from SyncRequestDeDuplicator once it moves to Active status, before processing.
   * It is ok for two identical syncs to be present in Active and Waiting, just not two in Waiting.
   * We don't dedupe manual syncs.
   */
  if (syncType === SyncType.Recurring) {
    const SyncRequestDeDuplicator = require('./SyncRequestDeDuplicator')
    SyncRequestDeDuplicator.removeSync(syncType, userWallet, secondaryEndpoint)
  }

  /**
   * Do not issue syncRequest if SecondaryUserSyncFailureCountForToday already exceeded threshold
   */
  const secondaryUserSyncFailureCountForToday =
    await SecondarySyncHealthAgreementer.getSecondaryUserSyncFailureCountForToday(
      secondaryEndpoint,
      userWallet,
      syncType
    )
  if (
    secondaryUserSyncFailureCountForToday >
    secondaryUserSyncDailyFailureCountThreshold
  ) {
    return {
      result: 'failure_secondary_failure_count_threshold_met',
      error: {
        message: `${logMsgString} || Secondary has already met SecondaryUserSyncDailyFailureCountThreshold (${secondaryUserSyncDailyFailureCountThreshold}). Will not issue further syncRequests today.`
      }
    }
  }

  /**
   * For now, if primarySyncFromSecondary fails, we just log & error without any retries
   * Eventually should make this more robust, but proceeding with caution
   */
  if (syncMode === SYNC_MODES.MergePrimaryAndSecondary) {
    // Short-circuit if this syncMode is disabled
    if (!mergePrimaryAndSecondaryEnabled) {
      return { result: 'success_mode_disabled' }
    }

    const error = await primarySyncFromSecondary({
      wallet: userWallet,
      secondary: secondaryEndpoint
    })

    if (error) {
      return {
        result: 'failure_primary_sync_from_secondary',
        error
      }
    }
  }

  /**
   * Issue sync request to secondary
   * - If SyncMode = MergePrimaryAndSecondary - issue sync request with forceResync = true
   *    - above call to primarySyncFromSecondary must have succeeded to get here
   *    - Only apply forceResync flag to this initial sync request, any future syncs proceed as usual
   */
  try {
    if (syncMode === SYNC_MODES.MergePrimaryAndSecondary) {
      const syncRequestParametersForceResync = {
        ...syncRequestParameters,
        data: { ...syncRequestParameters.data, forceResync: true }
      }
      await axios(syncRequestParametersForceResync)
    } else {
      await axios(syncRequestParameters)
    }
  } catch (e: any) {
    return {
      result: 'failure_issue_sync_request',
      error: {
        message: `${logMsgString} || Error issuing sync request: ${e.message}`
      },
      syncReqToEnqueue: {
        syncType,
        syncMode: SYNC_MODES.SyncSecondaryFromPrimary,
        syncRequestParameters,
        attemptNumber
      }
    }
  }

  // primaryClockValue is used in additionalSyncIsRequired() call below
  const primaryClockValue = (await _getUserPrimaryClockValues([userWallet]))[
    userWallet
  ]

  // Wait until has sync has completed (within time threshold)
  const { outcome, syncReqToEnqueue } = await _additionalSyncIsRequired(
    primaryClockValue,
    syncType,
    syncMode,
    syncRequestParameters,
    logger,
    attemptNumber
  )

  return {
    result: outcome,
    syncReqToEnqueue
  }
}

/**
 * Given wallets array, queries DB and returns a map of all users with
 *    those wallets and their clock values, or -1 if wallet not found
 *
 * @returns map(wallet -> clock val)
 */
const _getUserPrimaryClockValues = async (wallets: string[]) => {
  // Query DB for all cnodeUsers with walletPublicKey in `wallets` arg array
  const cnodeUsersFromDB = await models.CNodeUser.findAll({
    where: {
      walletPublicKey: {
        [models.Sequelize.Op.in]: wallets
      }
    }
  })

  // Initialize clock values for all users to -1
  const cnodeUserClockValuesMap: { [wallet: string]: number } = {}
  wallets.forEach((wallet: string) => {
    cnodeUserClockValuesMap[wallet] = -1
  })

  // Populate clock values into map with DB data
  cnodeUsersFromDB.forEach((cnodeUser: any) => {
    cnodeUserClockValuesMap[cnodeUser.walletPublicKey] = cnodeUser.clock
  })

  return cnodeUserClockValuesMap
}

/**
 * Monitor an ongoing sync operation for a given secondaryUrl and user wallet
 * Return boolean indicating if an additional sync is required and reason why (or 'none' if no additional sync is required)
 * Record SyncRequest outcomes to SecondarySyncHealthAgreementer
 */
const _additionalSyncIsRequired = async (
  primaryClockValue = -1,
  syncType: string,
  syncMode: string,
  syncRequestParameters: SyncRequestAxiosParams,
  logger: any,
  attemptNumber: number
): Promise<AdditionalSyncIsRequiredResponse> => {
  const userWallet = syncRequestParameters.data.wallet[0]
  const secondaryUrl = syncRequestParameters.baseURL
  const logMsgString = `additionalSyncIsRequired() (${syncType}): wallet ${userWallet} secondary ${secondaryUrl} primaryClock ${primaryClockValue}`

  const startTimeMs = Date.now()
  const maxMonitoringTimeMs =
    startTimeMs +
    (syncType === SyncType.MANUAL
      ? maxManualSyncMonitoringDurationInMs
      : maxSyncMonitoringDurationInMs)

  /**
   * Poll secondary for sync completion, up to `maxMonitoringTimeMs`
   */

  let secondaryCaughtUpToPrimary = false
  let initialSecondaryClock = null
  let finalSecondaryClock = null

  while (Date.now() < maxMonitoringTimeMs) {
    try {
      const secondaryClockValue = await retrieveClockValueForUserFromReplica(
        secondaryUrl,
        userWallet
      )
      logger.info(`${logMsgString} secondaryClock ${secondaryClockValue}`)

      // Record starting and current clock values for secondary to determine future action
      if (syncMode === SYNC_MODES.MergePrimaryAndSecondary) {
        initialSecondaryClock = -1
      } else if (initialSecondaryClock === null) {
        initialSecondaryClock = secondaryClockValue
      }
      finalSecondaryClock = secondaryClockValue

      /**
       * Stop monitoring if secondary has caught up to primary
       * Note - secondaryClockValue can be greater than primaryClockValue if additional
       *    data was written to primary after primaryClockValue was computed
       */
      if (secondaryClockValue >= primaryClockValue) {
        secondaryCaughtUpToPrimary = true
        break
      }
    } catch (e: any) {
      logger.warn(`${logMsgString} || Error: ${e.message}`)
    }

    // Delay between retries
    await Utils.timeout(SYNC_MONITORING_RETRY_DELAY_MS, false)
  }

  const monitoringTimeMs = Date.now() - startTimeMs

  /**
   * As Primary for user, record SyncRequest outcomes to all secondaries
   * Also check whether additional sync is required
   */
  let additionalSyncIsRequired
  let outcome
  if (secondaryCaughtUpToPrimary) {
    await SecondarySyncHealthAgreementer.recordSuccess(
      secondaryUrl,
      userWallet,
      syncType
    )
    outcome = 'success_secondary_caught_up'
    additionalSyncIsRequired = false
    logger.info(`${logMsgString} || Sync completed in ${monitoringTimeMs}ms`)

    // Secondary completed sync but is still behind primary since it was behind by more than max export range
    // Since syncs are all-or-nothing, if secondary clock has increased at all, we know it successfully completed sync
  } else if (finalSecondaryClock > initialSecondaryClock) {
    await SecondarySyncHealthAgreementer.recordSuccess(
      secondaryUrl,
      userWallet,
      syncType
    )
    additionalSyncIsRequired = true
    outcome = 'success_secondary_partially_caught_up'
    logger.info(
      `${logMsgString} || Secondary successfully synced from clock ${initialSecondaryClock} to ${finalSecondaryClock} but hasn't caught up to Primary. Enqueuing additional syncRequest.`
    )

    // (1) secondary did not catch up to primary AND (2) secondary did not complete sync
  } else {
    await SecondarySyncHealthAgreementer.recordFailure(
      secondaryUrl,
      userWallet,
      syncType
    )
    additionalSyncIsRequired = true
    outcome = 'failure_secondary_failed_to_progress'
    logger.error(
      `${logMsgString} || Secondary failed to progress from clock ${initialSecondaryClock}. Enqueuing additional syncRequest.`
    )
  }

  const response: AdditionalSyncIsRequiredResponse = { outcome }
  if (additionalSyncIsRequired) {
    response.syncReqToEnqueue = {
      syncType,
      syncMode: SYNC_MODES.SyncSecondaryFromPrimary,
      syncRequestParameters,
      attemptNumber: attemptNumber + 1
    }
  }

  return response
}
