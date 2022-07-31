const _ = require('lodash')

const config = require('../../config')
const { logger: baseLogger } = require('../../logging')
const StateMonitoringManager = require('./stateMonitoring')
const StateReconciliationManager = require('./stateReconciliation')
const { RECONFIG_MODES, QUEUE_NAMES } = require('./stateMachineConstants')
const makeOnCompleteCallback = require('./makeOnCompleteCallback')
const CNodeToSpIdMapManager = require('./CNodeToSpIdMapManager')

/**
 * Manages the queue for monitoring the state of Content Nodes and
 * the queue for reconciling anomalies in the state (syncs and replica set updates).
 */
class StateMachineManager {
  async init(colivingLibs, prometheusRegistry) {
    this.updateEnabledReconfigModesSet()

    // Initialize class immediately since bull jobs are run on cadence even on deploy
    await CNodeToSpIdMapManager.updateCnodeEndpointToSpIdMap(
      colivingLibs.ethContracts
    )

    // Initialize queues
    const stateMonitoringManager = new StateMonitoringManager()
    const stateReconciliationManager = new StateReconciliationManager()
    const {
      monitorStateQueue,
      findSyncRequestsQueue,
      findReplicaSetUpdatesQueue,
      cNodeEndpointToSpIdMapQueue
    } = await stateMonitoringManager.init(
      colivingLibs.discoveryProvider.discoveryProviderEndpoint,
      prometheusRegistry
    )
    const { manualSyncQueue, recurringSyncQueue, updateReplicaSetQueue } =
      await stateReconciliationManager.init(prometheusRegistry)

    // Upon completion, make queue jobs record metrics and enqueue other jobs as necessary
    const queueNameToQueueMap = {
      [QUEUE_NAMES.MONITOR_STATE]: monitorStateQueue,
      [QUEUE_NAMES.FIND_SYNC_REQUESTS]: findSyncRequestsQueue,
      [QUEUE_NAMES.FIND_REPLICA_SET_UPDATES]: findReplicaSetUpdatesQueue,
      [QUEUE_NAMES.MANUAL_SYNC]: manualSyncQueue,
      [QUEUE_NAMES.RECURRING_SYNC]: recurringSyncQueue,
      [QUEUE_NAMES.UPDATE_REPLICA_SET]: updateReplicaSetQueue
    }
    for (const [queueName, queue] of Object.entries(queueNameToQueueMap)) {
      queue.on(
        'global:completed',
        makeOnCompleteCallback(
          queueName,
          queueNameToQueueMap,
          prometheusRegistry
        ).bind(this)
      )
    }

    // Update the mapping in this StateMachineManager whenever a job successfully fetches it
    cNodeEndpointToSpIdMapQueue.on(
      'global:completed',
      this.updateMapOnMapFetchJobComplete.bind(this)
    )

    return {
      monitorStateQueue,
      findSyncRequestsQueue,
      findReplicaSetUpdatesQueue,
      cNodeEndpointToSpIdMapQueue,
      manualSyncQueue,
      recurringSyncQueue,
      updateReplicaSetQueue
    }
  }

  /**
   * Deserializes the results of a job and updates the enabled reconfig modes to be either:
   * - enabled (to the highest enabled mode configured) if the job fetched the mapping successfully
   * - disabled if the job encountered an error fetching the mapping
   * @param {number} jobId the ID of the job that completed
   * @param {string} resultString the stringified JSON of the job's returnValue
   */
  async updateMapOnMapFetchJobComplete(jobId, resultString) {
    // Bull serializes the job result into redis, so we have to deserialize it into JSON
    let jobResult = {}
    try {
      jobResult = JSON.parse(resultString) || {}
    } catch (e) {
      baseLogger.warn(
        `Failed to parse cNodeEndpoint->spId map jobId ${jobId} result string: ${resultString}`
      )
      return
    }

    const { errorMsg } = jobResult
    if (errorMsg?.length) {
      // Disable reconfigs if there was an error fetching the mapping
      this.updateEnabledReconfigModesSet(
        /* override */ RECONFIG_MODES.RECONFIG_DISABLED.key
      )
    } else {
      // Update the reconfig mode to the highest enabled mode if there was no error
      this.updateEnabledReconfigModesSet()
    }
  }

  /**
   * Updates `enabledReconfigModesSet` and `highestEnabledReconfigMode`.
   * Uses `override` if provided, else uses config var.
   * `enabledReconfigModesSet` contains every mode with rank <= `highestEnabledReconfigMode`
   *   - e.g. `highestEnabledReconfigMode = 'PRIMARY_AND_SECONDARY'
   *      `enabledReconfigModesSet = { 'RECONFIG_DISABLED', 'ONE_SECONDARY', 'MULTIPLE_SECONDARIES', 'PRIMARY_AND_SECONDARY' }
   */
  updateEnabledReconfigModesSet(override) {
    let highestEnabledReconfigMode

    const reconfigModeKeys = Object.keys(RECONFIG_MODES)

    // Set mode to override if provided
    if (override) {
      highestEnabledReconfigMode = override

      // Else, set mode to config var, defaulting to RECONFIG_DISABLED if invalid
    } else {
      highestEnabledReconfigMode = reconfigModeKeys.includes(
        config.get('snapbackHighestReconfigMode')
      )
        ? config.get('snapbackHighestReconfigMode')
        : RECONFIG_MODES.RECONFIG_DISABLED.key
    }

    // All modes with lower rank than `highestEnabledReconfigMode` should be enabled
    const enabledReconfigModesSet = new Set(
      reconfigModeKeys.filter(
        (mode) =>
          RECONFIG_MODES[mode].value <=
          RECONFIG_MODES[highestEnabledReconfigMode].value
      )
    )

    // Update class variables for external access
    this.highestEnabledReconfigMode = highestEnabledReconfigMode
    this.enabledReconfigModesSet = enabledReconfigModesSet
  }
}

module.exports = StateMachineManager
