const _ = require('lodash')
const axios = require('axios')

const { logger } = require('../../logging')
const models = require('../../models')
const { saveFileForMultihashToFS } = require('../../fileManager')
const { getOwnEndpoint, getContentNodeEndpoints } = require('../../middlewares')
const SyncHistoryAggregator = require('../../snapbackSM/syncHistoryAggregator')
const DBManager = require('../../dbManager')
const UserSyncFailureCountManager = require('./userSyncFailureCountManager')

const handleSyncFromPrimary = async (
  serviceRegistry,
  walletPublicKeys,
  contentNodeEndpoint,
  blockNumber = null,
  forceResync = false
) => {
  const { nodeConfig, redis, libs } = serviceRegistry
  const FileSaveMaxConcurrency = nodeConfig.get(
    'nodeSyncFileSaveMaxConcurrency'
  )
  const SyncRequestMaxUserFailureCountBeforeSkip = nodeConfig.get(
    'syncRequestMaxUserFailureCountBeforeSkip'
  )

  const start = Date.now()

  logger.info('begin nodesync for ', walletPublicKeys, 'time', start)

  /**
   * Ensure access to each wallet, then acquire redis lock for duration of sync
   * @notice - there's a bug where logPrefix is set to the last element of `walletPublicKeys` - this code only works when `walletPublicKeys.length === 1` 🤦‍♂️
   */
  let logPrefix
  for (const wallet of walletPublicKeys) {
    logPrefix = `[secondarySyncFromPrimary][wallet=${wallet}]`
    try {
      await redis.WalletWriteLock.acquire(
        wallet,
        redis.WalletWriteLock.VALID_ACQUIRERS.SecondarySyncFromPrimary
      )
    } catch (e) {
      return {
        error: new Error(
          `Cannot change state of wallet ${wallet}. Node sync currently in progress.`
        ),
        result: 'failure_sync_in_progress'
      }
    }
  }

  /**
   * Perform all sync operations, catch and log error if thrown, and always release redis locks after.
   */
  try {
    const wallet = walletPublicKeys[0]

    let localMaxClockVal
    if (forceResync) {
      await DBManager.deleteAllCNodeUserDataFromDB({ lookupWallet: wallet })
      localMaxClockVal = -1
    } else {
      // Query own latest clockValue and call export with that value + 1; export from 0 for first time sync
      const cnodeUser = await models.CNodeUser.findOne({
        where: { walletPublicKey: walletPublicKeys[0] }
      })
      localMaxClockVal = cnodeUser ? cnodeUser.clock : -1
    }

    /**
     * Fetch data export from contentNodeEndpoint for given walletPublicKeys and clock value range
     *
     * Secondary requests export of new data by passing its current max clock value in the request.
     * Primary builds an export object of all data beginning from the next clock value.
     */

    // Build export query params
    const exportQueryParams = {
      wallet_public_key: walletPublicKeys,
      clock_range_min: localMaxClockVal + 1
    }

    // This is used only for logging by primary to record endpoint of requesting node
    if (nodeConfig.get('contentNodeEndpoint')) {
      exportQueryParams.source_endpoint = nodeConfig.get('contentNodeEndpoint')
    }

    const resp = await axios({
      method: 'get',
      baseURL: contentNodeEndpoint,
      url: '/export',
      params: exportQueryParams,
      responseType: 'json',
      /** @notice - this request timeout is arbitrarily large for now until we find an appropriate value */
      timeout: 300000 /* 5m = 300000ms */
    })

    if (resp.status !== 200) {
      logger.error(
        logPrefix,
        `Failed to retrieve export from ${contentNodeEndpoint} for wallets`,
        walletPublicKeys
      )
      return {
        error: new Error(resp.data.error),
        result: 'failure_export_wallet'
      }
    }

    // TODO - explain patch
    if (!resp.data) {
      if (resp.request && resp.request.responseText) {
        resp.data = JSON.parse(resp.request.responseText)
      } else {
        return {
          error: new Error(`Malformed response from ${contentNodeEndpoint}.`),
          result: 'failure_malformed_export'
        }
      }
    }

    const { data: body } = resp
    if (!body.data.hasOwnProperty('cnodeUsers')) {
      return {
        error: new Error(`Malformed response from ${contentNodeEndpoint}.`),
        result: 'failure_malformed_export'
      }
    }

    logger.info(
      logPrefix,
      `Successful export from ${contentNodeEndpoint} for wallets ${walletPublicKeys} and requested min clock ${
        localMaxClockVal + 1
      }`
    )

    /**
     * For each CNodeUser, replace local DB state with retrieved data + fetch + save missing files.
     */

    for (const fetchedCNodeUser of Object.values(body.data.cnodeUsers)) {
      // Since different nodes may assign different cnodeUserUUIDs to a given walletPublicKey,
      // retrieve local cnodeUserUUID from fetched walletPublicKey and delete all associated data.
      if (!fetchedCNodeUser.hasOwnProperty('walletPublicKey')) {
        return {
          error: new Error(
            `Malformed response received from ${contentNodeEndpoint}. "walletPublicKey" property not found on CNodeUser in response object`
          ),
          result: 'failure_malformed_export'
        }
      }
      const fetchedWalletPublicKey = fetchedCNodeUser.walletPublicKey

      /**
       * Retrieve user's replica set to use as gateways for content fetching in saveFileForMultihashToFS
       *
       * Note that sync is only called on secondaries so `myCnodeEndpoint` below always represents a secondary.
       */
      let userReplicaSet = []
      try {
        const myCnodeEndpoint = await getOwnEndpoint(serviceRegistry)
        userReplicaSet = await getContentNodeEndpoints({
          libs,
          logger: logger,
          wallet: fetchedWalletPublicKey,
          blockNumber,
          ensurePrimary: false,
          myCnodeEndpoint
        })

        // filter out current node from user's replica set
        userReplicaSet = userReplicaSet.filter((url) => url !== myCnodeEndpoint)

        // Spread + set uniq's the array
        userReplicaSet = [...new Set(userReplicaSet)]
      } catch (e) {
        logger.error(
          logPrefix,
          `Couldn't get user's replica set, can't use cnode gateways in saveFileForMultihashToFS - ${e.message}`
        )
      }

      if (!walletPublicKeys.includes(fetchedWalletPublicKey)) {
        return {
          error: new Error(
            `Malformed response from ${contentNodeEndpoint}. Returned data for walletPublicKey that was not requested.`
          ),
          result: 'failure_malformed_export'
        }
      }

      /**
       * This node (secondary) must compare its local clock state against clock state received in export from primary.
       * Only allow sync if received clock state contains new data and is contiguous with existing data.
       */

      const {
        latestBlockNumber: fetchedLatestBlockNumber,
        clock: fetchedLatestClockVal,
        clockRecords: fetchedClockRecords
      } = fetchedCNodeUser

      const maxClockRecordId = Math.max(
        ...fetchedCNodeUser.clockRecords.map((record) => record.clock)
      )

      // Error if returned data is not within requested range
      if (fetchedLatestClockVal < localMaxClockVal) {
        return {
          error: new Error(
            `Cannot sync for localMaxClockVal ${localMaxClockVal} - imported data has max clock val ${fetchedLatestClockVal}`
          ),
          result: 'failure_inconsistent_clock'
        }
      } else if (fetchedLatestClockVal === localMaxClockVal) {
        // Already up to date, no sync necessary
        logger.info(
          logPrefix,
          `User ${fetchedWalletPublicKey} already up to date! Both nodes have latest clock value ${localMaxClockVal}`
        )
        continue
      } else if (
        localMaxClockVal !== -1 &&
        fetchedClockRecords[0] &&
        fetchedClockRecords[0].clock !== localMaxClockVal + 1
      ) {
        return {
          error: new Error(
            `Cannot sync - imported data is not contiguous. Local max clock val = ${localMaxClockVal} and imported min clock val ${fetchedClockRecords[0].clock}`
          ),
          result: 'failure_import_not_contiguous'
        }
      } else if (
        !_.isEmpty(fetchedCNodeUser.clockRecords) &&
        maxClockRecordId !== fetchedLatestClockVal
      ) {
        return {
          error: new Error(
            `Cannot sync - imported data is not consistent. Imported max clock val = ${fetchedLatestClockVal} and imported max ClockRecord val ${maxClockRecordId}`
          ),
          result: 'failure_import_not_consistent'
        }
      }

      // All DB updates must happen in single atomic tx - partial state updates will lead to data loss
      const transaction = await models.sequelize.transaction()

      /**
       * Process all DB updates for cnodeUser
       */
      try {
        logger.info(
          logPrefix,
          `beginning add ops for cnodeUser wallet ${fetchedWalletPublicKey}`
        )

        /**
         * Update CNodeUser entry if exists else create new
         *
         * Cannot use upsert since it fails to use default value for cnodeUserUUID per this issue https://github.com/sequelize/sequelize/issues/3247
         */

        let cnodeUser

        // Fetch current cnodeUser from DB
        const cnodeUserRecord = await models.CNodeUser.findOne({
          where: { walletPublicKey: fetchedWalletPublicKey },
          transaction
        })

        /**
         * The first sync for a user will enter else case where no local cnodeUserRecord is found
         *    creating a new entry with a new auto-generated cnodeUserUUID.
         * Every subsequent sync will enter the if case and update the existing local cnodeUserRecord.
         */
        if (cnodeUserRecord) {
          const [numRowsUpdated, respObj] = await models.CNodeUser.update(
            {
              lastLogin: fetchedCNodeUser.lastLogin,
              latestBlockNumber: fetchedLatestBlockNumber,
              clock: fetchedCNodeUser.clock,
              createdAt: fetchedCNodeUser.createdAt
            },
            {
              where: { walletPublicKey: fetchedWalletPublicKey },
              fields: [
                'lastLogin',
                'latestBlockNumber',
                'clock',
                'createdAt',
                'updatedAt'
              ],
              returning: true,
              transaction
            }
          )

          // Error if update failed
          if (numRowsUpdated !== 1 || respObj.length !== 1) {
            return {
              error: new Error(
                `Failed to update cnodeUser row for cnodeUser wallet ${fetchedWalletPublicKey}`
              ),
              result: 'failure_db_transaction'
            }
          }
          cnodeUser = respObj[0]
        } else {
          // Will throw error if creation fails
          cnodeUser = await models.CNodeUser.create(
            {
              walletPublicKey: fetchedWalletPublicKey,
              lastLogin: fetchedCNodeUser.lastLogin,
              latestBlockNumber: fetchedLatestBlockNumber,
              clock: fetchedCNodeUser.clock,
              createdAt: fetchedCNodeUser.createdAt
            },
            {
              returning: true,
              transaction
            }
          )
        }

        const cnodeUserUUID = cnodeUser.cnodeUserUUID
        logger.info(
          logPrefix,
          `Inserted CNodeUser for cnodeUser wallet ${fetchedWalletPublicKey}: cnodeUserUUID: ${cnodeUserUUID}`
        )

        /**
         * Populate all new data for fetched cnodeUser
         * Always use local cnodeUserUUID in favor of cnodeUserUUID in exported dataset to ensure consistency
         */

        /*
         * Make list of all digital_content Files to add after digital_content creation
         *
         * Files with digitalContentBlockchainIds cannot be created until digitalContents have been created,
         *    but digitalContents cannot be created until metadata and cover art files have been created.
         */

        const digitalContentFiles = fetchedCNodeUser.files.filter((file) =>
          models.File.DigitalContentTypes.includes(file.type)
        )
        const nonDigitalContentFiles = fetchedCNodeUser.files.filter((file) =>
          models.File.NonDigitalContentTypes.includes(file.type)
        )
        const numTotalFiles = digitalContentFiles.length + nonDigitalContentFiles.length

        const CIDsThatFailedSaveFileOp = new Set()

        // Save all digital_content files to disk in batches (to limit concurrent load)
        for (let i = 0; i < digitalContentFiles.length; i += FileSaveMaxConcurrency) {
          const digitalContentFilesSlice = digitalContentFiles.slice(
            i,
            i + FileSaveMaxConcurrency
          )
          logger.info(
            logPrefix,
            `DigitalContentFiles saveFileForMultihashToFS - processing digitalContentFiles ${i} to ${
              i + FileSaveMaxConcurrency
            } out of total ${digitalContentFiles.length}...`
          )

          /**
           * Fetch content for each CID + save to FS
           * Record any CIDs that failed retrieval/saving for later use
           * @notice `saveFileForMultihashToFS()` should never reject - it will return error indicator for post processing
           */
          await Promise.all(
            digitalContentFilesSlice.map(async (digitalContentFile) => {
              const success = await saveFileForMultihashToFS(
                libs,
                logger,
                digitalContentFile.multihash,
                digitalContentFile.storagePath,
                userReplicaSet,
                null,
                digitalContentFile.digitalContentBlockchainId
              )

              // If saveFile op failed, record CID for later processing
              if (!success) {
                CIDsThatFailedSaveFileOp.add(digitalContentFile.multihash)
              }
            })
          )
        }
        logger.info(logPrefix, 'Saved all digital_content files to disk.')

        // Save all non-digital-content files to disk in batches (to limit concurrent load)
        for (let i = 0; i < nonDigitalContentFiles.length; i += FileSaveMaxConcurrency) {
          const nonDigitalContentFilesSlice = nonDigitalContentFiles.slice(
            i,
            i + FileSaveMaxConcurrency
          )
          logger.info(
            logPrefix,
            `NonDigitalContentFiles saveFileForMultihashToFS - processing files ${i} to ${
              i + FileSaveMaxConcurrency
            } out of total ${nonDigitalContentFiles.length}...`
          )
          await Promise.all(
            nonDigitalContentFilesSlice.map(async (nonDigitalContentFile) => {
              // Skip over directories since there's no actual content to sync
              // The files inside the directory are synced separately
              if (nonDigitalContentFile.type !== 'dir') {
                const multihash = nonDigitalContentFile.multihash

                let success

                // if it's an image file, we need to pass in the actual filename because the gateway request is /ipfs/Qm123/<filename>
                // need to also check fileName is not null to make sure it's a dir-style image. non-dir images won't have a 'fileName' db column
                if (
                  nonDigitalContentFile.type === 'image' &&
                  nonDigitalContentFile.fileName !== null
                ) {
                  success = await saveFileForMultihashToFS(
                    libs,
                    logger,
                    multihash,
                    nonDigitalContentFile.storagePath,
                    userReplicaSet,
                    nonDigitalContentFile.fileName
                  )
                } else {
                  success = await saveFileForMultihashToFS(
                    libs,
                    logger,
                    multihash,
                    nonDigitalContentFile.storagePath,
                    userReplicaSet
                  )
                }

                // If saveFile op failed, record CID for later processing
                if (!success) {
                  CIDsThatFailedSaveFileOp.add(multihash)
                }
              }
            })
          )
        }
        logger.info(logPrefix, 'Saved all non-digital-content files to disk.')

        /**
         * Handle scenario where failed to retrieve/save > 0 CIDs
         * Reject sync if number of failures for user is below threshold, else proceed and mark unretrieved files as skipped
         */
        const numCIDsThatFailedSaveFileOp = CIDsThatFailedSaveFileOp.size
        if (numCIDsThatFailedSaveFileOp > 0) {
          const userSyncFailureCount =
            UserSyncFailureCountManager.incrementFailureCount(
              fetchedWalletPublicKey
            )

          // Throw error if failure threshold not yet reached
          if (userSyncFailureCount < SyncRequestMaxUserFailureCountBeforeSkip) {
            const errorMsg = `User Sync failed due to ${numCIDsThatFailedSaveFileOp} failing saveFileForMultihashToFS op. userSyncFailureCount = ${userSyncFailureCount} // SyncRequestMaxUserFailureCountBeforeSkip = ${SyncRequestMaxUserFailureCountBeforeSkip}`
            logger.error(logPrefix, errorMsg)
            return {
              error: new Error(errorMsg),
              result: 'failure_skip_threshold_not_reached'
            }

            // If max failure threshold reached, continue with sync and reset failure count
          } else {
            // Reset falure count so subsequent user syncs will not always succeed & skip
            UserSyncFailureCountManager.resetFailureCount(
              fetchedWalletPublicKey
            )

            logger.info(
              logPrefix,
              `User Sync continuing with ${numCIDsThatFailedSaveFileOp} skipped files, since SyncRequestMaxUserFailureCountBeforeSkip (${SyncRequestMaxUserFailureCountBeforeSkip}) reached.`
            )
          }
        } else {
          // Reset failure count if all files were successfully saved
          UserSyncFailureCountManager.resetFailureCount(fetchedWalletPublicKey)
        }

        /**
         * Write all records to DB
         */

        await models.ClockRecord.bulkCreate(
          fetchedCNodeUser.clockRecords.map((clockRecord) => ({
            ...clockRecord,
            cnodeUserUUID
          })),
          { transaction }
        )
        logger.info(logPrefix, 'Saved all ClockRecord entries to DB')

        await models.File.bulkCreate(
          nonDigitalContentFiles.map((file) => {
            if (CIDsThatFailedSaveFileOp.has(file.multihash)) {
              file.skipped = true // defaults to false
            }
            return {
              ...file,
              digitalContentBlockchainId: null,
              cnodeUserUUID
            }
          }),
          { transaction }
        )
        logger.info(logPrefix, 'Saved all non-digital-content File entries to DB')

        await models.DigitalContent.bulkCreate(
          fetchedCNodeUser.digitalContents.map((digital_content) => ({
            ...digital_content,
            cnodeUserUUID
          })),
          { transaction }
        )
        logger.info(logPrefix, 'Saved all DigitalContent entries to DB')

        await models.File.bulkCreate(
          digitalContentFiles.map((digitalContentFile) => {
            if (CIDsThatFailedSaveFileOp.has(digitalContentFile.multihash)) {
              digitalContentFile.skipped = true // defaults to false
            }
            return {
              ...digitalContentFile,
              cnodeUserUUID
            }
          }),
          { transaction }
        )
        logger.info(logPrefix, 'Saved all digital_content File entries to DB')

        await models.ColivingUser.bulkCreate(
          fetchedCNodeUser.colivingUsers.map((colivingUser) => ({
            ...colivingUser,
            cnodeUserUUID
          })),
          { transaction }
        )
        logger.info(logPrefix, 'Saved all ColivingUser entries to DB')

        await transaction.commit()

        logger.info(
          logPrefix,
          `Transaction successfully committed for cnodeUser wallet ${fetchedWalletPublicKey} with ${numTotalFiles} files processed and ${numCIDsThatFailedSaveFileOp} skipped.`
        )

        // digital_content that sync for this user was successful
        await SyncHistoryAggregator.recordSyncSuccess(fetchedWalletPublicKey)
      } catch (e) {
        logger.error(
          logPrefix,
          `Transaction failed for cnodeUser wallet ${fetchedWalletPublicKey}`,
          e
        )

        await transaction.rollback()

        await DBManager.fixInconsistentUser(fetchedCNodeUser.cnodeUserUUID)

        return {
          error: new Error(e),
          result: 'failure_db_transaction'
        }
      }
    }
  } catch (e) {
    for (const wallet of walletPublicKeys) {
      await SyncHistoryAggregator.recordSyncFail(wallet)
    }
    logger.error(
      logPrefix,
      `Sync complete for wallets: ${walletPublicKeys.join(
        ','
      )}. Status: Error, message: ${e.message}. Duration sync: ${
        Date.now() - start
      }. From endpoint ${contentNodeEndpoint}.`
    )

    return {
      error: new Error(e),
      result: 'failure_sync_secondary_from_primary'
    }
  } finally {
    // Release all redis locks
    for (const wallet of walletPublicKeys) {
      try {
        await redis.WalletWriteLock.release(wallet)
      } catch (e) {
        logger.warn(
          logPrefix,
          `Failure to release write lock for ${wallet} with error ${e.message}`
        )
      }
    }
  }

  logger.info(
    logPrefix,
    `Sync complete for wallets: ${walletPublicKeys.join(
      ','
    )}. Status: Success. Duration sync: ${
      Date.now() - start
    }. From endpoint ${contentNodeEndpoint}.`
  )

  return { result: 'success' }
}

