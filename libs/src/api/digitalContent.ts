import type { BaseConstructorArgs } from './base'

import { Base, Services } from './base'
import { ContentNode } from '../services/contentNode'
import { Nullable, DigitalContentMetadata, Utils } from '../utils'
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
  transcodedDigitalContentUUID: string
}

export class DigitalContent extends Base {
  constructor(...args: BaseConstructorArgs) {
    super(...args)
    this.getDigitalContents = this.getDigitalContents.bind(this)
    this.getDigitalContentsIncludingUnlisted = this.getDigitalContentsIncludingUnlisted.bind(this)
    this.getRandomDigitalContents = this.getRandomDigitalContents.bind(this)
    this.getStemsForDigitalContent = this.getStemsForDigitalContent.bind(this)
    this.getRemixesOfDigitalContent = this.getRemixesOfDigitalContent.bind(this)
    this.getRemixDigitalContentParents = this.getRemixDigitalContentParents.bind(this)
    this.getSavedDigitalContents = this.getSavedDigitalContents.bind(this)
    this.getTrendingDigitalContents = this.getTrendingDigitalContents.bind(this)
    this.getDigitalContentListens = this.getDigitalContentListens.bind(this)
    this.getSaversForDigitalContent = this.getSaversForDigitalContent.bind(this)
    this.getSaversForContentList = this.getSaversForContentList.bind(this)
    this.getRepostersForDigitalContent = this.getRepostersForDigitalContent.bind(this)
    this.getRepostersForContentList = this.getRepostersForContentList.bind(this)
    this.getListenHistoryDigitalContents = this.getListenHistoryDigitalContents.bind(this)
    this.checkIfDownloadAvailable = this.checkIfDownloadAvailable.bind(this)
    this.uploadDigitalContent = this.uploadDigitalContent.bind(this)
    this.uploadDigitalContentContentToContentNode =
      this.uploadDigitalContentContentToContentNode.bind(this)
    this.addDigitalContentsToChainAndCnode = this.addDigitalContentsToChainAndCnode.bind(this)
    this.updateDigitalContent = this.updateDigitalContent.bind(this)
    this.logDigitalContentListen = this.logDigitalContentListen.bind(this)
    this.addDigitalContentRepost = this.addDigitalContentRepost.bind(this)
    this.deleteDigitalContentRepost = this.deleteDigitalContentRepost.bind(this)
    this.addDigitalContentSave = this.addDigitalContentSave.bind(this)
    this.deleteDigitalContentSave = this.deleteDigitalContentSave.bind(this)
    this.deleteDigitalContent = this.deleteDigitalContent.bind(this)
  }
  /* ------- GETTERS ------- */

  /**
   * get digitalContents with all relevant digital_content data
   * can be filtered by providing an integer array of ids
   * @param limit
   * @param offset
   * @param idsArray
   * @param targetUserId the owner of the digitalContents being queried
   * @param sort a string of form eg. blocknumber:asc,timestamp:desc describing a sort path
   * @param minBlockNumber The min block number
   * @param filterDeleted If set to true filters out deleted digitalContents
   * @returns Array of digital_content metadata Objects
   * additional metadata fields on digital_content objects:
   *  {Integer} repost_count - repost count for given digital_content
   *  {Integer} save_count - save count for given digital_content
   *  {Array} followee_reposts - followees of current user that have reposted given digital_content
   *  {Boolean} has_current_user_reposted - has current user reposted given digital_content
   *  {Boolean} has_current_user_saved - has current user saved given digital_content
   * @example
   * await getDigitalContents()
   * await getDigitalContents(100, 0, [3,2,6]) - Invalid digital_content ids will not be accepted
   */
  async getDigitalContents(
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
    return await this.discoveryNode.getDigitalContents(
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
   * Gets digitalContents by their slug and owner handle
   * @param handle the owner's handle
   * @param slug the digital_content's slug, including collision identifiers
   */
  async getDigitalContentsByHandleAndSlug(handle: string, slug: string) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getDigitalContentsByHandleAndSlug(handle, slug)
  }

  /**
   * gets all digitalContents matching identifiers, including unlisted.
   */
  async getDigitalContentsIncludingUnlisted(identifiers: string[], withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getDigitalContentsIncludingUnlisted(
      identifiers,
      withUsers
    )
  }

  /**
   * Gets random digitalContents from trending digitalContents for a given genre.
   * If genre not given, will return trending digitalContents across all genres.
   * Excludes specified digital_content ids.
   */
  async getRandomDigitalContents(
    genre: string,
    limit: number,
    exclusionList: number[],
    time: string
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getRandomDigitalContents(
      genre,
      limit,
      exclusionList,
      time
    )
  }

  /**
   * Gets all stems for a given digitalContentId as an array of digitalContents.
   */
  async getStemsForDigitalContent(digitalContentId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getStemsForDigitalContent(digitalContentId)
  }

  /**
   * Gets all the remixes of a given digitalContentId as an array of digitalContents.
   */
  async getRemixesOfDigitalContent(
    digitalContentId: number,
    limit: Nullable<number> = null,
    offset: Nullable<number> = null
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getRemixesOfDigitalContent(
      digitalContentId,
      limit,
      offset
    )
  }

  /**
   * Gets the remix parents of a given digitalContentId as an array of digitalContents.
   */
  async getRemixDigitalContentParents(
    digitalContentId: number,
    limit: Nullable<number> = null,
    offset: Nullable<number> = null
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getRemixDigitalContentParents(
      digitalContentId,
      limit,
      offset
    )
  }

  /**
   * Return saved digitalContents for current user
   * NOTE in returned JSON, SaveType string one of digital_content, contentList, album
   */
  async getSavedDigitalContents(limit = 100, offset = 0, withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getSavedDigitalContents(limit, offset, withUsers)
  }

  /**
   * Gets digitalContents trending on Coliving.
   */
  async getTrendingDigitalContents(
    genre: Nullable<string> = null,
    time: Nullable<string> = null,
    idsArray: Nullable<number[]> = null,
    limit: Nullable<number> = null,
    offset: Nullable<number> = null
  ) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    return await this.discoveryNode.getTrendingDigitalContents(
      genre,
      time,
      idsArray,
      limit,
      offset
    )
  }

