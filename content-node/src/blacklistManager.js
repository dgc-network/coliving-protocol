const { logger } = require('./logging')
const models = require('./models')
const redis = require('./redis')
const config = require('./config')

const CID_WHITELIST = new Set(config.get('cidWhitelist').split(','))

const REDIS_SET_BLACKLIST_AGREEMENTID_KEY = 'BM.SET.BLACKLIST.AGREEMENTID'
const REDIS_SET_BLACKLIST_USERID_KEY = 'BM.SET.BLACKLIST.USERID'
const REDIS_SET_BLACKLIST_SEGMENTCID_KEY = 'BM.SET.BLACKLIST.SEGMENTCID'
const REDIS_MAP_AGREEMENTID_TO_SEGMENTCIDS_KEY = 'BM.MAP.AGREEMENTID.SEGMENTCIDS'
const REDIS_SET_INVALID_AGREEMENTIDS_KEY = 'BM.SET.INVALID.AGREEMENTIDS'

const SEGMENTCID_TO_AGREEMENTID_EXPIRATION_SECONDS =
  14 /* days */ * 24 /* hours */ * 60 /* minutes */ * 60 /* seconds */
const INVALID_AGREEMENTID_EXPIRATION_SECONDS =
  1 /* hour */ * 60 /* minutes */ * 60 /* seconds */

const PROCESS_AGREEMENTS_BATCH_SIZE = 200

const types = models.ContentBlacklist.Types

class BlacklistManager {
  constructor() {
    this.initialized = false
  }

  static async init() {
    try {
      this.log('Initializing BlacklistManager...')

      const { agreementIdsToBlacklist, userIdsToBlacklist, segmentsToBlacklist } =
        await this.getDataToBlacklist()
      await this.fetchCIDsAndAddToRedis({
        agreementIdsToBlacklist,
        userIdsToBlacklist,
        segmentsToBlacklist
      })

      this.initialized = true

      this.log('Initialized BlacklistManager')
    } catch (e) {
      throw new Error(`Could not init BlacklistManager: ${e.message}`)
    }
  }

