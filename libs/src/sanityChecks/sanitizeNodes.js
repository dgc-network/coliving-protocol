/**
 * Sanitize user.content_node_endpoint
 * Goal: Make it so we never end up in a state like content_node_endpoint = "https://cn1.co,,"
 */
const sanitizeNodes = async (libs, secondaries) => {
  console.debug('Sanity Check - sanitizeNodes')
  const user = libs.userStateManager.getCurrentUser()

  if (!user) return

  const sanitizedEndpoint = user.content_node_endpoint
    .split(',')
    .filter(Boolean)
    .join(',')

  if (sanitizedEndpoint !== user.content_node_endpoint) {
    console.debug(`Sanity Check - sanitizingNodes - ${user.content_node_endpoint} -> ${sanitizedEndpoint}`)
    const newMetadata = { ...user }
    newMetadata.content_node_endpoint = sanitizedEndpoint
    await libs.User.updateCreator(user.user_id, newMetadata)
  }
}

module.exports = sanitizeNodes
