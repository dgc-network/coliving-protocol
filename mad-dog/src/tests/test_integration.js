const path = require('path')
const { _ } = require('lodash')
const fs = require('fs-extra')
const axios = require('axios')
const retry = require('async-retry')
const assert = require('assert')
const ServiceCommands = require('@coliving/service-commands')
const {
  OPERATION_TYPE,
  AgreementUploadRequest,
  AgreementUploadResponse,
  AgreementRepostRequest,
  AgreementRepostResponse,
  AddContentListAgreementRequest,
  AddContentListAgreementResponse,
  CreateContentListRequest,
  CreateContentListResponse
} = require('../operations.js')
const { logger } = require('../logger.js')
const MadDog = require('../madDog.js')
const { EmitterBasedTest, Event } = require('../emitter.js')
const {
  addUsers,
  ensureReplicaSetSyncIsConsistent,
  delay
} = require('../helpers.js')
const {
  getContentNodeEndpoints,
  getRepostersForAgreement,
  createContentList,
  getContentLists,
  RandomUtils,
  uploadAgreement,
  repostAgreement,
  getAgreementMetadata,
  getUser,
  getUsers,
  verifyCIDExistsOnContentNode,
  uploadPhotoAndUpdateMetadata,
  setContentNodeEndpoint,
  updateCreator,
  getURSMContentNodes,
  addContentListAgreement
} = ServiceCommands
const {
  getRandomAgreementMetadata,
  getRandomAgreementFilePath,
  r6,
  genRandomString
} = RandomUtils

const DEFAULT_TICK_INTERVAL_SECONDS = 5
const DEFAULT_TEST_DURATION_SECONDS = 100
const TEMP_STORAGE_PATH = path.resolve('./local-storage/tmp/')
const TEMP_IMG_STORAGE_PATH = path.resolve('./local-storage/tmp-imgs/')

const SECOND_USER_PIC_PATH = path.resolve('assets/images/duck.jpg')
const THIRD_USER_PIC_PATH = path.resolve('assets/images/sid.png')
const repostedAgreements = []
const uploadedAgreements = []
const userRepostedMap = {}
const createdContentLists = []
const addedContentListAgreements = []

/**
 * Randomly uploads agreements over the duration of the test,
 * testing that the CIDs are on the respective CNodes at the end of the test.
 */
