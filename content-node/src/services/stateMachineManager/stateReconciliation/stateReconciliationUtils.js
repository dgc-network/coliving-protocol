const _ = require('lodash')
const axios = require('axios')
const { logger } = require('../../../logging')
const Utils = require('../../../utils')
const { SyncType, SYNC_MODES } = require('../stateMachineConstants')
const SyncRequestDeDuplicator = require('./SyncRequestDeDuplicator')

/**
 * Returns a job can be enqueued to add a sync request for the given user to the given secondary,
 * or returns the duplicate job if one already exists to for the same user and secondary.
 * @Returns {
 *   duplicateSyncReq,
 *   syncReqToEnqueue
 * }
 */
const getNewOrExistingSyncReq = ({
  userWallet,
  primaryEndpoint,
  secondaryEndpoint,
  syncType,
  syncMode,
  immediate = false
}) => {
  if (
    !userWallet ||
    !primaryEndpoint ||
    !secondaryEndpoint ||
    !syncType ||
    !syncMode
  ) {
    throw new Error(
      `getNewOrExistingSyncReq missing parameter - userWallet: ${userWallet}, primaryEndpoint: ${primaryEndpoint}, secondaryEndpoint: ${secondaryEndpoint}, syncType: ${syncType}, syncMode: ${syncMode}`
    )
  }
  /**
   * If duplicate sync already exists, do not add and instead return existing sync job info
   * Ignore syncMode when checking for duplicates, since it doesn't matter
   */
  const duplicateSyncJobInfo = SyncRequestDeDuplicator.getDuplicateSyncJobInfo(
    syncType,
    userWallet,
    secondaryEndpoint
  )
  if (duplicateSyncJobInfo && syncType !== SyncType.Manual) {
    logger.info(
      `getNewOrExistingSyncReq() Failure - a sync of type ${syncType} is already waiting for user wallet ${userWallet} against secondary ${secondaryEndpoint}`
    )

    return {
      duplicateSyncReq: duplicateSyncJobInfo
    }
  }

  // Define axios params for sync request to secondary
  const syncRequestParameters = {
    baseURL: secondaryEndpoint,
    url: '/sync',
    method: 'post',
    data: {
      wallet: [userWallet],
      content_node_endpoint: primaryEndpoint,
      // Note - `sync_type` param is only used for logging by nodeSync.js
      sync_type: syncType,
      // immediate = true will ensure secondary skips debounce and evaluates sync immediately
      immediate
    }
  }

  // Add job to issue manual or recurring sync request based on `syncType` param
  const syncReqToEnqueue = {
    syncType,
    syncMode,
    syncRequestParameters
  }

  // Record sync in syncDeDuplicator for recurring syncs only
  if (syncType === SyncType.Recurring) {
    SyncRequestDeDuplicator.recordSync(
      syncType,
      userWallet,
      secondaryEndpoint,
      syncReqToEnqueue
    )
  }

  return { syncReqToEnqueue }
}

/**
 * Issues syncRequest for user against secondary, and polls for replication up to primary
 * If secondary fails to sync within specified timeoutMs, will error
 */
const issueSyncRequestsUntilSynced = async (
  primaryUrl,
  secondaryUrl,
  wallet,
  primaryClockVal,
  timeoutMs,
  queue
) => {
  // Issue syncRequest before polling secondary for replication
  const { duplicateSyncReq, syncReqToEnqueue } = getNewOrExistingSyncReq({
    userWallet: wallet,
    secondaryEndpoint: secondaryUrl,
    primaryEndpoint: primaryUrl,
    syncType: SyncType.Manual,
    syncMode: SYNC_MODES.SyncSecondaryFromPrimary,
    immediate: true
  })
  if (!_.isEmpty(duplicateSyncReq)) {
    // Log duplicate and return
    logger.warn(`Duplicate sync request: ${JSON.stringify(duplicateSyncReq)}`)
    return
  } else if (!_.isEmpty(syncReqToEnqueue)) {
    await queue.add({
      enqueuedBy: 'issueSyncRequestsUntilSynced',
      ...syncReqToEnqueue
    })
  } else {
    // Log error that the sync request couldn't be created and return
    logger.error(`Failed to create manual sync request`)
    return
  }

  // Poll clock status and issue syncRequests until secondary is caught up or until timeoutMs
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      // Retrieve secondary clock status for user
      const secondaryClockStatusResp = await axios({
        method: 'get',
        baseURL: secondaryUrl,
        url: `/users/clock_status/${wallet}`,
        responseType: 'json',
        timeout: 1000 // 1000ms = 1s
      })
      const { clockValue: secondaryClockVal, syncInProgress } =
        secondaryClockStatusResp.data.data

      // If secondary is synced, return successfully
      if (secondaryClockVal >= primaryClockVal) {
        return
      }

      // Give secondary some time to process ongoing sync
      // NOTE - we might want to make this timeout longer
      await Utils.timeout(500)
    } catch (e) {
      // do nothing and let while loop continue
    }
  }

  // This condition will only be hit if the secondary has failed to sync within timeoutMs
  throw new Error(
    `Secondary ${secondaryUrl} did not sync up to primary for user ${wallet} within ${timeoutMs}ms`
  )
}

module.exports = {
  getNewOrExistingSyncReq,
  issueSyncRequestsUntilSynced
}
