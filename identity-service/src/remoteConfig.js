const REMOTE_CONFIG_FEATURE = 'remote_config'

// Declaration of remote config variables set in optimizely
const REMOTE_VARS = Object.freeze({
  TRENDING_EXPERIMENT: 'TRENDING_EXPERIMENT',
  CHALLENGE_IDS_DENY_LIST: 'CHALLENGE_IDS_DENY_LIST',
  REWARDS_ATTESTATION_ENDPOINTS: 'REWARDS_ATTESTATION_ENDPOINTS',
  ORACLE_ENDPOINT: 'ORACLE_ENDPOINT',
  ORACLE_ETH_ADDRESS: 'ORACLE_ETH_ADDRESS',
  ATTESTER_DELAY_SEC: 'ATTESTER_DELAY_SEC',
  ATTESTER_PARALLELIZATION: 'ATTESTER_PARALLELIZATION'
})

// Default values for remote vars while optimizely has not loaded
// Generally, these should be never seen unless variables are
// consumed within a few seconds of server init
const DEFAULTS = Object.freeze({
  [REMOTE_VARS.TRENDING_EXPERIMENT]: null,
  [REMOTE_VARS.CHALLENGE_IDS_DENY_LIST]: [],
  [REMOTE_VARS.ATTESTER_DELAY_SEC]: 60,
  [REMOTE_VARS.ATTESTER_PARALLELIZATION]: 2
})

// Use a dummy user id since remote config is enabled by default
// for all users
const DUMMY_USER_ID = 'ANONYMOUS_USER'

/**
 * Fetches a remote variable
 * @param {OptimizelyClient?} optimizelyClient
 * @param {String} variable REMOTE_VARS value
 * @returns
 */
const getRemoteVar = (optimizelyClient, variable) => {
  if (!optimizelyClient) {
    return DEFAULTS[variable]
  }
  return optimizelyClient.getFeatureVariable(
    REMOTE_CONFIG_FEATURE, variable, DUMMY_USER_ID
  )
}

module.exports = {
  getRemoteVar,
  REMOTE_VARS
}