module.exports = coreIntegration = async ({
  numUsers,
  executeAll,
  executeOne,
  numContentNodes,
  testDurationSeconds,
  enableFaultInjection
}) => {
  // Begin: Test Setup

  // If running with UserReplicaSetManager deployed, wait until all Content Nodes are registered on it
  const URSMClient = await executeOne(0, libs => libs.libsInstance.contracts.UserReplicaSetManagerClient)
  if (URSMClient) {
    let retryCount = 0
    const retryLimit = 10
    const retryIntervalMs = 10000 // 10sec
    while (true) {
      console.log(`Ensuring correct URSM state with interval ${retryIntervalMs} || attempt #${retryCount} ...`)

      const URSMContentNodes = await executeOne(0, libs => getURSMContentNodes(libs))

      if (URSMContentNodes.length === numContentNodes) {
        break
      }

      if (retryCount >= retryLimit) {
        return { error: `URSM state not correctly initialized after ${retryIntervalMs * retryLimit}ms` }
      }

      retryCount++

      await delay(retryIntervalMs)
    }
  }

  // create tmp storage dir
  await fs.ensureDir(TEMP_STORAGE_PATH)
  await fs.ensureDir(TEMP_IMG_STORAGE_PATH)

  // map of walletId => agreementId => metadata
  const walletAgreementMap = {}
  // map of walletId => agreementId => metadata
  const failedUploads = {}

  // Create the Emitter Based Test
  const emitterTest = new EmitterBasedTest({
    tickIntervalSeconds: DEFAULT_TICK_INTERVAL_SECONDS,
    testDurationSeconds: testDurationSeconds || DEFAULT_TEST_DURATION_SECONDS
  })

  // Register the request listener. The only request type this test
  // currently handles is to upload agreements.
  emitterTest.registerOnRequestListener(async (request, emit) => {
    const { type, walletIndex, userId } = request
    let res
    switch (type) {
      case OPERATION_TYPE.AGREEMENT_UPLOAD: {
        const digital_content = getRandomAgreementMetadata(userId)

        const randomAgreementFilePath = await getRandomAgreementFilePath(TEMP_STORAGE_PATH)

        try {
          // Execute a digital_content upload request against a single
          // instance of libs.
          await executeOne(walletIndex, l => l.waitForLatestBlock())
          await retry(async () => {
            const agreementId = await executeOne(walletIndex, l =>
              uploadAgreement(l, digital_content, randomAgreementFilePath)
            )
            uploadedAgreements.push({ agreementId: agreementId, userId: userId })
            res = new AgreementUploadResponse(walletIndex, agreementId, digital_content)
          }, {})
        } catch (e) {
          logger.error(`Caught error [${e.message}] uploading digital_content: [${JSON.stringify(digital_content)}]\n${e.stack}`)
          res = new AgreementUploadResponse(
            walletIndex,
            null,
            digital_content,
            false,
            e.message
          )
        }
        // Emit the response event
        emit(Event.RESPONSE, res)
        break
      }
      case OPERATION_TYPE.AGREEMENT_REPOST: {
        // repost candidates include agreements from other users that have not already been reposted by current user
        const repostCandidates = uploadedAgreements
          .filter(obj => obj.userId !== userId)
          .filter(obj => {
            if (!userRepostedMap[obj.userId]) {
              return true
            }
            return !userRepostedMap[obj.userId].includes(obj.agreementId)
          })
          .map(obj => obj.agreementId)
        if (repostCandidates.length === 0) {
          const missingAgreementMessage = 'No agreements available to repost'
          logger.info(missingAgreementMessage)
          res = new AgreementRepostResponse(walletIndex, null, userId, false)
          return emit(Event.RESPONSE, res)
        } else {
          const agreementId = repostCandidates[_.random(repostCandidates.length - 1)]
          try {
            await retry(async () => {
              // verify digital_content has not been reposted
              await executeOne(walletIndex, l => l.waitForLatestBlock())
              let reposters = await executeOne(walletIndex, l => getRepostersForAgreement(l, agreementId))
              let usersReposted = reposters.map(obj => obj.user_id)
              if (usersReposted.includes(userId)) {
                res = new AgreementRepostResponse(
                  walletIndex,
                  agreementId,
                  userId,
                  false,
                  'DigitalContent already reposted.'
                )
                return emit(Event.RESPONSE, res)
              }

              const transaction = await executeOne(walletIndex, l => repostAgreement(l, agreementId))
              if (!transaction.status) {
                res = new AgreementRepostResponse(
                  walletIndex,
                  agreementId,
                  userId,
                  false,
                  'Transaction failed because digital_content was already reposted.'
                )
                return emit(Event.RESPONSE, res)
              }

              // verify digital_content reposted
              await executeOne(walletIndex, l => l.waitForLatestBlock())
              reposters = await executeOne(walletIndex, l => getRepostersForAgreement(l, agreementId))
              usersReposted = reposters.map(obj => obj.user_id)
              if (!usersReposted.includes(userId)) {
                throw new Error(`Reposters for digital_content [${agreementId}] do not include user [${userId}]`)
              }
              if (!userRepostedMap[userId]) {
                userRepostedMap[userId] = []
              }
              userRepostedMap[userId].push(agreementId)
              res = new AgreementRepostResponse(walletIndex, agreementId, userId)
              return emit(Event.RESPONSE, res)
            }, {
              retries: 3,
              factor: 2
            })
          } catch (e) {
            logger.error(`Caught error [${e.message}] reposting digital_content: [${agreementId}]\n${e.stack}`)
            res = new AgreementRepostResponse(
              walletIndex,
              agreementId,
              userId,
              false,
              e.message
            )
            emit(Event.RESPONSE, res)
          }
        }
        break
      }
      case OPERATION_TYPE.CREATE_CONTENT_LIST: {
        try {
          // create contentList
          const randomContentListName = genRandomString(8)
          const contentList = await executeOne(walletIndex, l =>
            createContentList(l, userId, randomContentListName, false, false, [])
          )
          logger.info(`User [${userId}] created contentList [${contentList.contentListId}].`)
          await executeOne(walletIndex, l => l.waitForLatestBlock())
          await retry(async () => {
            // verify contentList
            const verifiedContentList = await executeOne(walletIndex, l =>
              getContentLists(l, 100, 0, [contentList.contentListId], userId)
            )
            if (verifiedContentList[0].content_list_id !== contentList.contentListId) {
              throw new Error(`Error verifying contentList [${contentList.contentListId}]`)
            }
          }, {})
          res = new CreateContentListResponse(walletIndex, contentList.contentListId, userId)
        } catch (e) {
          logger.error(`Caught error [${e.message}] creating contentList.\n${e.stack}`)
          res = new CreateContentListResponse(walletIndex, null, userId)
        }
        emit(Event.RESPONSE, res)
        break
      }
      case OPERATION_TYPE.ADD_CONTENT_LIST_AGREEMENT: {
        if (uploadedAgreements.length === 0 || !createdContentLists[userId]) {
          res = new AddContentListAgreementResponse(
            walletIndex,
            null,
            false,
            new Error('Adding a digital_content to a contentList requires a digital_content to be uploaded.')
          )
        } else {
          const agreementId = uploadedAgreements[_.random(uploadedAgreements.length - 1)].agreementId
          try {
            // add digital_content to contentList
            const contentListId = createdContentLists[userId][_.random(createdContentLists[userId].length - 1)]
            await executeOne(walletIndex, l =>
              addContentListAgreement(l, contentListId, agreementId)
            )
            logger.info(`DigitalContent [${agreementId}] added to contentList [${contentListId}].`)
            await executeOne(walletIndex, l => l.waitForLatestBlock())

            // verify contentList digital_content add
            await retry(async () => {
              const contentLists = await executeOne(walletIndex, l =>
                getContentLists(l, 100, 0, [contentListId], userId)
              )
              const contentListAgreements = contentLists[0].content_list_contents.digital_content_ids.map(obj => obj.digital_content)
              if (!contentListAgreements.includes(agreementId)) {
                throw new Error(`DigitalContent [${agreementId}] not found in contentList [${contentListId}]`)
              }
            }, {
              retries: 20,
              factor: 2
            })
            res = new AddContentListAgreementResponse(walletIndex, agreementId)
          } catch (e) {
            logger.error(`Caught error [${e.message}] adding digital_content: [${agreementId}] to contentList \n${e.stack}`)
            res = new AddContentListAgreementResponse(
              walletIndex,
              null,
              false,
              e.message
            )
          }
        }

        // Emit the response event
        emit(Event.RESPONSE, res)
        break
      }
      default:
        logger.error('Unknown request type!')
        break
    }
  })

  // Register the response listener. Currently only handles
  // digital_content upload responses.
  emitterTest.registerOnResponseListener(res => {
    switch (res.type) {
      case OPERATION_TYPE.AGREEMENT_UPLOAD: {
        const { walletIndex, agreementId, metadata, success } = res
        // If it failed, log it
        if (!success) {
          if (!failedUploads[walletIndex]) {
            failedUploads[walletIndex] = {}
          }

          failedUploads[walletIndex] = {
            [agreementId]: metadata
          }
        } else {
          if (!walletAgreementMap[walletIndex]) {
            walletAgreementMap[walletIndex] = []
          }
          if (agreementId) { // only add successfully uploaded agreements
            walletAgreementMap[walletIndex].push(agreementId)
          }
        }
        break
      }
      case OPERATION_TYPE.AGREEMENT_REPOST: {
        const { walletIndex, agreementId, userId, success } = res
        if (success) {
          repostedAgreements.push({ agreementId: agreementId, userId: userId })
        }
        break
      }
      case OPERATION_TYPE.CREATE_CONTENT_LIST: {
        const { walletIndex, contentList, userId, success } = res
        if (success) {
          if (!createdContentLists[userId]) {
            createdContentLists[userId] = []
          }
          createdContentLists[userId].push(contentList)
        }
        break
      }
      case OPERATION_TYPE.ADD_CONTENT_LIST_AGREEMENT: {
        const { walletIndex, agreementId, success } = res
        if (success) {
          addedContentListAgreements.push(agreementId)
        }
        break
      }

      default:
        logger.error('Unknown response type')
    }
  })

  // Emit one digital_content upload request per tick. This can be adapted to emit other kinds
  // of events.
  emitterTest.registerOnTickListener(emit => {
    const requesterIdx = _.random(0, numUsers - 1)
    const agreementUploadRequest = new AgreementUploadRequest(
      requesterIdx,
      walletIdMap[requesterIdx]
    )
    const agreementRepostRequest = new AgreementRepostRequest(
      requesterIdx,
      walletIdMap[requesterIdx]
    )
    const createContentListRequest = new CreateContentListRequest(
      requesterIdx,
      walletIdMap[requesterIdx]
    )
    const addContentListAgreementRequest = new AddContentListAgreementRequest(
      requesterIdx,
      walletIdMap[requesterIdx]
    )
    const requests = [agreementUploadRequest, agreementRepostRequest, createContentListRequest, addContentListAgreementRequest]
    for (const request of requests) {
      const randomEmit = _.random(1)
      if (randomEmit) {
        emit(Event.REQUEST, request)
      }
    }
  })

  // Create users. Upgrade them to creators later
  let walletIdMap
  try {
    walletIdMap = await addUsers(
      numUsers,
      executeAll,
      executeOne
    )
  } catch (e) {
    return { error: `Issue with creating users: ${e}` }
  }

  // Check that users on signup have the proper metadata
  const walletIndexes = Object.keys(walletIdMap)
  const userIds = Object.values(walletIdMap)

  let userMetadatas = await executeOne(walletIndexes[0], libsWrapper => {
    return getUsers(libsWrapper, userIds)
  })

  // Check that certain MD fields in disc prov are what we expected it to be
  userMetadatas.forEach(user => {
    logger.info(`Checking initial metadata on signup for user=${user.user_id}...`)

    // make this if case stronger -- like query cn1-3 to make sure that data is there
    if (!user.content_node_endpoint) {
      return {
        error: `New user ${user.user_id} should have been assigned a replica set.`
      }
    }

    if (!user.profile_picture_sizes) {
      return {
        error: `New user ${user.user_id} should have an updated profile picture.`
      }
    }
  })

  // Check user metadata is proper and that the clock values across the replica set is consistent
  try {
    await checkUserMetadataAndClockValues({
      walletIndexes,
      walletIdMap,
      userMetadatas,
      picturePath: SECOND_USER_PIC_PATH,
      executeOne,
      executeAll
    })
  } catch (e) {
    return {
      error: `User pre-digital-content upload -- ${e.message}`
    }
  }

  if (enableFaultInjection) {
    // Create a MadDog instance, responsible for taking down nodes
    const m = new MadDog({ numContentNodes })
    m.start()
  }

  // Run emitter test, wait for it to finish
  await emitterTest.run()
  logger.info('Emitter test exited')
  printTestSummary()

  /**
   * Verify results
   */

  verifyThresholds(emitterTest)

  // Check all user replicas until they are synced up to primary
  await executeAll(async (libs, i) => {
    await ensureReplicaSetSyncIsConsistent({ i, executeOne, libs })
  })

  // create array of digital_content upload info to verify
  const agreementUploadInfo = []
  for (const walletIndex of Object.keys(walletAgreementMap)) {
    const userId = walletIdMap[walletIndex]
    const agreements = walletAgreementMap[walletIndex]
    if (!agreements) continue
    for (const agreementId of agreements) {
      agreementUploadInfo.push({
        walletIndex,
        agreementId,
        userId
      })
    }
  }

  // Ensure all CIDs exist on all replicas
  const allCIDsExistOnCNodes = await verifyAllCIDsExistOnCNodes(agreementUploadInfo, executeOne)
  if (!allCIDsExistOnCNodes) {
    return { error: 'Not all CIDs exist on content nodes.' }
  }

  const failedWallets = Object.values(failedUploads)
  if (failedWallets.length) {
    const userIds = failedWallets.map(w => walletIdMap[w])
    logger.error(`Uploads failed for user IDs=[${userIds}]`)
  }

  // Switch user primary (above tests have already confirmed all secondaries have latest state)
  for await (const walletIndex of Object.keys(walletIdMap)) {
    const userId = walletIdMap[walletIndex]
    const userMetadata = await executeOne(walletIndex, l => getUser(l, userId))
    const wallet = userMetadata.wallet
    const [primary, ...secondaries] = userMetadata.content_node_endpoint.split(',')

    logger.info(`userId=${userId} wallet=${wallet} rset=${userMetadata.content_node_endpoint}`)

    // Define new rset by swapping primary and first secondary
    const newRSet = (secondaries.length) ? [secondaries[0], primary].concat(secondaries.slice(1)) : [primary]

    // Update libs instance with new endpoint
    await executeOne(walletIndex, libs => setContentNodeEndpoint(libs, newRSet[0]))

    // Update user metadata obj
    const newMetadata = { ...userMetadata }
    newMetadata.content_node_endpoint = newRSet.join(',')

    // Update creator state on CN and chain
    await executeOne(walletIndex, libs => updateCreator(libs, userId, newMetadata))

    logger.info(`Successfully updated creator with userId=${userId} on CN and Chain`)
  }

  // Check all user replicas until they are synced up to primary
  await executeAll(async (libs, i) => {
    await ensureReplicaSetSyncIsConsistent({ i, executeOne, libs })
  })

  // TODO call export on each node and verify equality

  // TODO Upload more content to new primary + verify

  // Remove temp storage dirs
  await fs.remove(TEMP_STORAGE_PATH)
  await fs.remove(TEMP_IMG_STORAGE_PATH)

  userMetadatas = await executeOne(walletIndexes[0], libsWrapper => {
    return getUsers(libsWrapper, userIds)
  })

  // Check that certain MD fields in disc node are what we expected it to be after uploading first digital_content
  userMetadatas.forEach(user => {
    logger.info(`Checking post digital_content upload metadata for user=${user.user_id}...`)

    if (!user.content_node_endpoint) {
      return {
        error: `User ${user.user_id} should have kept their replica set.`
      }
    }

    if (!user.profile_picture_sizes) {
      return {
        error: `User ${user.user_id} should have an updated profile picture.`
      }
    }
  })

  // Check user metadata is proper and that the clock values across the replica set is consistent
  try {
    await checkUserMetadataAndClockValues({
      walletIndexes,
      walletIdMap,
      userMetadatas,
      picturePath: THIRD_USER_PIC_PATH,
      executeOne,
      executeAll
    })
  } catch (e) {
    console.log(e)
    return {
      error: `User post digital_content upload -- ${e.message}`
    }
  }

  return {}
}

