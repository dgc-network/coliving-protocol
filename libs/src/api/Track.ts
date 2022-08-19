import type { BaseConstructorArgs } from './base'

import { Base, Services } from './base'
import { CreatorNode } from '../services/creatorNode'
import { Nullable, AgreementMetadata, Utils } from '../utils'
import retry from 'async-retry'
import type { TransactionReceipt } from 'web3-core'

const AGREEMENT_PROPS = [
  'owner_id',
  'title',
  'length',
  'cover_art_sizes',
  'tags',
  'genre',
  'mood',
  'credits_splits',
  'release_date',
  'file_type'
]
const AGREEMENT_REQUIRED_PROPS = ['owner_id', 'title']

type ChainInfo = {
  metadataMultihash: string
  metadataFileUUID: string
  transcodedAgreementUUID: string
}

export class Agreement extends Base {
  constructor(...args: BaseConstructorArgs) {
    super(...args)
    this.getAgreements = this.getAgreements.bind(this)
    this.getAgreementsIncludingUnlisted = this.getAgreementsIncludingUnlisted.bind(this)
    this.getRandomAgreements = this.getRandomAgreements.bind(this)
    this.getStemsForAgreement = this.getStemsForAgreement.bind(this)
    this.getRemixesOfAgreement = this.getRemixesOfAgreement.bind(this)
    this.getRemixAgreementParents = this.getRemixAgreementParents.bind(this)
    this.getSavedAgreements = this.getSavedAgreements.bind(this)
    this.getTrendingAgreements = this.getTrendingAgreements.bind(this)
    this.getAgreementListens = this.getAgreementListens.bind(this)
    this.getSaversForAgreement = this.getSaversForAgreement.bind(this)
    this.getSaversForPlaylist = this.getSaversForPlaylist.bind(this)
    this.getRepostersForAgreement = this.getRepostersForAgreement.bind(this)
    this.getRepostersForPlaylist = this.getRepostersForPlaylist.bind(this)
    this.getListenHistoryAgreements = this.getListenHistoryAgreements.bind(this)
    this.checkIfDownloadAvailable = this.checkIfDownloadAvailable.bind(this)
    this.uploadAgreement = this.uploadAgreement.bind(this)
    this.uploadAgreementContentToCreatorNode =
      this.uploadAgreementContentToCreatorNode.bind(this)
    this.addAgreementsToChainAndCnode = this.addAgreementsToChainAndCnode.bind(this)
    this.updateAgreement = this.updateAgreement.bind(this)
    this.logAgreementListen = this.logAgreementListen.bind(this)
    this.addAgreementRepost = this.addAgreementRepost.bind(this)
    this.deleteAgreementRepost = this.deleteAgreementRepost.bind(this)
    this.addAgreementSave = this.addAgreementSave.bind(this)
    this.deleteAgreementSave = this.deleteAgreementSave.bind(this)
    this.deleteAgreement = this.deleteAgreement.bind(this)
  }
  /* ------- GETTERS ------- */

  /**
   * get agreements with all relevant agreement data
   * can be filtered by providing an integer array of ids
   * @param limit
   * @param offset
   * @param idsArray
   * @param targetUserId the owner of the agreements being queried
   * @param sort a string of form eg. blocknumber:asc,timestamp:desc describing a sort path
   * @param minBlockNumber The min block number
   * @param filterDeleted If set to true filters out deleted agreements
   * @returns Array of agreement metadata Objects
   * additional metadata fields on agreement objects:
   *  {Integer} repost_count - repost count for given agreement
   *  {Integer} save_count - save count for given agreement
   *  {Array} followee_reposts - followees of current user that have reposted given agreement
   *  {Boolean} has_current_user_reposted - has current user reposted given agreement
   *  {Boolean} has_current_user_saved - has current user saved given agreement
   * @example
   * await getAgreements()
   * await getAgreements(100, 0, [3,2,6]) - Invalid agreement ids will not be accepted
   */
  async getAgreements(
    limit = 100,
    offset = 0,
    idsArray: Nullable<string[]> = null,
    targetUserId: Nullable<string> = null,
    sort: Nullable<boolean> = null,
    minBlockNumber: Nullable<number> = null,
    filterDeleted: Nullable<boolean> = null,
    withUsers = false
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getAgreements(
      limit,
      offset,
      idsArray,
      targetUserId,
      sort,
      minBlockNumber,
      filterDeleted,
      withUsers
    )
  }

