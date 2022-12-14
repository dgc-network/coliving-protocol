const { Utils } = require('../utils')
const { ContentNode } = require('../services/contentNode')

const THREE_SECONDS = 3000
const MAX_TRIES = 3

/** Check if the user's primary content node is healthy */
const checkPrimaryHealthy = async (libs, primary, tries) => {
  const healthy = await Utils.isHealthy(primary)
  if (healthy) return healthy
  else {
    if (tries === 0) {
      return false
    }
    await Utils.wait(THREE_SECONDS)
    return checkPrimaryHealthy(libs, primary, tries - 1)
  }
}

/** Gets new endpoints from a user's secondaries */
const getNewPrimary = async (libs, secondaries) => {
  for (const secondary of secondaries) {
    const { isBehind } = await libs.contentNode.getSyncStatus(secondary)
    if (!isBehind) {
      return secondary
    }
  }
  throw new Error(`Could not find valid secondaries for user ${secondaries}`)
}

const rolloverNodes = async (libs, contentNodeWhitelist) => {
  console.debug('Sanity Check - rolloverNodes')
  const user = libs.userStateManager.getCurrentUser()

  if (!user) return

  const primary = ContentNode.getPrimary(user.content_node_endpoint)
  const healthy = await checkPrimaryHealthy(libs, primary, MAX_TRIES)
  if (healthy) return

  const secondaries = ContentNode.getSecondaries(user.content_node_endpoint)

  try {
    // Get a new primary
    const newPrimary = await getNewPrimary(libs, secondaries)
    const index = secondaries.indexOf(newPrimary)
    // Get new secondaries and backfill up to 2
    let newSecondaries = [...secondaries]
    newSecondaries.splice(index, 1)
    const autoselect = await libs.ServiceProvider.autoSelectContentNodes({
      numberOfNodes: 2 - newSecondaries.length,
      whitelist: contentNodeWhitelist,
      // Exclude ones we currently have
      blacklist: new Set([newPrimary, ...newSecondaries]),
      preferHigherPatchForPrimary: libs.User.preferHigherPatchForPrimary,
      preferHigherPatchForSecondaries: libs.User.preferHigherPatchForSecondaries
    })
    newSecondaries = newSecondaries.concat([autoselect.primary, ...autoselect.secondaries])

    // Set the new endpoint and connect to it
    const newEndpoints = [newPrimary, ...newSecondaries]
    await libs.contentNode.setEndpoint(newEndpoints[0])

    // Update the user
    const newMetadata = { ...user }
    newMetadata.content_node_endpoint = newEndpoints.join(',')
    console.debug(`Sanity Check - rolloverNodes - new nodes ${newMetadata.content_node_endpoint}`)
    await libs.User.updateCreator(user.user_id, newMetadata)
  } catch (e) {
    console.error(e)
  }
}

module.exports = rolloverNodes
