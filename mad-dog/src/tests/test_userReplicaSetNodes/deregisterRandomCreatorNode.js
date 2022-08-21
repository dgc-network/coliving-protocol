const _ = require('lodash')

const ServiceCommands = require('@coliving/service-commands')
const { deregisterContentNode } = ServiceCommands

/**
 * Deregisters a random content node and returns the corresponding id
 * modifies the creaorNodeIdToInfoMapping to remove the entry
 * @param {Object} contentNodeIDToInfoMapping 
 * @returns number The id of the content node that was deregistered 
 */
const deregsiterRandomContentNode = async (contentNodeIDToInfoMapping) => {
  const removeCNId = _.sample(Object.keys(contentNodeIDToInfoMapping))
  // Remove content node 1
  await deregisterContentNode(removeCNId)
  delete contentNodeIDToInfoMapping[removeCNId]
  return removeCNId
}

module.exports = deregsiterRandomContentNode