/**
 * Expects agreementUploads in the shape of Array<{ userId, walletIndex, agreementId }>
 */
const verifyAllCIDsExistOnCNodes = async (agreementUploads, executeOne) => {
  // map userId => CID[]
  const userCIDMap = {}
  for (const { agreementId, walletIndex, userId } of agreementUploads) {
    const agreementMetadata = await executeOne(walletIndex, l =>
      getAgreementMetadata(l, agreementId)
    )
    const segmentCIDs = agreementMetadata.digital_content_segments.map(s => s.multihash)
    if (userCIDMap[userId] === undefined) {
      userCIDMap[userId] = []
    }
    userCIDMap[userId] = [...userCIDMap[userId], ...segmentCIDs]
  }

  // Now, find the cnodes for each user

  // make a map of userID => array of cnode endpoints in user replica set
  const userIdRSetMap = {}
  const userIds = agreementUploads.map(u => u.userId)
  for (const userId of userIds) {
    const user = await executeOne(0, l => getUser(l, userId))
    userIdRSetMap[userId] = user.content_node_endpoint.split(',')
  }

  // Now, confirm each of these CIDs are on each user replica
  const failedCIDs = []
  for (const userId of userIds) {
    const userRSet = userIdRSetMap[userId]
    const cids = userCIDMap[userId]

    if (!cids) continue

    await Promise.all(cids.map(async (cid) => {
      await Promise.all(userRSet.map(async (replica) => {
        // TODO: add `fromFS` option when this is merged back into CN.
        const exists = await verifyCIDExistsOnContentNode(cid, replica)
        if (!exists) {
          logger.warn(`Could not find CID ${cid} for user=${userId} on replica ${replica}`)
          failedCIDs.push(cid)
        }
      }))
    }))
  }
  logger.info('Completed verifying CIDs')
  return !failedCIDs.length
}

