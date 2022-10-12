const BlacklistManager = require('../../src/blacklistManager')

const { deleteKeyPatternInRedis } = require('../../src/redis')

/**
 * Removes all BlacklistManager keys in redis
 * @param {Object} redis
 */
async function restartBlacklistManager(redis) {
  await redis.del(BlacklistManager.getRedisDigitalContentIdKey())
  await redis.del(BlacklistManager.getRedisUserIdKey())
  await redis.del(BlacklistManager.getRedisSegmentCIDKey())
  await redis.del(BlacklistManager.getInvalidDigitalContentIdsKey())

  deleteKeyPatternInRedis({
    keyPattern: BlacklistManager.getRedisDigitalContentIdToCIDsKey('*')
  })

  BlacklistManager.initialized = false
}

module.exports = {
  restartBlacklistManager
}
