const { logger } = require('./logging')
const models = require('./models')
const redis = require('./redis')
const config = require('./config')

const CID_WHITELIST = new Set(config.get('cidWhitelist').split(','))

const REDIS_SET_BLACKLIST_DIGITAL_CONTENT_ID_KEY = 'BM.SET.BLACKLIST.DIGITAL_CONTENT_ID'
const REDIS_SET_BLACKLIST_USERID_KEY = 'BM.SET.BLACKLIST.USERID'
const REDIS_SET_BLACKLIST_SEGMENTCID_KEY = 'BM.SET.BLACKLIST.SEGMENTCID'
const REDIS_MAP_DIGITAL_CONTENT_ID_TO_SEGMENTCIDS_KEY = 'BM.MAP.DIGITAL_CONTENT_ID.SEGMENTCIDS'
const REDIS_SET_INVALID_DIGITAL_CONTENT_IDS_KEY = 'BM.SET.INVALID.DIGITAL_CONTENT_IDS'

const SEGMENTCID_TO_DIGITAL_CONTENT_ID_EXPIRATION_SECONDS =
  14 /* days */ * 24 /* hours */ * 60 /* minutes */ * 60 /* seconds */
const INVALID_DIGITAL_CONTENT_ID_EXPIRATION_SECONDS =
  1 /* hour */ * 60 /* minutes */ * 60 /* seconds */

const PROCESS_DIGITAL_CONTENTS_BATCH_SIZE = 200

const types = models.ContentBlacklist.Types

class BlacklistManager {
  constructor() {
    this.initialized = false
  }

  static async init() {
    try {
      this.log('Initializing BlacklistManager...')

      const { digitalContentIdsToBlacklist, userIdsToBlacklist, segmentsToBlacklist } =
        await this.getDataToBlacklist()
      await this.fetchCIDsAndAddToRedis({
        digitalContentIdsToBlacklist,
        userIdsToBlacklist,
        segmentsToBlacklist
      })

      this.initialized = true

      this.log('Initialized BlacklistManager')
    } catch (e) {
      throw new Error(`Could not init BlacklistManager: ${e.message}`)
    }
  }

  /** Return list of digitalContentIds, userIds, and CIDs to be blacklisted. */
  static async getDataToBlacklist() {
    // CBL = ContentBlacklist
    const digitalContentsFromCBL = await models.ContentBlacklist.findAll({
      attributes: ['value'],
      where: {
        type: types.digital_content
      },
      raw: true
    })
    const usersFromCBL = await models.ContentBlacklist.findAll({
      attributes: ['value'],
      where: {
        type: types.user
      },
      raw: true
    })
    const segmentsFromCBL = await models.ContentBlacklist.findAll({
      attributes: ['value'],
      where: {
        type: types.cid
      },
      raw: true
    })

    const segmentsToBlacklist = segmentsFromCBL.map((entry) => entry.value)
    const userIdsToBlacklist = usersFromCBL.map((entry) =>
      parseInt(entry.value)
    )
    const digitalContentIdsToBlacklist = digitalContentsFromCBL.map((entry) =>
      parseInt(entry.value)
    )

    return { digitalContentIdsToBlacklist, userIdsToBlacklist, segmentsToBlacklist }
  }

  /**
   * 1. Given digitalContentIds and userIds to blacklist, fetch all segmentCIDs, and then add the ultimate set of segments to redis.
   * 2. Add the digitalContentIds and userIds to redis as sets.
   * 3. Create mapping of explicitly blacklisted digitalContents with the structure <blacklisted-segmentCIDs : set of digitalContentIds> in redis.
   */
  static async fetchCIDsAndAddToRedis({
    digitalContentIdsToBlacklist = [],
    userIdsToBlacklist = [],
    segmentsToBlacklist = []
  }) {
    // Get all digitalContents from users and combine with explicit digitalContentIds to BL
    const digitalContentsFromUsers = await this.getDigitalContentsFromUsers(userIdsToBlacklist)
    const allDigitalContentIdsToBlacklist = digitalContentIdsToBlacklist.concat(
      digitalContentsFromUsers.map((digital_content) => digital_content.blockchainId)
    )

    // Dedupe digitalContentIds
    const allDigitalContentIdsToBlacklistSet = new Set(allDigitalContentIdsToBlacklist)

    try {
      await this.addToRedis(
        REDIS_SET_BLACKLIST_DIGITAL_CONTENT_ID_KEY,
        allDigitalContentIdsToBlacklist
      )
      await this.addToRedis(REDIS_SET_BLACKLIST_USERID_KEY, userIdsToBlacklist)
      await this.addToRedis(
        REDIS_SET_BLACKLIST_SEGMENTCID_KEY,
        segmentsToBlacklist
      )
    } catch (e) {
      throw new Error(
        `[fetchCIDsAndAddToRedis] - Failed to add digital_content ids, user ids, or explicitly blacklisted segments to blacklist: ${e.message}`
      )
    }

    await BlacklistManager.addAggregateCIDsToRedis([
      ...allDigitalContentIdsToBlacklistSet
    ])
  }