/**
 * NOTE - function name is inaccurate
 *
 * Confirms replica set is synced, metadata is available from every replica.
 * Then uploads a photo and updates metadata, and performs validation once again.
 */
async function checkUserMetadataAndClockValues({
  walletIndexes,
  walletIdMap,
  userMetadatas,
  picturePath,
  executeOne,
  executeAll
}) {
  try {
    await executeAll(async (libs, i) => {
      // Check that the clock values across replica set are equal
      await ensureReplicaSetSyncIsConsistent({ i, executeOne, libs })

      // Check that the metadata object in CN across replica set is what we expect it to be
      const replicaSetEndpoints = await executeOne(i, libs =>
        getContentNodeEndpoints(libs, userMetadatas[i].content_node_endpoint)
      )

      await checkMetadataEquality({
        endpoints: replicaSetEndpoints,
        metadataMultihash: userMetadatas[i].metadata_multihash,
        userId: libs.userId
      })

      // Update MD (bio + photo) and check that 2 and 3 are correct
      const updatedBio = 'i am so cool ' + r6()
      await executeOne(i, async libs => {
        const newMetadata = { ...userMetadatas[i] }
        newMetadata.bio = updatedBio

        // Update profile picture and metadata accordingly
        logger.info(`Updating metadata for user=${libs.userId}...`)
        await uploadPhotoAndUpdateMetadata(libs, {
          metadata: newMetadata,
          userId: libs.userId,
          picturePath,
          updateCoverPhoto: false
        })
      })

      await ensureReplicaSetSyncIsConsistent({ i, libs, executeOne })

      // Check that the updated MD is correct with the updated bio and profile picture
      const updatedUser = await executeOne(i, libs => getUser(libs, libs.userId))
      await checkMetadataEquality({
        endpoints: replicaSetEndpoints,
        metadataMultihash: updatedUser.metadata_multihash,
        userId: libs.userId
      })
    })
  } catch (e) {
    console.log(e)
    throw e
  }
}

