const _ = require('lodash')

const MadDog = require('../../madDog.js')

/**
 * Stops a random content node with maddog
 * @param {Object} contentNodeIDToInfoMapping Mapping of creator ndoe ids to info
 * @returns 
 */
const stopRandomContentNode = async (contentNodeIDToInfoMapping) => {
  const cnIds = Object.keys(contentNodeIDToInfoMapping).map(id => parseInt(id))
  const maxId = Math.max(cnIds)
  const  madDog = new MadDog({ 
    numContentNodes: maxId - 1,
    downProbability: 0,
    downDurationSec: 90,
    packetLossPercent: 100
  })
  const removedContentNodeId = _.sample(cnIds)
  const removeCNName = MadDog.makeContentNodeName(removedContentNodeId)
  madDog.start(removeCNName)
  return { madDog, removedContentNodeId }
}

module.exports = stopRandomContentNode