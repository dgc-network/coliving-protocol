const uuidv4 = require('uuid/v4')

// Declaration of feature flags set in optimizely
const FEATURE_FLAGS = Object.freeze({
  SOLANA_LISTEN_ENABLED_SERVER: 'solana_listen_enabled_server',
  SOLANA_SEND_RAW_TRANSACTION: 'solana_send_raw_transaction',
  REWARDS_ATTESTATION_ENABLED: 'rewards_attestation_enabled',
  REWARDS_NOTIFICATIONS_ENABLED: 'rewards_notifications_enabled',
  SOCIAL_PROOF_TO_SEND_LIVE_ENABLED: 'social_proof_to_send_live_enabled',
  DETECT_ABUSE_ON_RELAY: 'detect_abuse_on_relay',
  TIPPING_ENABLED: 'tipping_enabled'
})

// Default values for feature flags while optimizely has not loaded
// Generally, these should be never seen unless variables are
// consumed within a few seconds of server init
const DEFAULTS = Object.freeze({
  [FEATURE_FLAGS.SOLANA_LISTEN_ENABLED_SERVER]: false,
  [FEATURE_FLAGS.SOLANA_SEND_RAW_TRANSACTION]: false,
  [FEATURE_FLAGS.REWARDS_ATTESTATION_ENABLED]: false,
  [FEATURE_FLAGS.REWARDS_NOTIFICATIONS_ENABLED]: false,
  [FEATURE_FLAGS.SOCIAL_PROOF_TO_SEND_LIVE_ENABLED]: true,
  [FEATURE_FLAGS.DETECT_ABUSE_ON_RELAY]: false,
  [FEATURE_FLAGS.TIPPING_ENABLED]: false
})

/**
 * Fetches a feature flag
 * @param {OptimizelyClient?} optimizelyClient
 * @param {String} flag FEATURE_FLAGS value
 * @param {String} userId the user id to determine whether this feature is
 * enabled. By default this is just random, so every call to getFeatureFlag
 * will have the same behavior.
 * @returns
 */
const getFeatureFlag = (optimizelyClient, flag, userId = uuidv4()) => {
  if (!optimizelyClient) {
    return DEFAULTS[flag]
  }
  return optimizelyClient.isFeatureEnabled(
    flag, userId
  )
}

module.exports = {
  getFeatureFlag,
  FEATURE_FLAGS
}