  /**
   * Helper method to batch adding CIDs from digitalContents and users to the blacklist
   * @param {number[]} allDigitalContentIdsToBlacklist aggregate list of digital_content ids to blacklist from explicit digital_content id blacklist and digitalContents from blacklisted users
   */
  static async addAggregateCIDsToRedis(allDigitalContentIdsToBlacklist) {
    const transaction = await models.sequelize.transaction()

    let i
    for (
      i = 0;
      i < allDigitalContentIdsToBlacklist.length;
      i = i + PROCESS_DIGITAL_CONTENTS_BATCH_SIZE
    ) {
      try {
        const digitalContentsSlice = allDigitalContentIdsToBlacklist.slice(
          i,
          i + PROCESS_DIGITAL_CONTENTS_BATCH_SIZE
        )

        this.logDebug(
          `[addAggregateCIDsToRedis] - digitalContents slice size: ${digitalContentsSlice.length}`
        )

        const segmentsFromDigitalContentIdsToBlacklist =
          await BlacklistManager.getCIDsToBlacklist(digitalContentsSlice, transaction)

        this.logDebug(
          `[addAggregateCIDsToRedis] - number of segments: ${segmentsFromDigitalContentIdsToBlacklist.length}`
        )

        await BlacklistManager.addToRedis(
          REDIS_SET_BLACKLIST_SEGMENTCID_KEY,
          segmentsFromDigitalContentIdsToBlacklist
        )
      } catch (e) {
        await transaction.rollback()
        throw new Error(
          `[addAggregateCIDsToRedis] - Could not add digitalContents slice ${i} to ${
            i + PROCESS_DIGITAL_CONTENTS_BATCH_SIZE
          }: ${e.message}`
        )
      }
    }

    await transaction.commit()
  }

  /**
   * Given digitalContentIds and userIds to remove from blacklist, fetch all segmentCIDs.
   * Also remove the digitalContentIds, userIds, and segmentCIDs from redis blacklist sets to prevent future interaction.
   */
  static async fetchCIDsAndRemoveFromRedis({
    digitalContentIdsToRemove = [],
    userIdsToRemove = [],
    segmentsToRemove = []
  }) {
    // Get all digitalContents from users and combine with explicit digitalContentIds to BL
    const digitalContentsFromUsers = await this.getDigitalContentsFromUsers(userIdsToRemove)
    const allDigitalContentIdsToBlacklist = digitalContentIdsToRemove.concat(
      digitalContentsFromUsers.map((digital_content) => digital_content.blockchainId)
    )

    // Dedupe digitalContentIds
    const allDigitalContentIdsToBlacklistSet = new Set(allDigitalContentIdsToBlacklist)

    // Retrieves CIDs from deduped digitalContentIds
    const segmentsFromDigitalContentIds = await this.getCIDsToBlacklist([
      ...allDigitalContentIdsToBlacklistSet
    ])

    let segmentCIDsToRemove = segmentsFromDigitalContentIds.concat(segmentsToRemove)
    const segmentCIDsToRemoveSet = new Set(segmentCIDsToRemove)
    segmentCIDsToRemove = [...segmentCIDsToRemoveSet]

    try {
      await this.removeFromRedis(
        REDIS_SET_BLACKLIST_DIGITAL_CONTENT_ID_KEY,
        allDigitalContentIdsToBlacklist
      )
      await this.removeFromRedis(
        REDIS_SET_BLACKLIST_USERID_KEY,
        userIdsToRemove
      )
      await this.removeFromRedis(
        REDIS_SET_BLACKLIST_SEGMENTCID_KEY,
        segmentCIDsToRemove
      )
    } catch (e) {
      throw new Error(`Failed to remove from blacklist: ${e}`)
    }
  }