  /**
   * Gets listens for digitalContents bucketted by timeFrame.
   */
  async getDigitalContentListens(
    timeFrame = null,
    idsArray = null,
    startTime = null,
    endTime = null,
    limit = null,
    offset = null
  ) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    return await this.identityService.getDigitalContentListens(
      timeFrame,
      idsArray,
      startTime,
      endTime,
      limit,
      offset
    )
  }

  /**
   * get users that saved saveDigitalContentId, sorted by follower count descending
   * additional metadata fields on user objects:
   *  {Integer} follower_count - follower count of given user
   * @example
   * getSaversForDigitalContent(100, 0, 1) - ID must be valid
   */
  async getSaversForDigitalContent(limit = 100, offset = 0, saveDigitalContentId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getSaversForDigitalContent(
      limit,
      offset,
      saveDigitalContentId
    )
  }

  /**
   * get users that saved saveContentListId, sorted by follower count descending
   * additional metadata fields on user objects:
   *  {Integer} follower_count - follower count of given user
   * @example
   * getSaversForContentList(100, 0, 1) - ID must be valid
   */
  async getSaversForContentList(limit = 100, offset = 0, saveContentListId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getSaversForContentList(
      limit,
      offset,
      saveContentListId
    )
  }

  /**
   * get users that reposted repostDigitalContentId, sorted by follower count descending
   * additional metadata fields on user objects:
   *  {Integer} follower_count - follower count of given user
   * @example
   * getRepostersForDigitalContent(100, 0, 1) - ID must be valid
   */
  async getRepostersForDigitalContent(limit = 100, offset = 0, repostDigitalContentId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getRepostersForDigitalContent(
      limit,
      offset,
      repostDigitalContentId
    )
  }

  /**
   * get users that reposted repostContentListId, sorted by follower count descending
   * additional metadata fields on user objects:
   *  {Integer} follower_count - follower count of given user
   * @example
   * getRepostersForContentList(100, 0, 1) - ID must be valid
   */
  async getRepostersForContentList(
    limit = 100,
    offset = 0,
    repostContentListId: number
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getRepostersForContentList(
      limit,
      offset,
      repostContentListId
    )
  }

  /**
   * Return saved digitalContents for current user
   * NOTE in returned JSON, SaveType string one of digital_content, contentList, album
   */
  async getListenHistoryDigitalContents(limit = 100, offset = 0) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    const userId = this.userStateManager.getCurrentUserId()
    return await this.identityService.getListenHistoryDigitalContents(
      userId!,
      limit,
      offset
    )
  }

  /**
   * Checks if a download is available from provided content node endpoints
   */
  async checkIfDownloadAvailable(
    contentNodeEndpoints: string,
    digitalContentId: number
  ) {
    return await ContentNode.checkIfDownloadAvailable(
      contentNodeEndpoints,
      digitalContentId
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
   * @param digitalContentFile ReadableStream from server, or File handle on client
   * @param coverArtFile ReadableStream from server, or File handle on client
   * @param metadata json of the digital_content metadata with all fields, missing fields will error
   * @param onProgress callback fired with (loaded, total) on byte upload progress
   */
  async uploadDigitalContent(
    digitalContentFile: File,
    coverArtFile: File,
    metadata: DigitalContentMetadata,
    onProgress: () => void
  ) {
    this.REQUIRES(Services.CONTENT_NODE)
    this.FILE_IS_VALID(digitalContentFile)

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
      this._validateDigitalContentMetadata(metadata)

      phase = phases.UPLOADING_AGREEMENT_CONTENT

      // Upload metadata
      const {
        metadataMultihash,
        metadataFileUUID,
        transcodedDigitalContentUUID,
        transcodedDigitalContentCID
      } = await retry(
        async () => {
          return await this.contentNode.uploadDigitalContentContent(
            digitalContentFile,
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
              console.log('uploadDigitalContentContent retry error: ', err)
            }
          }
        }
      )

      phase = phases.ADDING_AGREEMENT

      // Write metadata to chain
      const multihashDecoded = Utils.decodeMultihash(metadataMultihash)
      const { txReceipt, digitalContentId } =
        await this.contracts.DigitalContentFactoryClient.addDigitalContent(
          ownerId,
          multihashDecoded.digest,
          multihashDecoded.hashFn,
          multihashDecoded.size
        )

      phase = phases.ASSOCIATING_AGREEMENT
      // Associate the digital_content id with the file metadata and block number
      await this.contentNode.associateDigitalContent(
        digitalContentId,
        metadataFileUUID,
        txReceipt.blockNumber,
        transcodedDigitalContentUUID
      )
      return {
        blockHash: txReceipt.blockHash,
        blockNumber: txReceipt.blockNumber,
        digitalContentId,
        transcodedDigitalContentCID,
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
   * WARNING: Uploads file to content node, but does not call contracts
   * Please pair this with the addDigitalContentsToChainAndCnode
   */
  async uploadDigitalContentContentToContentNode(
    digitalContentFile: File,
    coverArtFile: File,
    metadata: DigitalContentMetadata,
    onProgress: () => void
  ) {
    this.REQUIRES(Services.CONTENT_NODE)
    this.FILE_IS_VALID(digitalContentFile)

    if (coverArtFile) this.FILE_IS_VALID(coverArtFile)

    this.IS_OBJECT(metadata)

    const ownerId = this.userStateManager.getCurrentUserId()
    if (!ownerId) {
      throw new Error('No users loaded for this wallet')
    }

    metadata.owner_id = ownerId
    this._validateDigitalContentMetadata(metadata)

    // Upload metadata
    const {
      metadataMultihash,
      metadataFileUUID,
      transcodedDigitalContentCID,
      transcodedDigitalContentUUID
    } = await retry(
      async () => {
        return await this.contentNode.uploadDigitalContentContent(
          digitalContentFile,
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
            console.log('uploadDigitalContentContentToContentNode retry error: ', err)
          }
        }
      }
    )
    return {
      metadataMultihash,
      metadataFileUUID,
      transcodedDigitalContentCID,
      transcodedDigitalContentUUID
    }
  }

  /**
   * Takes an array of [{metadataMultihash, metadataFileUUID}, {}, ]
   * Adds digitalContents to chain for this user
   * Associates digitalContents with user on contentNode
   */
  async addDigitalContentsToChainAndCnode(digitalContentMultihashAndUUIDList: ChainInfo[]) {
    this.REQUIRES(Services.CONTENT_NODE)
    const ownerId = this.userStateManager.getCurrentUserId()
    if (!ownerId) {
      throw new Error('No users loaded for this wallet')
    }

    const addedToChain: Array<
      Omit<ChainInfo, 'metadataMultihash'> & {
        digitalContentId: number
        txReceipt: TransactionReceipt
      }
    > = []
    let requestFailed = false
    await Promise.all(
      digitalContentMultihashAndUUIDList.map(async (digitalContentInfo, i) => {
        try {
          const { metadataMultihash, metadataFileUUID, transcodedDigitalContentUUID } =
            digitalContentInfo

          // Write metadata to chain
          const multihashDecoded = Utils.decodeMultihash(metadataMultihash)
          const { txReceipt, digitalContentId } =
            await this.contracts.DigitalContentFactoryClient.addDigitalContent(
              ownerId,
              multihashDecoded.digest,
              multihashDecoded.hashFn,
              multihashDecoded.size
            )

          addedToChain[i] = {
            digitalContentId,
            metadataFileUUID,
            transcodedDigitalContentUUID,
            txReceipt
          }
        } catch (e) {
          requestFailed = true
          console.error(e)
        }
      })
    )

    // Any failures in addDigitalContent to the blockchain will prevent further progress
    // The list of successful digital_content uploads is returned for revert operations by caller
    if (
      requestFailed ||
      addedToChain.filter(Boolean).length !== digitalContentMultihashAndUUIDList.length
    ) {
      return {
        error: true,
        digitalContentIds: addedToChain.filter(Boolean).map((x) => x.digitalContentId)
      }
    }

    //const associatedWithContentNode = []
    const associatedWithContentNode : number[] = []
    try {
      await Promise.all(
        addedToChain.map(async (chainDigitalContentInfo) => {
          const metadataFileUUID = chainDigitalContentInfo.metadataFileUUID
          const transcodedDigitalContentUUID = chainDigitalContentInfo.transcodedDigitalContentUUID
          const digitalContentId = chainDigitalContentInfo.digitalContentId
          await this.contentNode.associateDigitalContent(
            digitalContentId,
            metadataFileUUID,
            chainDigitalContentInfo.txReceipt.blockNumber,
            transcodedDigitalContentUUID
          )
          associatedWithContentNode.push(digitalContentId)
        })
      )
    } catch (e) {
      // Any single failure to associate also prevents further progress
      // Returning error code along with associated digital_content ids allows caller to revert
      return { error: true, digitalContentIds: addedToChain.map((x) => x.digitalContentId) }
    }

    return { error: false, digitalContentIds: addedToChain.map((x) => x.digitalContentId) }
  }

  /**
   * Updates an existing digital_content given metadata. This function expects that all associated files
   * such as digital_content content, cover art are already on content node.
   * @param metadata json of the digital_content metadata with all fields, missing fields will error
   */
  async updateDigitalContent(metadata: DigitalContentMetadata) {
    this.REQUIRES(Services.CONTENT_NODE)
    this.IS_OBJECT(metadata)

    const ownerId = this.userStateManager.getCurrentUserId()

    if (!ownerId) {
      throw new Error('No users loaded for this wallet')
    }
    metadata.owner_id = ownerId
    this._validateDigitalContentMetadata(metadata)

    // Upload new metadata
    const { metadataMultihash, metadataFileUUID } =
      await this.contentNode.uploadDigitalContentMetadata(metadata)
    // Write the new metadata to chain
    const multihashDecoded = Utils.decodeMultihash(metadataMultihash)
    const digitalContentId = metadata.digital_content_id
    const { txReceipt } = await this.contracts.DigitalContentFactoryClient.updateDigitalContent(
      digitalContentId,
      ownerId,
      multihashDecoded.digest,
      multihashDecoded.hashFn,
      multihashDecoded.size
    )
    // Re-associate the digital_content id with the new metadata
    await this.contentNode.associateDigitalContent(
      digitalContentId,
      metadataFileUUID,
      txReceipt.blockNumber
    )
    return {
      blockHash: txReceipt.blockHash,
      blockNumber: txReceipt.blockNumber,
      digitalContentId
    }
  }

  /**
   * Logs a digital_content listen for a given user id.
   * @param unauthUuid account for those not logged in
   * @param digitalContentId listened to
   */
  async logDigitalContentListen(
    digitalContentId: number,
    unauthUuid: number,
    solanaListen = false
  ) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    const accountId = this.userStateManager.getCurrentUserId()

    const userId = accountId ?? unauthUuid
    return await this.identityService.logDigitalContentListen(
      digitalContentId,
      userId,
      null,
      null,
      solanaListen
    )
  }

  /** Adds a repost for a given user and digital_content
   * @param digitalContentId digital_content being reposted
   */
  async addDigitalContentRepost(digitalContentId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.SocialFeatureFactoryClient.addDigitalContentRepost(
      userId!,
      digitalContentId
    )
  }

  /**
   * Deletes a repost for a given user and digital_content
   * @param digital_content id of deleted repost
   */
  async deleteDigitalContentRepost(digitalContentId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.SocialFeatureFactoryClient.deleteDigitalContentRepost(
      userId!,
      digitalContentId
    )
  }

  /**
   * Adds a rack save for a given user and digital_content
   * @param digitalContentId digital_content being saved
   */
  async addDigitalContentSave(digitalContentId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.UserLibraryFactoryClient.addDigitalContentSave(
      userId!,
      digitalContentId
    )
  }

  /**
   * Delete a digital_content save for a given user and digital_content
   * @param digitalContentId save being removed
   */
  async deleteDigitalContentSave(digitalContentId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.UserLibraryFactoryClient.deleteDigitalContentSave(
      userId!,
      digitalContentId
    )
  }

  /**
   * Marks a digitalContents as deleted
   * @param digitalContentId
   */
  async deleteDigitalContent(digitalContentId: number) {
    return await this.contracts.DigitalContentFactoryClient.deleteDigitalContent(digitalContentId)
  }

  /* ------- PRIVATE  ------- */

  _validateDigitalContentMetadata(metadata: DigitalContentMetadata) {
    this.OBJECT_HAS_PROPS(metadata, AGREEMENT_PROPS, AGREEMENT_REQUIRED_PROPS)
  }
}