async function checkMetadataEquality({ endpoints, metadataMultihash, userId }) {
  logger.info(`Checking metadata across replica set is consistent user=${userId}...`)
  const start = Date.now()

  const replicaSetMetadatas = (await Promise.all(
    endpoints.map(endpoint => {
      const promise = retry(
        async () => {
          return axios({
            url: `/ipfs/${metadataMultihash}`,
            method: 'get',
            baseURL: endpoint,
            timeout: 4000
          })
        },
        {
          retries: 5,
          maxTimeout: 5000 // ms
        }
      )
      return promise
    })
  )).map(response => response.data)
  logger.info(`Completed metadata check for user ${userId} in ${Date.now() - start}ms`)

  const fieldsToCheck = [
    'content_node_endpoint',
    'profile_picture_sizes',
    'bio'
  ]

  // Primary = index 0, secondaries = indexes 1,2
  fieldsToCheck.forEach(field => {
    const primaryValue = replicaSetMetadatas[0][field]
    if (
      replicaSetMetadatas[1][field] !== primaryValue ||
      replicaSetMetadatas[2][field] !== primaryValue
    ) {
      throw new Error(
        `Field ${field} in secondaries does not match what is in primary.\nPrimary: ${primaryValue}\nSecondaries: ${replicaSetMetadatas[1][field]},${replicaSetMetadatas[2][field]}`
      )
    }
  })
}