  /**
   * Retrieves digital_content objects from specified users
   * @param {int[]} userIdsBlacklist
   */
  static async getDigitalContentsFromUsers(userIdsBlacklist) {
    let digitalContents = []

    if (userIdsBlacklist.length > 0) {
      digitalContents = (
        await models.sequelize.query(
          'select "blockchainId" from "DigitalContents" where "cnodeUserUUID" in (' +
            'select "cnodeUserUUID" from "ColivingUsers" where "blockchainId" in (:userIdsBlacklist)' +
            ');',
          { replacements: { userIdsBlacklist } }
        )
      )[0]
    }
    return digitalContents
  }

  /**
   * Retrieves all CIDs from input digitalContentIds from db
   * @param {number[]} digitalContentIds
   * @param {Object} transaction sequelize transaction object
   * @returns {Object[]} array of digital_content model objects from table
   */
  static async getAllCIDsFromDigitalContentIdsInDb(digitalContentIds, transaction) {
    const queryConfig = { where: { blockchainId: digitalContentIds } }
    if (transaction) {
      queryConfig.transaction = transaction
    }

    return models.DigitalContent.findAll(queryConfig)
  }

  /**
   * Retrieves all the deduped CIDs from the params and builds a mapping to <digitalContentId: segments> for explicit digitalContentIds (i.e. digitalContentIds from table, not digitalContents belonging to users).
   * @param {number[]} allDigitalContentIds all the digitalContentIds to find CIDs for (explictly blacklisted digitalContents and digitalContents from blacklisted users)
   * @param {Object} transaction sequelize transaction object
   * @returns {string[]} all CIDs that are blacklisted from input digital_content ids
   */
  static async getCIDsToBlacklist(inputDigitalContentIds, transaction) {
    const digitalContents = await this.getAllCIDsFromDigitalContentIdsInDb(
      inputDigitalContentIds,
      transaction
    )

    const segmentCIDs = new Set()

    // Retrieve CIDs from the digital_content metadata and build mapping of <digitalContentId: segments>
    for (const digital_content of digitalContents) {
      if (!digital_content.metadataJSON || !digital_content.metadataJSON.digital_content_segments) continue

      for (const segment of digital_content.metadataJSON.digital_content_segments) {
        if (!segment.multihash || CID_WHITELIST.has(segment.multihash)) continue

        segmentCIDs.add(segment.multihash)
      }
    }

    // also retrieves the CID's directly from the files table so we get copy320
    if (inputDigitalContentIds.length > 0) {
      const queryConfig = {
        where: {
          digitalContentBlockchainId: inputDigitalContentIds
        }
      }
      if (transaction) {
        queryConfig.transaction = transaction
      }

      const files = await models.File.findAll(queryConfig)

      for (const file of files) {
        if (
          file.type === 'digital_content' ||
          file.type === 'copy320' ||
          !CID_WHITELIST.has(file.multihash)
        ) {
          segmentCIDs.add(file.multihash)
        }
      }
    }

    return [...segmentCIDs]
  }

  static async add({ values, type }) {
    await this.addToDb({ values, type })

    // add to redis
    switch (type) {
      case 'USER':
        // add user ids to redis under userid key + its associated digital_content segments
        await this.fetchCIDsAndAddToRedis({ userIdsToBlacklist: values })
        break
      case 'DIGITAL_CONTENT':
        // add digital_content ids to redis under digitalContentid key + its associated digital_content segments
        await this.fetchCIDsAndAddToRedis({ digitalContentIdsToBlacklist: values })
        break
      case 'CID':
        // add segments to redis under segment key
        await this.fetchCIDsAndAddToRedis({ segmentsToBlacklist: values })
        break
    }
  }

  static async remove({ values, type }) {
    await this.removeFromDb({ values, type })

    switch (type) {
      case 'USER':
        // Remove user ids from redis under userid key + its associated digital_content segments
        await this.fetchCIDsAndRemoveFromRedis({ userIdsToRemove: values })
        break
      case 'DIGITAL_CONTENT':
        // Remove digital_content ids from redis under digitalContentid key + its associated digital_content segments
        await this.fetchCIDsAndRemoveFromRedis({ digitalContentIdsToRemove: values })
        break
      case 'CID':
        // Remove segments from redis under segment key
        await this.fetchCIDsAndRemoveFromRedis({ segmentsToRemove: values })
        break
    }
  }