  /**
   * Gets agreements by their slug and owner handle
   * @param handle the owner's handle
   * @param slug the agreement's slug, including collision identifiers
   */
  async getAgreementsByHandleAndSlug(handle: string, slug: string) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getAgreementsByHandleAndSlug(handle, slug)
  }

  /**
   * gets all agreements matching identifiers, including unlisted.
   */
  async getAgreementsIncludingUnlisted(identifiers: string[], withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getAgreementsIncludingUnlisted(
      identifiers,
      withUsers
    )
  }

  /**
   * Gets random agreements from trending agreements for a given genre.
   * If genre not given, will return trending agreements across all genres.
   * Excludes specified agreement ids.
   */
  async getRandomAgreements(
    genre: string,
    limit: number,
    exclusionList: number[],
    time: string
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getRandomAgreements(
      genre,
      limit,
      exclusionList,
      time
    )
  }

  /**
   * Gets all stems for a given agreementId as an array of agreements.
   */
  async getStemsForAgreement(agreementId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getStemsForAgreement(agreementId)
  }

  /**
   * Gets all the remixes of a given agreementId as an array of agreements.
   */
  async getRemixesOfAgreement(
    agreementId: number,
    limit: Nullable<number> = null,
    offset: Nullable<number> = null
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getRemixesOfAgreement(
      agreementId,
      limit,
      offset
    )
  }

  /**
   * Gets the remix parents of a given agreementId as an array of agreements.
   */
  async getRemixAgreementParents(
    agreementId: number,
    limit: Nullable<number> = null,
    offset: Nullable<number> = null
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getRemixAgreementParents(
      agreementId,
      limit,
      offset
    )
  }

  /**
   * Return saved agreements for current user
   * NOTE in returned JSON, SaveType string one of agreement, playlist, album
   */
  async getSavedAgreements(limit = 100, offset = 0, withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getSavedAgreements(limit, offset, withUsers)
  }

  /**
   * Gets agreements trending on Coliving.
   */
  async getTrendingAgreements(
    genre: Nullable<string> = null,
    time: Nullable<string> = null,
    idsArray: Nullable<number[]> = null,
    limit: Nullable<number> = null,
    offset: Nullable<number> = null
  ) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    return await this.discoveryProvider.getTrendingAgreements(
      genre,
      time,
      idsArray,
      limit,
      offset
    )
  }

  /**
   * Gets listens for agreements bucketted by timeFrame.
   */
  async getAgreementListens(
    timeFrame = null,
    idsArray = null,
    startTime = null,
    endTime = null,
    limit = null,
    offset = null
  ) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    return await this.identityService.getAgreementListens(
      timeFrame,
      idsArray,
      startTime,
      endTime,
      limit,
      offset
    )
  }

  /**
   * get users that saved saveAgreementId, sorted by follower count descending
   * additional metadata fields on user objects:
   *  {Integer} follower_count - follower count of given user
   * @example
   * getSaversForAgreement(100, 0, 1) - ID must be valid
   */
  async getSaversForAgreement(limit = 100, offset = 0, saveAgreementId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getSaversForAgreement(
      limit,
      offset,
      saveAgreementId
    )
  }

  /**
   * get users that saved savePlaylistId, sorted by follower count descending
   * additional metadata fields on user objects:
   *  {Integer} follower_count - follower count of given user
   * @example
   * getSaversForPlaylist(100, 0, 1) - ID must be valid
   */
  async getSaversForPlaylist(limit = 100, offset = 0, savePlaylistId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getSaversForPlaylist(
      limit,
      offset,
      savePlaylistId
    )
  }

  /**
   * get users that reposted repostAgreementId, sorted by follower count descending
   * additional metadata fields on user objects:
   *  {Integer} follower_count - follower count of given user
   * @example
   * getRepostersForAgreement(100, 0, 1) - ID must be valid
   */
  async getRepostersForAgreement(limit = 100, offset = 0, repostAgreementId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getRepostersForAgreement(
      limit,
      offset,
      repostAgreementId
    )
  }

  /**
   * get users that reposted repostPlaylistId, sorted by follower count descending
   * additional metadata fields on user objects:
   *  {Integer} follower_count - follower count of given user
   * @example
   * getRepostersForPlaylist(100, 0, 1) - ID must be valid
   */
  async getRepostersForPlaylist(
    limit = 100,
    offset = 0,
    repostPlaylistId: number
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getRepostersForPlaylist(
      limit,
      offset,
      repostPlaylistId
    )
  }

  /**
   * Return saved agreements for current user
   * NOTE in returned JSON, SaveType string one of agreement, playlist, album
   */
  async getListenHistoryAgreements(limit = 100, offset = 0) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    const userId = this.userStateManager.getCurrentUserId()
    return await this.identityService.getListenHistoryAgreements(
      userId!,
      limit,
      offset
    )
  }

  /**
   * Checks if a download is available from provided creator node endpoints
   */
  async checkIfDownloadAvailable(
    contentNodeEndpoints: string,
    agreementId: number
  ) {
    return await CreatorNode.checkIfDownloadAvailable(
      contentNodeEndpoints,
      agreementId
    )
  }

  /* ------- SETTERS ------- */

  /**
   * Takes in a readable stream if isServer is true, or a file reference if isServer is
   * false.
   * Uploads file, retrieves multihash, adds multihash to input metadata object,
   * uploads metadata, and finally returns metadata multihash
   * Wraps the stateless function in ColivingLib.
   *
   * @param agreementFile ReadableStream from server, or File handle on client
   * @param coverArtFile ReadableStream from server, or File handle on client
   * @param metadata json of the agreement metadata with all fields, missing fields will error
   * @param onProgress callback fired with (loaded, total) on byte upload progress
   */
  async uploadAgreement(
    agreementFile: File,
    coverArtFile: File,
    metadata: AgreementMetadata,
    onProgress: () => void
  ) {
    this.REQUIRES(Services.CREATOR_NODE)
    this.FILE_IS_VALID(agreementFile)

    const phases = {
      GETTING_USER: 'GETTING_USER',
      UPLOADING_AGREEMENT_CONTENT: 'UPLOADING_AGREEMENT_CONTENT',
      ADDING_AGREEMENT: 'ADDING_AGREEMENT',
      ASSOCIATING_AGREEMENT: 'ASSOCIATING_AGREEMENT'
    }

    let phase = phases.GETTING_USER

    try {
      if (coverArtFile) this.FILE_IS_VALID(coverArtFile)

      this.IS_OBJECT(metadata)

      const ownerId = this.userStateManager.getCurrentUserId()
      if (!ownerId) {
        return {
          error: 'No users loaded for this wallet',
          phase
        }
      }

      metadata.owner_id = ownerId
      this._validateAgreementMetadata(metadata)

      phase = phases.UPLOADING_AGREEMENT_CONTENT

      // Upload metadata
      const {
        metadataMultihash,
        metadataFileUUID,
        transcodedAgreementUUID,
        transcodedAgreementCID
      } = await retry(
        async () => {
          return await this.creatorNode.uploadAgreementContent(
            agreementFile,
            coverArtFile,
            metadata,
            onProgress
          )
        },
        {
          // Retry function 3x
          // 1st retry delay = 500ms, 2nd = 1500ms, 3rd...nth retry = 4000 ms (capped)
          minTimeout: 500,
          maxTimeout: 4000,
          factor: 3,
          retries: 3,
          onRetry: (err) => {
            if (err) {
              console.log('uploadAgreementContent retry error: ', err)
            }
          }
        }
      )

      phase = phases.ADDING_AGREEMENT

      // Write metadata to chain
      const multihashDecoded = Utils.decodeMultihash(metadataMultihash)
      const { txReceipt, agreementId } =
        await this.contracts.AgreementFactoryClient.addAgreement(
          ownerId,
          multihashDecoded.digest,
          multihashDecoded.hashFn,
          multihashDecoded.size
        )

      phase = phases.ASSOCIATING_AGREEMENT
      // Associate the agreement id with the file metadata and block number
      await this.creatorNode.associateAgreement(
        agreementId,
        metadataFileUUID,
        txReceipt.blockNumber,
        transcodedAgreementUUID
      )
      return {
        blockHash: txReceipt.blockHash,
        blockNumber: txReceipt.blockNumber,
        agreementId,
        transcodedAgreementCID,
        error: false
      }
    } catch (e) {
      return {
        error: (e as Error).message,
        phase
      }
    }
  }

  /**
   * Takes in a readable stream if isServer is true, or a file reference if isServer is
   * false.
   * WARNING: Uploads file to creator node, but does not call contracts
   * Please pair this with the addAgreementsToChainAndCnode
   */
  async uploadAgreementContentToCreatorNode(
    agreementFile: File,
    coverArtFile: File,
    metadata: AgreementMetadata,
    onProgress: () => void
  ) {
    this.REQUIRES(Services.CREATOR_NODE)
    this.FILE_IS_VALID(agreementFile)

    if (coverArtFile) this.FILE_IS_VALID(coverArtFile)

    this.IS_OBJECT(metadata)

    const ownerId = this.userStateManager.getCurrentUserId()
    if (!ownerId) {
      throw new Error('No users loaded for this wallet')
    }

    metadata.owner_id = ownerId
    this._validateAgreementMetadata(metadata)

    // Upload metadata
    const {
      metadataMultihash,
      metadataFileUUID,
      transcodedAgreementCID,
      transcodedAgreementUUID
    } = await retry(
      async () => {
        return await this.creatorNode.uploadAgreementContent(
          agreementFile,
          coverArtFile,
          metadata,
          onProgress
        )
      },
      {
        // Retry function 3x
        // 1st retry delay = 500ms, 2nd = 1500ms, 3rd...nth retry = 4000 ms (capped)
        minTimeout: 500,
        maxTimeout: 4000,
        factor: 3,
        retries: 3,
        onRetry: (err) => {
          if (err) {
            console.log('uploadAgreementContentToCreatorNode retry error: ', err)
          }
        }
      }
    )
    return {
      metadataMultihash,
      metadataFileUUID,
      transcodedAgreementCID,
      transcodedAgreementUUID
    }
  }

  /**
   * Takes an array of [{metadataMultihash, metadataFileUUID}, {}, ]
   * Adds agreements to chain for this user
   * Associates agreements with user on creatorNode
   */
  async addAgreementsToChainAndCnode(agreementMultihashAndUUIDList: ChainInfo[]) {
    this.REQUIRES(Services.CREATOR_NODE)
    const ownerId = this.userStateManager.getCurrentUserId()
    if (!ownerId) {
      throw new Error('No users loaded for this wallet')
    }

    const addedToChain: Array<
      Omit<ChainInfo, 'metadataMultihash'> & {
        agreementId: number
        txReceipt: TransactionReceipt
      }
    > = []
    let requestFailed = false
    await Promise.all(
      agreementMultihashAndUUIDList.map(async (agreementInfo, i) => {
        try {
          const { metadataMultihash, metadataFileUUID, transcodedAgreementUUID } =
            agreementInfo

          // Write metadata to chain
          const multihashDecoded = Utils.decodeMultihash(metadataMultihash)
          const { txReceipt, agreementId } =
            await this.contracts.AgreementFactoryClient.addAgreement(
              ownerId,
              multihashDecoded.digest,
              multihashDecoded.hashFn,
              multihashDecoded.size
            )

          addedToChain[i] = {
            agreementId,
            metadataFileUUID,
            transcodedAgreementUUID,
            txReceipt
          }
        } catch (e) {
          requestFailed = true
          console.error(e)
        }
      })
    )

    // Any failures in addAgreement to the blockchain will prevent further progress
    // The list of successful agreement uploads is returned for revert operations by caller
    if (
      requestFailed ||
      addedToChain.filter(Boolean).length !== agreementMultihashAndUUIDList.length
    ) {
      return {
        error: true,
        agreementIds: addedToChain.filter(Boolean).map((x) => x.agreementId)
      }
    }

    const associatedWithCreatorNode = []
    try {
      await Promise.all(
        addedToChain.map(async (chainAgreementInfo) => {
          const metadataFileUUID = chainAgreementInfo.metadataFileUUID
          const transcodedAgreementUUID = chainAgreementInfo.transcodedAgreementUUID
          const agreementId = chainAgreementInfo.agreementId
          await this.creatorNode.associateAgreement(
            agreementId,
            metadataFileUUID,
            chainAgreementInfo.txReceipt.blockNumber,
            transcodedAgreementUUID
          )
          associatedWithCreatorNode.push(agreementId)
        })
      )
    } catch (e) {
      // Any single failure to associate also prevents further progress
      // Returning error code along with associated agreement ids allows caller to revert
      return { error: true, agreementIds: addedToChain.map((x) => x.agreementId) }
    }

    return { error: false, agreementIds: addedToChain.map((x) => x.agreementId) }
  }

  /**
   * Updates an existing agreement given metadata. This function expects that all associated files
   * such as agreement content, cover art are already on creator node.
   * @param metadata json of the agreement metadata with all fields, missing fields will error
   */
  async updateAgreement(metadata: AgreementMetadata) {
    this.REQUIRES(Services.CREATOR_NODE)
    this.IS_OBJECT(metadata)

    const ownerId = this.userStateManager.getCurrentUserId()

    if (!ownerId) {
      throw new Error('No users loaded for this wallet')
    }
    metadata.owner_id = ownerId
    this._validateAgreementMetadata(metadata)

    // Upload new metadata
    const { metadataMultihash, metadataFileUUID } =
      await this.creatorNode.uploadAgreementMetadata(metadata)
    // Write the new metadata to chain
    const multihashDecoded = Utils.decodeMultihash(metadataMultihash)
    const agreementId = metadata.agreement_id
    const { txReceipt } = await this.contracts.AgreementFactoryClient.updateAgreement(
      agreementId,
      ownerId,
      multihashDecoded.digest,
      multihashDecoded.hashFn,
      multihashDecoded.size
    )
    // Re-associate the agreement id with the new metadata
    await this.creatorNode.associateAgreement(
      agreementId,
      metadataFileUUID,
      txReceipt.blockNumber
    )
    return {
      blockHash: txReceipt.blockHash,
      blockNumber: txReceipt.blockNumber,
      agreementId
    }
  }

  /**
   * Logs a agreement listen for a given user id.
   * @param unauthUuid account for those not logged in
   * @param agreementId listened to
   */
  async logAgreementListen(
    agreementId: number,
    unauthUuid: number,
    solanaListen = false
  ) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    const accountId = this.userStateManager.getCurrentUserId()

    const userId = accountId ?? unauthUuid
    return await this.identityService.logAgreementListen(
      agreementId,
      userId,
      null,
      null,
      solanaListen
    )
  }

  /** Adds a repost for a given user and agreement
   * @param agreementId agreement being reposted
   */
  async addAgreementRepost(agreementId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.SocialFeatureFactoryClient.addAgreementRepost(
      userId!,
      agreementId
    )
  }

  /**
   * Deletes a repost for a given user and agreement
   * @param agreement id of deleted repost
   */
  async deleteAgreementRepost(agreementId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.SocialFeatureFactoryClient.deleteAgreementRepost(
      userId!,
      agreementId
    )
  }

  /**
   * Adds a rack save for a given user and agreement
   * @param agreementId agreement being saved
   */
  async addAgreementSave(agreementId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.UserLibraryFactoryClient.addAgreementSave(
      userId!,
      agreementId
    )
  }

  /**
   * Delete a agreement save for a given user and agreement
   * @param agreementId save being removed
   */
  async deleteAgreementSave(agreementId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.UserLibraryFactoryClient.deleteAgreementSave(
      userId!,
      agreementId
    )
  }

  /**
   * Marks a agreements as deleted
   * @param agreementId
   */
  async deleteAgreement(agreementId: number) {
    return await this.contracts.AgreementFactoryClient.deleteAgreement(agreementId)
  }

  /* ------- PRIVATE  ------- */

  _validateAgreementMetadata(metadata: AgreementMetadata) {
    this.OBJECT_HAS_PROPS(metadata, AGREEMENT_PROPS, AGREEMENT_REQUIRED_PROPS)
  }
}
