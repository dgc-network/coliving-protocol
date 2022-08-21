const { ContentNode } = require('../services/contentNode')

/**
 * Add secondary content nodes for a user if they don't have any
 * Goal: Make it so users always have a replica set
 */
const addSecondaries = async (libs) => {
  console.debug('Sanity Check - addSecondaries')
  const user = libs.userStateManager.getCurrentUser()

  if (!user) return

  const primary = ContentNode.getPrimary(user.content_node_endpoint)
  const secondaries = ContentNode.getSecondaries(user.content_node_endpoint)

  // Get current endpoints and check if we don't have enough secondaries
  if (secondaries.length < 2) {
    console.debug(`Sanity Check - addSecondaries - User has only ${secondaries.length}`)

    // Find new healthy secondaries
    const currentEndpoints = ContentNode.getEndpoints(user.content_node_endpoint)
    const services = await libs.ServiceProvider.getSelectableContentNodes(
      /* whitelist */ null,
      /* blacklist */ new Set(currentEndpoints)
    )
    console.debug(`Sanity Check - addSecondaries - found services ${JSON.stringify(services)}`)
    const newSecondaries = Object.keys(services)
      .slice(0, 2 - secondaries.length)

    // Combine primary, current secondaries, and new secondaries
    const newEndpoints = [primary, ...secondaries, ...newSecondaries]

    const newMetadata = { ...user }
    newMetadata.content_node_endpoint = newEndpoints.join(',')
    console.debug(`Sanity Check - addSecondaries - new nodes ${newMetadata.content_node_endpoint}`)
    await libs.User.updateCreator(user.user_id, newMetadata)
  }
}

module.exports = addSecondaries