  /**
   * Adds ids and types as individual entries to ContentBlacklist table
   * @param {number} id user or digital_content id
   * @param {'USER'|'DIGITAL_CONTENT'|'CID'} type
   */
  static async addToDb({ values, type }) {
    try {
      await models.ContentBlacklist.bulkCreate(
        values.map((value) => ({
          value,
          type
        })),
        { ignoreDuplicates: true }
      ) // if dupes found, do not update any columns
    } catch (e) {
      throw new Error(`Error with adding to ContentBlacklist: ${e}`)
    }

    this.log(
      `Sucessfully added entries with type (${type}) and values (${values}) to the ContentBlacklist table!`
    )
    return { type, values }
  }

  /**
   * Removes entry from Contentblacklist table
   * @param {number} id user or digital_content id
   * @param {'USER'|'DIGITAL_CONTENT'|'CID'} type
   */
  static async removeFromDb({ values, type }) {
    let numRowsDestroyed
    try {
      numRowsDestroyed = await models.ContentBlacklist.destroy({
        where: {
          value: { [models.Sequelize.Op.in]: values }, // todo: might need to convert this to string before where clause
          type
        }
      })
    } catch (e) {
      throw new Error(
        `Error with removing entry with type [${type}] and id [${values.toString()}]: ${e}`
      )
    }

    if (numRowsDestroyed > 0) {
      this.logDebug(
        `Removed entry with type [${type}] and values [${values.toString()}] to the ContentBlacklist table!`
      )
      return { type, values }
    }

    this.logDebug(
      `Entry with type [${type}] and id [${values.toString()}] does not exist in ContentBlacklist.`
    )
    return null
  }

  /**
   * Helper function to chunk redis sadd calls. There's a max limit of 1024 * 1024 items
   * so break this up into multiple redis add calls
   * https://github.com/StackExchange/StackExchange.Redis/issues/201
   * @param {string} redisKey key
   * @param {number[] | string[] | Object} data either array of userIds, digitalContentIds, CIDs, or <digitalContentId: [CIDs]>
   */
  static async _addToRedisChunkHelper(redisKey, data) {
    const redisAddMaxItemsSize = 100000
    try {
      this.logDebug(
        `About to call _addToRedisChunkHelper for ${redisKey} with data of length ${data.length}`
      )
      for (let i = 0; i < data.length; i += redisAddMaxItemsSize) {
        await redis.sadd(redisKey, data.slice(i, i + redisAddMaxItemsSize))
      }
    } catch (e) {
      this.logError(
        `Unable to call _addToRedisChunkHelper for ${redisKey}: ${e.message}`
      )
    }
  }

  /**
   * Adds key with value to redis.
   * @param {string} redisKey type of value
   * @param {number[] | string[] | Object} data either array of userIds, digitalContentIds, CIDs, or <digitalContentId: [CIDs]>
   * @param {number?} expirationSec number of seconds for entry in redis to expire
   */
  static async addToRedis(redisKey, data, expirationSec = null) {
    switch (redisKey) {
      case REDIS_MAP_DIGITAL_CONTENT_ID_TO_SEGMENTCIDS_KEY: {
        // Add "MAP.DIGITAL_CONTENT_ID.SEGMENTCIDS:::<digitalContentId>" to set of cids into redis
        const errors = []
        for (let [digitalContentId, cids] of Object.entries(data)) {
          digitalContentId = parseInt(digitalContentId)
          const redisDigitalContentIdToCIDsKey = this.getRedisDigitalContentIdToCIDsKey(digitalContentId)
          try {
            await this._addToRedisChunkHelper(redisDigitalContentIdToCIDsKey, cids)
            if (expirationSec) {
              await redis.expire(redisDigitalContentIdToCIDsKey, expirationSec)
            }
          } catch (e) {
            errors.push(
              `Unable to add ${redisDigitalContentIdToCIDsKey}:${digitalContentId}: ${e.toString()}`
            )
          }
        }

        if (errors.length > 0) {
          this.logWarn(errors.toString())
        }
        break
      }
      case REDIS_SET_INVALID_DIGITAL_CONTENT_IDS_KEY:
      case REDIS_SET_BLACKLIST_SEGMENTCID_KEY:
      case REDIS_SET_BLACKLIST_DIGITAL_CONTENT_ID_KEY:
      case REDIS_SET_BLACKLIST_USERID_KEY:
      default: {
        if (!data || data.length === 0) return
        try {
          await this._addToRedisChunkHelper(redisKey, data)
          this.logDebug(`redis set add ${redisKey} successful`)
        } catch (e) {
          throw new Error(`Unable to add ${redisKey}:${data}: ${e.toString()}`)
        }
        break
      }
    }
  }

