const { logger: genericLogger } = require('../../logging')

/**
 * Queries to periodically keep the mapping of (Content Node endpoint -> SP ID)
 * up to date.
 * TODO: Make updateCnodeEndpointToSpIdMap into a cron or its own queue after deciding on a reasonable interval.
 */
class CNodeToSpIdMapManager {
  constructor() {
    this.cNodeEndpointToSpIdMap = {}
  }

  getCNodeEndpointToSpIdMap() {
    return this.cNodeEndpointToSpIdMap
  }

  /**
   * Updates `this.cNodeEndpointToSpIdMap` to the mapping of <endpoint : spId>. If the fetch fails, rely on the previous
   * `this.cNodeEndpointToSpIdMap` value. If the existing map is empty, throw error as we need this map to issue reconfigs.
   * @param {Object} ethContracts colivingLibs.ethContracts instance; has helper fn to get service provider info
   */
  async updateCnodeEndpointToSpIdMap(ethContracts) {
    const cNodeEndpointToSpIdMap = {}
    try {
      const contentNodes = await ethContracts.getServiceProviderList(
        'content-node'
      )
      contentNodes.forEach((cn) => {
        cNodeEndpointToSpIdMap[cn.endpoint] = cn.spID
      })
    } catch (e) {
      genericLogger.error(
        `cNodeToSpIdMapManager - Could not fetch content nodes: ${e.message}`
      )
    }

    if (Object.keys(cNodeEndpointToSpIdMap).length > 0) {
      this.cNodeEndpointToSpIdMap = cNodeEndpointToSpIdMap
    }

    const mapLength = Object.keys(this.cNodeEndpointToSpIdMap).length
    if (mapLength === 0) {
      const errorMessage =
        'cNodeToSpIdMapManager - Unable to initialize cNodeEndpointToSpIdMap'
      genericLogger.error(errorMessage)
      throw new Error(errorMessage)
    }

    genericLogger.info(
      `cNodeToSpIdMapManager - updateCnodeEndpointToSpIdMap Success. Size: ${mapLength}`
    )
  }
}

module.exports = new CNodeToSpIdMapManager()