const verifyThresholds = (emitterTest) => {
  // NOTE - # of ticks = (duration / interval) - 1
  // thresholds are approximated based on the number of ticks, randomization, and dependencies
  // e.g., reposted has a lower threshold since it depends on an existing digital_content that's not yet reposted

  const numberOfTicks = (emitterTest.testDurationSeconds / emitterTest.tickIntervalSeconds) - 1
  assert.ok(uploadedAgreements.length > (numberOfTicks / 5))
  assert.ok(repostedAgreements.length > (numberOfTicks / 10))
  assert.ok(Object.values(createdContentLists).flat().length > (numberOfTicks / 10))
  assert.ok(addedContentListAgreements.length > (numberOfTicks / 10))
}

const printTestSummary = () => {
  logger.info('\n------------------------ COLIVING CORE INTEGRATION TEST Summary ------------------------')
  logger.info(`uploadedAgreements: ${uploadedAgreements.length}                | Total uploaded agreements`)
  logger.info(`repostedAgreements: ${repostedAgreements.length}                | Total reposted agreements`)
  logger.info(`createdContentLists: ${Object.values(createdContentLists).flat().length}                | Total created contentLists`)
  logger.info(`addedContentListAgreements: ${addedContentListAgreements.length}                | Total added contentList agreements`)
}