  /**
   * Removes key with value to redis. If value does not exist, redis should ignore.
   * @param {string} redisKey type of value
   * @param {number[] | string[] | Object} data either array of userIds, digitalContentIds, CIDs, or <digitalContentId: [CIDs]>
   */
  static async removeFromRedis(redisKey, data) {
    switch (redisKey) {
      case REDIS_SET_BLACKLIST_SEGMENTCID_KEY:
      case REDIS_SET_BLACKLIST_DIGITAL_CONTENT_ID_KEY:
      case REDIS_SET_BLACKLIST_USERID_KEY:
      default: {
        if (!data || data.length === 0) return
        try {
          const resp = await redis.srem(redisKey, data)
          this.logDebug(`redis set remove ${redisKey} response ${resp}`)
        } catch (e) {
          throw new Error(
            `Unable to remove ${redisKey}:${data}: ${e.toString()}`
          )
        }
        break
      }
    }
  }

  static async isServable(cid, digitalContentId = null) {
    try {
      // if the digitalContentId is on the blacklist, do not serve
      const digitalContentIdIsInBlacklist =
        digitalContentId && Number.isInteger(digitalContentId)
          ? await this.digitalContentIdIsInBlacklist(digitalContentId)
          : false
      if (digitalContentIdIsInBlacklist) return false

      // If the CID is not in the blacklist, allow serve
      const CIDIsInBlacklist = await this.CIDIsInBlacklist(cid)
      if (!CIDIsInBlacklist) return true

      // If the CID is in the blacklist and an invalid digitalContentId was passed in, do not serve
      // Also, if the CID is not of digital_content type and is in the blacklist, do not serve anyway
      if (
        !digitalContentId ||
        isNaN(digitalContentId) ||
        digitalContentId < 0 ||
        !Number.isInteger(digitalContentId)
      )
        return false

      digitalContentId = parseInt(digitalContentId)

      // Check to see if CID belongs to input digitalContentId from redis.
      let cidsOfInputDigitalContentId = await this.getAllCIDsFromDigitalContentIdInRedis(digitalContentId)

      // If nothing is found, check redis to see if digital_content is valid.
      // If valid, add the <digitalContentId:[cids]> mapping redis for quick lookup later.
      // Else, add to invalid digitalContentIds set
      if (cidsOfInputDigitalContentId.length === 0) {
        const invalid = await this.digitalContentIdIsInvalid(digitalContentId)

        // If digital_content has been marked as invalid before, do not serve
        if (invalid) {
          return false
        }

        // Check the db for the segments
        const digital_content = (await this.getAllCIDsFromDigitalContentIdsInDb([digitalContentId]))[0]

        // If segments are not found, add to invalid digitalContentIds set
        if (!digital_content) {
          await this.addToRedis(
            REDIS_SET_INVALID_DIGITAL_CONTENT_IDS_KEY,
            [digitalContentId],
            // Set expiry in case digital_content with this digitalContentId eventually gets uploaded to CN
            INVALID_DIGITAL_CONTENT_ID_EXPIRATION_SECONDS
          )
          return false
        }

        if (digital_content.metadataJSON && digital_content.metadataJSON.digital_content_segments) {
          // DigitalContent is found. Add <digitalContentId:[cids]> to redis for quick lookup later
          cidsOfInputDigitalContentId = digital_content.metadataJSON.digital_content_segments.map(
            (s) => s.multihash
          )

          await this.addToRedis(
            REDIS_MAP_DIGITAL_CONTENT_ID_TO_SEGMENTCIDS_KEY,
            { [digitalContentId]: cidsOfInputDigitalContentId },
            SEGMENTCID_TO_DIGITAL_CONTENT_ID_EXPIRATION_SECONDS
          )
        }
      }

      cidsOfInputDigitalContentId = new Set(cidsOfInputDigitalContentId)

      // CID belongs to input digitalContentId and the digital_content is not blacklisted; allow serve.
      if (cidsOfInputDigitalContentId.has(cid)) return true

      // CID does not belong to passed in digitalContentId; do not serve
      return false
    } catch (e) {
      // Error in checking CID. Default to false.
      this.logError(
        `Error in checking if CID=${cid} is servable: ${e.toString()}`
      )
      return false
    }
  }

