const BlacklistManager = require('../../src/blacklistManager')

const { deleteKeyPatternInRedis } = require('../../src/redis')

/**
 * Removes all BlacklistManager keys in redis
 * @param {Object} redis
 */
async function restartBlacklistManager(redis) {
  await redis.del(BlacklistManager.getRedisAgreementIdKey())
  await redis.del(BlacklistManager.getRedisUserIdKey())
  await redis.del(BlacklistManager.getRedisSegmentCIDKey())
  await redis.del(BlacklistManager.getInvalidAgreementIdsKey())

  deleteKeyPatternInRedis({
    keyPattern: BlacklistManager.getRedisAgreementIdToCIDsKey('*')
  })

  BlacklistManager.initialized = false
}

module.exports = {
  restartBlacklistManager
}
