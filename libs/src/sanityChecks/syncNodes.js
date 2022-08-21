const { ContentNode } = require('../services/contentNode')
/**
 * Syncs a content node if its blocknubmer is behind the passed
 * in blocknumber.
 */
const syncNodeIfBehind = async (libs, endpoint) => {
  try {
    const { isBehind, isConfigured } = await libs.contentNode.getSyncStatus(endpoint)
    if (isBehind || !isConfigured) {
      console.debug(`Sanity Check - syncNodes - syncing ${endpoint}`)
      await libs.contentNode.syncSecondary(endpoint)
    }
  } catch (e) {
    console.error(e)
  }
}

const syncNodes = async (libs) => {
  console.debug('Sanity Check - syncNodes')
  const user = libs.userStateManager.getCurrentUser()

  if (!user) return

  const secondaries = ContentNode.getSecondaries(user.content_node_endpoint)
  await Promise.all(secondaries.map(secondary => syncNodeIfBehind(libs, secondary)))
}

module.exports = syncNodes