  static getTypes() {
    return types
  }

  /** Retrieves redis keys */

  static getRedisDigitalContentIdKey() {
    return REDIS_SET_BLACKLIST_DIGITAL_CONTENT_ID_KEY
  }

  static getRedisUserIdKey() {
    return REDIS_SET_BLACKLIST_USERID_KEY
  }

  static getRedisSegmentCIDKey() {
    return REDIS_SET_BLACKLIST_SEGMENTCID_KEY
  }

  static getRedisDigitalContentIdToCIDsKey(digitalContentId) {
    return `${REDIS_MAP_DIGITAL_CONTENT_ID_TO_SEGMENTCIDS_KEY}:::${digitalContentId}`
  }

  static getInvalidDigitalContentIdsKey() {
    return REDIS_SET_INVALID_DIGITAL_CONTENT_IDS_KEY
  }

  /** Checks if userId, digitalContentId, and CID exists in redis  */

  static async userIdIsInBlacklist(userId) {
    return redis.sismember(REDIS_SET_BLACKLIST_USERID_KEY, userId)
  }

  static async digitalContentIdIsInBlacklist(digitalContentId) {
    return redis.sismember(REDIS_SET_BLACKLIST_DIGITAL_CONTENT_ID_KEY, digitalContentId)
  }

  // Checks if the input CID is blacklisted from USER, DIGITAL_CONTENT, or SEGMENT type
  static async CIDIsInBlacklist(cid) {
    return redis.sismember(REDIS_SET_BLACKLIST_SEGMENTCID_KEY, cid)
  }

  // Check if the input CID belongs to the digital_content with the input digitalContentId in redis.
  static async CIDIsInDigitalContentRedis(digitalContentId, cid) {
    const redisKey = this.getRedisDigitalContentIdToCIDsKey(digitalContentId)
    return redis.sismember(redisKey, cid)
  }

  // Check to see if the input digitalContentId is invalid
  static async digitalContentIdIsInvalid(digitalContentId) {
    return redis.sismember(REDIS_SET_INVALID_DIGITAL_CONTENT_IDS_KEY, digitalContentId)
  }

  // Retrieves all CIDs in redis
  static async getAllCIDs() {
    return redis.smembers(REDIS_SET_BLACKLIST_SEGMENTCID_KEY)
  }

  // Retrieves all user ids in redis
  static async getAllUserIds() {
    return redis.smembers(REDIS_SET_BLACKLIST_USERID_KEY)
  }

  // Retrieves all digital_content ids in redis
  static async getAllDigitalContentIds() {
    return redis.smembers(REDIS_SET_BLACKLIST_DIGITAL_CONTENT_ID_KEY)
  }

  static async getAllInvalidDigitalContentIds() {
    return redis.smembers(REDIS_SET_INVALID_DIGITAL_CONTENT_IDS_KEY)
  }

  /**
   * Retrieve all the relevant CIDs from the input digitalContentId in redis.
   * @param {number} digitalContentId
   * @returns {string[]} cids associated with digitalContentId
   */
  static async getAllCIDsFromDigitalContentIdInRedis(digitalContentId) {
    const redisKey = this.getRedisDigitalContentIdToCIDsKey(digitalContentId)
    return redis.smembers(redisKey)
  }

  // Logger wrapper methods

  static logDebug(msg) {
    logger.debug(`BlacklistManager DEBUG: ${msg}`)
  }

  static log(msg) {
    logger.info(`BlacklistManager: ${msg}`)
  }

  static logWarn(msg) {
    logger.warn(`BlacklistManager WARNING: ${msg}`)
  }

  static logError(msg) {
    logger.error(`BlacklistManager ERROR: ${msg}`)
  }
}

module.exports = BlacklistManager