  /** Return list of agreementIds, userIds, and CIDs to be blacklisted. */
  static async getDataToBlacklist() {
    // CBL = ContentBlacklist
    const agreementsFromCBL = await models.ContentBlacklist.findAll({
      attributes: ['value'],
      where: {
        type: types.agreement
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
    const agreementIdsToBlacklist = agreementsFromCBL.map((entry) =>
      parseInt(entry.value)
    )

    return { agreementIdsToBlacklist, userIdsToBlacklist, segmentsToBlacklist }
  }

  /**
   * 1. Given agreementIds and userIds to blacklist, fetch all segmentCIDs, and then add the ultimate set of segments to redis.
   * 2. Add the agreementIds and userIds to redis as sets.
   * 3. Create mapping of explicitly blacklisted agreements with the structure <blacklisted-segmentCIDs : set of agreementIds> in redis.
   */
  static async fetchCIDsAndAddToRedis({
    agreementIdsToBlacklist = [],
    userIdsToBlacklist = [],
    segmentsToBlacklist = []
  }) {
    // Get all agreements from users and combine with explicit agreementIds to BL
    const agreementsFromUsers = await this.getAgreementsFromUsers(userIdsToBlacklist)
    const allAgreementIdsToBlacklist = agreementIdsToBlacklist.concat(
      agreementsFromUsers.map((agreement) => agreement.blockchainId)
    )

    // Dedupe agreementIds
    const allAgreementIdsToBlacklistSet = new Set(allAgreementIdsToBlacklist)

    try {
      await this.addToRedis(
        REDIS_SET_BLACKLIST_AGREEMENTID_KEY,
        allAgreementIdsToBlacklist
      )
      await this.addToRedis(REDIS_SET_BLACKLIST_USERID_KEY, userIdsToBlacklist)
      await this.addToRedis(
        REDIS_SET_BLACKLIST_SEGMENTCID_KEY,
        segmentsToBlacklist
      )
    } catch (e) {
      throw new Error(
        `[fetchCIDsAndAddToRedis] - Failed to add agreement ids, user ids, or explicitly blacklisted segments to blacklist: ${e.message}`
      )
    }

    await BlacklistManager.addAggregateCIDsToRedis([
      ...allAgreementIdsToBlacklistSet
    ])
  }

  /**
   * Helper method to batch adding CIDs from agreements and users to the blacklist
   * @param {number[]} allAgreementIdsToBlacklist aggregate list of agreement ids to blacklist from explicit agreement id blacklist and agreements from blacklisted users
   */
  static async addAggregateCIDsToRedis(allAgreementIdsToBlacklist) {
    const transaction = await models.sequelize.transaction()

    let i
    for (
      i = 0;
      i < allAgreementIdsToBlacklist.length;
      i = i + PROCESS_AGREEMENTS_BATCH_SIZE
    ) {
      try {
        const agreementsSlice = allAgreementIdsToBlacklist.slice(
          i,
          i + PROCESS_AGREEMENTS_BATCH_SIZE
        )

        this.logDebug(
          `[addAggregateCIDsToRedis] - agreements slice size: ${agreementsSlice.length}`
        )

        const segmentsFromAgreementIdsToBlacklist =
          await BlacklistManager.getCIDsToBlacklist(agreementsSlice, transaction)

        this.logDebug(
          `[addAggregateCIDsToRedis] - number of segments: ${segmentsFromAgreementIdsToBlacklist.length}`
        )

        await BlacklistManager.addToRedis(
          REDIS_SET_BLACKLIST_SEGMENTCID_KEY,
          segmentsFromAgreementIdsToBlacklist
        )
      } catch (e) {
        await transaction.rollback()
        throw new Error(
          `[addAggregateCIDsToRedis] - Could not add agreements slice ${i} to ${
            i + PROCESS_AGREEMENTS_BATCH_SIZE
          }: ${e.message}`
        )
      }
    }

    await transaction.commit()
  }

  /**
   * Given agreementIds and userIds to remove from blacklist, fetch all segmentCIDs.
   * Also remove the agreementIds, userIds, and segmentCIDs from redis blacklist sets to prevent future interaction.
   */
  static async fetchCIDsAndRemoveFromRedis({
    agreementIdsToRemove = [],
    userIdsToRemove = [],
    segmentsToRemove = []
  }) {
    // Get all agreements from users and combine with explicit agreementIds to BL
    const agreementsFromUsers = await this.getAgreementsFromUsers(userIdsToRemove)
    const allAgreementIdsToBlacklist = agreementIdsToRemove.concat(
      agreementsFromUsers.map((agreement) => agreement.blockchainId)
    )

    // Dedupe agreementIds
    const allAgreementIdsToBlacklistSet = new Set(allAgreementIdsToBlacklist)

    // Retrieves CIDs from deduped agreementIds
    const segmentsFromAgreementIds = await this.getCIDsToBlacklist([
      ...allAgreementIdsToBlacklistSet
    ])

    let segmentCIDsToRemove = segmentsFromAgreementIds.concat(segmentsToRemove)
    const segmentCIDsToRemoveSet = new Set(segmentCIDsToRemove)
    segmentCIDsToRemove = [...segmentCIDsToRemoveSet]

    try {
      await this.removeFromRedis(
        REDIS_SET_BLACKLIST_AGREEMENTID_KEY,
        allAgreementIdsToBlacklist
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
   * Retrieves agreement objects from specified users
   * @param {int[]} userIdsBlacklist
   */
  static async getAgreementsFromUsers(userIdsBlacklist) {
    let agreements = []

    if (userIdsBlacklist.length > 0) {
      agreements = (
        await models.sequelize.query(
          'select "blockchainId" from "Agreements" where "cnodeUserUUID" in (' +
            'select "cnodeUserUUID" from "ColivingUsers" where "blockchainId" in (:userIdsBlacklist)' +
            ');',
          { replacements: { userIdsBlacklist } }
        )
      )[0]
    }
    return agreements
  }

  /**
   * Retrieves all CIDs from input agreementIds from db
   * @param {number[]} agreementIds
   * @param {Object} transaction sequelize transaction object
   * @returns {Object[]} array of agreement model objects from table
   */
  static async getAllCIDsFromAgreementIdsInDb(agreementIds, transaction) {
    const queryConfig = { where: { blockchainId: agreementIds } }
    if (transaction) {
      queryConfig.transaction = transaction
    }

    return models.Agreement.findAll(queryConfig)
  }

  /**
   * Retrieves all the deduped CIDs from the params and builds a mapping to <agreementId: segments> for explicit agreementIds (i.e. agreementIds from table, not agreements belonging to users).
   * @param {number[]} allAgreementIds all the agreementIds to find CIDs for (explictly blacklisted agreements and agreements from blacklisted users)
   * @param {Object} transaction sequelize transaction object
   * @returns {string[]} all CIDs that are blacklisted from input agreement ids
   */
  static async getCIDsToBlacklist(inputAgreementIds, transaction) {
    const agreements = await this.getAllCIDsFromAgreementIdsInDb(
      inputAgreementIds,
      transaction
    )

    const segmentCIDs = new Set()

    // Retrieve CIDs from the agreement metadata and build mapping of <agreementId: segments>
    for (const agreement of agreements) {
      if (!agreement.metadataJSON || !agreement.metadataJSON.agreement_segments) continue

      for (const segment of agreement.metadataJSON.agreement_segments) {
        if (!segment.multihash || CID_WHITELIST.has(segment.multihash)) continue

        segmentCIDs.add(segment.multihash)
      }
    }

    // also retrieves the CID's directly from the files table so we get copy320
    if (inputAgreementIds.length > 0) {
      const queryConfig = {
        where: {
          agreementBlockchainId: inputAgreementIds
        }
      }
      if (transaction) {
        queryConfig.transaction = transaction
      }

      const files = await models.File.findAll(queryConfig)

      for (const file of files) {
        if (
          file.type === 'agreement' ||
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
        // add user ids to redis under userid key + its associated agreement segments
        await this.fetchCIDsAndAddToRedis({ userIdsToBlacklist: values })
        break
      case 'AGREEMENT':
        // add agreement ids to redis under agreementid key + its associated agreement segments
        await this.fetchCIDsAndAddToRedis({ agreementIdsToBlacklist: values })
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
        // Remove user ids from redis under userid key + its associated agreement segments
        await this.fetchCIDsAndRemoveFromRedis({ userIdsToRemove: values })
        break
      case 'AGREEMENT':
        // Remove agreement ids from redis under agreementid key + its associated agreement segments
        await this.fetchCIDsAndRemoveFromRedis({ agreementIdsToRemove: values })
        break
      case 'CID':
        // Remove segments from redis under segment key
        await this.fetchCIDsAndRemoveFromRedis({ segmentsToRemove: values })
        break
    }
  }

  /**
   * Adds ids and types as individual entries to ContentBlacklist table
   * @param {number} id user or agreement id
   * @param {'USER'|'AGREEMENT'|'CID'} type
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
   * @param {number} id user or agreement id
   * @param {'USER'|'AGREEMENT'|'CID'} type
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
   * @param {number[] | string[] | Object} data either array of userIds, agreementIds, CIDs, or <agreementId: [CIDs]>
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
   * @param {number[] | string[] | Object} data either array of userIds, agreementIds, CIDs, or <agreementId: [CIDs]>
   * @param {number?} expirationSec number of seconds for entry in redis to expire
   */
  static async addToRedis(redisKey, data, expirationSec = null) {
    switch (redisKey) {
      case REDIS_MAP_AGREEMENTID_TO_SEGMENTCIDS_KEY: {
        // Add "MAP.AGREEMENTID.SEGMENTCIDS:::<agreementId>" to set of cids into redis
        const errors = []
        for (let [agreementId, cids] of Object.entries(data)) {
          agreementId = parseInt(agreementId)
          const redisAgreementIdToCIDsKey = this.getRedisAgreementIdToCIDsKey(agreementId)
          try {
            await this._addToRedisChunkHelper(redisAgreementIdToCIDsKey, cids)
            if (expirationSec) {
              await redis.expire(redisAgreementIdToCIDsKey, expirationSec)
            }
          } catch (e) {
            errors.push(
              `Unable to add ${redisAgreementIdToCIDsKey}:${agreementId}: ${e.toString()}`
            )
          }
        }

        if (errors.length > 0) {
          this.logWarn(errors.toString())
        }
        break
      }
      case REDIS_SET_INVALID_AGREEMENTIDS_KEY:
      case REDIS_SET_BLACKLIST_SEGMENTCID_KEY:
      case REDIS_SET_BLACKLIST_AGREEMENTID_KEY:
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
   * @param {number[] | string[] | Object} data either array of userIds, agreementIds, CIDs, or <agreementId: [CIDs]>
   */
  static async removeFromRedis(redisKey, data) {
    switch (redisKey) {
      case REDIS_SET_BLACKLIST_SEGMENTCID_KEY:
      case REDIS_SET_BLACKLIST_AGREEMENTID_KEY:
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

  static async isServable(cid, agreementId = null) {
    try {
      // if the agreementId is on the blacklist, do not serve
      const agreementIdIsInBlacklist =
        agreementId && Number.isInteger(agreementId)
          ? await this.agreementIdIsInBlacklist(agreementId)
          : false
      if (agreementIdIsInBlacklist) return false

      // If the CID is not in the blacklist, allow serve
      const CIDIsInBlacklist = await this.CIDIsInBlacklist(cid)
      if (!CIDIsInBlacklist) return true

      // If the CID is in the blacklist and an invalid agreementId was passed in, do not serve
      // Also, if the CID is not of agreement type and is in the blacklist, do not serve anyway
      if (
        !agreementId ||
        isNaN(agreementId) ||
        agreementId < 0 ||
        !Number.isInteger(agreementId)
      )
        return false

      agreementId = parseInt(agreementId)

      // Check to see if CID belongs to input agreementId from redis.
      let cidsOfInputAgreementId = await this.getAllCIDsFromAgreementIdInRedis(agreementId)

      // If nothing is found, check redis to see if agreement is valid.
      // If valid, add the <agreementId:[cids]> mapping redis for quick lookup later.
      // Else, add to invalid agreementIds set
      if (cidsOfInputAgreementId.length === 0) {
        const invalid = await this.agreementIdIsInvalid(agreementId)

        // If agreement has been marked as invalid before, do not serve
        if (invalid) {
          return false
        }

        // Check the db for the segments
        const agreement = (await this.getAllCIDsFromAgreementIdsInDb([agreementId]))[0]

        // If segments are not found, add to invalid agreementIds set
        if (!agreement) {
          await this.addToRedis(
            REDIS_SET_INVALID_AGREEMENTIDS_KEY,
            [agreementId],
            // Set expiry in case agreement with this agreementId eventually gets uploaded to CN
            INVALID_AGREEMENTID_EXPIRATION_SECONDS
          )
          return false
        }

        if (agreement.metadataJSON && agreement.metadataJSON.agreement_segments) {
          // Agreement is found. Add <agreementId:[cids]> to redis for quick lookup later
          cidsOfInputAgreementId = agreement.metadataJSON.agreement_segments.map(
            (s) => s.multihash
          )

          await this.addToRedis(
            REDIS_MAP_AGREEMENTID_TO_SEGMENTCIDS_KEY,
            { [agreementId]: cidsOfInputAgreementId },
            SEGMENTCID_TO_AGREEMENTID_EXPIRATION_SECONDS
          )
        }
      }

      cidsOfInputAgreementId = new Set(cidsOfInputAgreementId)

      // CID belongs to input agreementId and the agreement is not blacklisted; allow serve.
      if (cidsOfInputAgreementId.has(cid)) return true

      // CID does not belong to passed in agreementId; do not serve
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

  static getRedisAgreementIdKey() {
    return REDIS_SET_BLACKLIST_AGREEMENTID_KEY
  }

  static getRedisUserIdKey() {
    return REDIS_SET_BLACKLIST_USERID_KEY
  }

  static getRedisSegmentCIDKey() {
    return REDIS_SET_BLACKLIST_SEGMENTCID_KEY
  }

  static getRedisAgreementIdToCIDsKey(agreementId) {
    return `${REDIS_MAP_AGREEMENTID_TO_SEGMENTCIDS_KEY}:::${agreementId}`
  }

  static getInvalidAgreementIdsKey() {
    return REDIS_SET_INVALID_AGREEMENTIDS_KEY
  }

  /** Checks if userId, agreementId, and CID exists in redis  */

  static async userIdIsInBlacklist(userId) {
    return redis.sismember(REDIS_SET_BLACKLIST_USERID_KEY, userId)
  }

  static async agreementIdIsInBlacklist(agreementId) {
    return redis.sismember(REDIS_SET_BLACKLIST_AGREEMENTID_KEY, agreementId)
  }

  // Checks if the input CID is blacklisted from USER, AGREEMENT, or SEGMENT type
  static async CIDIsInBlacklist(cid) {
    return redis.sismember(REDIS_SET_BLACKLIST_SEGMENTCID_KEY, cid)
  }

  // Check if the input CID belongs to the agreement with the input agreementId in redis.
  static async CIDIsInAgreementRedis(agreementId, cid) {
    const redisKey = this.getRedisAgreementIdToCIDsKey(agreementId)
    return redis.sismember(redisKey, cid)
  }

  // Check to see if the input agreementId is invalid
  static async agreementIdIsInvalid(agreementId) {
    return redis.sismember(REDIS_SET_INVALID_AGREEMENTIDS_KEY, agreementId)
  }

  // Retrieves all CIDs in redis
  static async getAllCIDs() {
    return redis.smembers(REDIS_SET_BLACKLIST_SEGMENTCID_KEY)
  }

  // Retrieves all user ids in redis
  static async getAllUserIds() {
    return redis.smembers(REDIS_SET_BLACKLIST_USERID_KEY)
  }

  // Retrieves all agreement ids in redis
  static async getAllAgreementIds() {
    return redis.smembers(REDIS_SET_BLACKLIST_AGREEMENTID_KEY)
  }

  static async getAllInvalidAgreementIds() {
    return redis.smembers(REDIS_SET_INVALID_AGREEMENTIDS_KEY)
  }

  /**
   * Retrieve all the relevant CIDs from the input agreementId in redis.
   * @param {number} agreementId
   * @returns {string[]} cids associated with agreementId
   */
  static async getAllCIDsFromAgreementIdInRedis(agreementId) {
    const redisKey = this.getRedisAgreementIdToCIDsKey(agreementId)
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
