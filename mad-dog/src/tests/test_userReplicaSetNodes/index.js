const { addAndUpgradeUsers } = require('../../helpers.js')
const verifyValidCNs = require('./verifyValidCN')
const deregisterRandomContentNode = require('./deregisterRandomContentNode.js')
const stopRandomContentNode = require('./stopRandomContentNode.js')
const setNumContentNodes = require('./setNumContentNodes.js')
const { uploadAgreementsforUsers } = require('../../utils/uploadAgreementsForUsers')
const { logger } = require('../../logger')
const { delay } = require('../../helpers')

const MAX_ATTEMPTS_TO_VALIDATE_REPLICA_SET = 20
const WAIT_INTERVAL_TO_UPDATE_REPLICA_SET_MS = 20000

/**
 * Tests that the user replica sets update when a node is deregistered or down
 */
const deregisterCN = async ({
  numUsers = 10,
  numContentNodes = 10,
  iterations,
  executeAll,
  executeOne
}) => {
  let contentNodeIDToInfoMapping = {}
  let walletIndexToUserIdMap = {}

  // Creates and initialize users if user does not exist. Else, uses existing users.
  try {
    walletIndexToUserIdMap = await addAndUpgradeUsers(
      numUsers,
      executeAll,
      executeOne
    )
  } catch (e) {
    return { error: `[Snapback CN Deregistering] Issue with creating and upgrading users: ${e}` }
  }

  logger.info('[Snapback CN Deregistering] Start')
  for (let iteration = 0; iteration < iterations; iteration++) {
    contentNodeIDToInfoMapping = await setNumContentNodes(numContentNodes, executeOne)

    // Upload agreements to users
    await uploadAgreementsforUsers({ executeAll, executeOne, walletIndexToUserIdMap })

    const deregisteredContentNodeId = await deregisterRandomContentNode(contentNodeIDToInfoMapping)

    // Create a MadDog instance, responsible for taking down 1 node
    let attempts = 0
    let passed = false
    let error
    while (attempts++ < MAX_ATTEMPTS_TO_VALIDATE_REPLICA_SET) {
      await delay(WAIT_INTERVAL_TO_UPDATE_REPLICA_SET_MS)
      try {
        await verifyValidCNs(executeOne, executeAll, deregisteredContentNodeId, walletIndexToUserIdMap, contentNodeIDToInfoMapping)
        passed = true
        break
      } catch (e) {
        error = e
      }
    }

    if (!passed) {
      return {
        error: `[Snapback CN Deregistering] Error with verifying updated replica set: ${error.toString()}`
      }
    }
  }

  logger.info('[Snapback CN Deregistering] SUCCESS!')
}

const forceCNUnavailability = async ({
  numUsers = 10,
  numContentNodes = 10,
  iterations,
  executeAll,
  executeOne
}) => {
  let contentNodeIDToInfoMapping = {}
  let walletIndexToUserIdMap = {}

  // Creates and initialize users if user does not exist. Else, uses existing users.
  try {
    walletIndexToUserIdMap = await addAndUpgradeUsers(
      numUsers,
      executeAll,
      executeOne
    )
  } catch (e) {
    return { error: `[Snapback CN Unavailability] Issue with creating and upgrading users: ${e}` }
  }

  logger.info('[Snapback CN Unavailability] Start')

  for (let iteration = 0; iteration < iterations; iteration++) {
    contentNodeIDToInfoMapping = await setNumContentNodes(numContentNodes, executeOne)

    const {
      madDog,
      removedContentNodeId
    } = await stopRandomContentNode(contentNodeIDToInfoMapping)

    let error = null
    let attempts = 0
    let passed = false
    while (attempts++ < MAX_ATTEMPTS_TO_VALIDATE_REPLICA_SET) {
      await delay(WAIT_INTERVAL_TO_UPDATE_REPLICA_SET_MS)
      try {
        await verifyValidCNs(executeOne, executeAll, removedContentNodeId, walletIndexToUserIdMap, contentNodeIDToInfoMapping)
        passed = true
        break
      } catch (e) {
        error = e
      }
    }

    madDog.stop()

    if (!passed) {
      return {
        error: `[Snapback CN Unavailability] Error with verifying updated replica set: ${error.toString()}`
      }
    }
  }

  logger.info('[Snapback CN Unavailability] SUCCESS!')
}

module.exports = {
  deregisterCN,
  forceCNUnavailability
}