/**
 * This function is only run on secondaries, to export and sync data from a user's primary.
 *
 * @notice - By design, will reject any syncs with non-contiguous clock values. For now,
 *    any data corruption from primary needs to be handled separately and should not be replicated.
 *
 * @notice - There is a maxExportClockValueRange enforced in export, meaning that some syncs will
 *    only replicate partial data state. This is by design, and Snapback will trigger repeated syncs
 *    with progressively increasing clock values until secondaries have completely synced up.
 *    Secondaries have no knowledge of the current data state on primary, they simply replicate
 *    what they receive in each export.
 */
module.exports = async function (
  serviceRegistry,
  walletPublicKeys,
  contentNodeEndpoint,
  blockNumber = null,
  forceResync = false
) {
  const { prometheusRegistry } = serviceRegistry
  const secondarySyncFromPrimaryMetric = prometheusRegistry.getMetric(
    prometheusRegistry.metricNames
      .SECONDARY_SYNC_FROM_PRIMARY_DURATION_SECONDS_HISTOGRAM
  )
  const metricEndTimerFn = secondarySyncFromPrimaryMetric.startTimer()

  const { error, ...labels } = await handleSyncFromPrimary(
    serviceRegistry,
    walletPublicKeys,
    contentNodeEndpoint,
    blockNumber,
    forceResync
  )
  metricEndTimerFn(labels)

  if (error) {
    throw new Error(error)
  }

  return labels
}
