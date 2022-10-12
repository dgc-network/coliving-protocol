import { Base, BaseConstructorArgs, Services } from './base'
import { Utils } from '../utils'
import type { TransactionReceipt } from 'web3-core'

const MAX_CONTENT_LIST_LENGTH = 200

export class ContentLists extends Base {
  constructor(...args: BaseConstructorArgs) {
    super(...args)
    this.getContentLists = this.getContentLists.bind(this)
    this.getSavedContentLists = this.getSavedContentLists.bind(this)
    this.getSavedAlbums = this.getSavedAlbums.bind(this)
    this.createContentList = this.createContentList.bind(this)
    this.addContentListDigitalContent = this.addContentListDigitalContent.bind(this)
    this.orderContentListDigitalContents = this.orderContentListDigitalContents.bind(this)
    this.validateDigitalContentsInContentList = this.validateDigitalContentsInContentList.bind(this)
    this.uploadContentListCoverPhoto = this.uploadContentListCoverPhoto.bind(this)
    this.updateContentListCoverPhoto = this.updateContentListCoverPhoto.bind(this)
    this.updateContentListName = this.updateContentListName.bind(this)
    this.updateContentListDescription = this.updateContentListDescription.bind(this)
    this.updateContentListPrivacy = this.updateContentListPrivacy.bind(this)
    this.addContentListRepost = this.addContentListRepost.bind(this)
    this.deleteContentListRepost = this.deleteContentListRepost.bind(this)
    this.deleteContentListDigitalContent = this.deleteContentListDigitalContent.bind(this)
    this.addContentListSave = this.addContentListSave.bind(this)
    this.deleteContentListSave = this.deleteContentListSave.bind(this)
    this.deleteContentList = this.deleteContentList.bind(this)
  }

  /* ------- GETTERS ------- */

  /**
   * get full contentList objects, including digitalContents, for passed in array of contentListId
   * @param limit max # of items to return
   * @param offset offset into list to return from (for pagination)
   * @param idsArray list of contentList ids
   * @param targetUserId the user whose contentLists we're trying to get
   * @param withUsers whether to return users nested within the collection objects
   * @returns array of contentList objects
   * additional metadata fields on contentList objects:
   *  {Integer} repost_count - repost count for given contentList
   *  {Integer} save_count - save count for given contentList
   *  {Boolean} has_current_user_reposted - has current user reposted given contentList
   *  {Array} followee_reposts - followees of current user that have reposted given contentList
   *  {Boolean} has_current_user_reposted - has current user reposted given contentList
   *  {Boolean} has_current_user_saved - has current user saved given contentList
   */
  async getContentLists(
    limit = 100,
    offset = 0,
    idsArray = null,
    targetUserId = null,
    withUsers = false
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getContentLists(
      limit,
      offset,
      idsArray,
      targetUserId,
      withUsers
    )
  }

  /**
   * Return saved contentLists for current user
   * NOTE in returned JSON, SaveType string one of digital_content, contentList, album
   * @param limit - max # of items to return
   * @param offset - offset into list to return from (for pagination)
   */
  async getSavedContentLists(limit = 100, offset = 0, withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getSavedContentLists(
      limit,
      offset,
      withUsers
    )
  }

  /**
   * Return saved albums for current user
   * NOTE in returned JSON, SaveType string one of digital_content, contentList, album
   * @param limit - max # of items to return
   * @param offset - offset into list to return from (for pagination)
   */
  async getSavedAlbums(limit = 100, offset = 0, withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryNode.getSavedAlbums(limit, offset, withUsers)
  }

  /* ------- SETTERS ------- */

  /**
   * Creates a new contentList
   */
  async createContentList(
    userId: number,
    contentListName: string,
    isPrivate: boolean,
    isAlbum: boolean,
    digitalContentIds: number[]
  ) {
    const maxInitialDigitalContents = 50
    const createInitialIdsArray = digitalContentIds.slice(0, maxInitialDigitalContents)
    const postInitialIdsArray = digitalContentIds.slice(maxInitialDigitalContents)
    let contentListId: number
    let receipt: Partial<TransactionReceipt> = {}
    try {
      const response =
        await this.contracts.ContentListFactoryClient.createContentList(
          userId,
          contentListName,
          isPrivate,
          isAlbum,
          createInitialIdsArray
        )
      contentListId = response.contentListId
      receipt = response.txReceipt

      // Add remaining digitalContents
      await Promise.all(
        postInitialIdsArray.map(async (digitalContentId) => {
          return await this.contracts.ContentListFactoryClient.addContentListDigitalContent(
            contentListId,
            digitalContentId
          )
        })
      )

      // Order digitalContents
      if (postInitialIdsArray.length > 0) {
        receipt =
          await this.contracts.ContentListFactoryClient.orderContentListDigitalContents(
            contentListId,
            digitalContentIds
          )
      }
    } catch (e) {
      console.debug(
        `Reached libs createContentList catch block with contentList id ${contentListId!}`
      )
      console.error(e)
      return { contentListId: contentListId!, error: true }
    }
    return {
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber,
      contentListId,
      error: false
    }
  }

  /**
   * Adds a digital_content to a given contentList
   */
  async addContentListDigitalContent(contentListId: number, digitalContentId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)

    const userId = this.userStateManager.getCurrentUserId()
    const contentList = await this.discoveryNode.getContentLists(
      100,
      0,
      [contentListId],
      userId
    )

    // error if contentList does not exist or hasn't been indexed by discovery node
    if (!Array.isArray(contentList) || !contentList.length) {
      throw new Error(
        'Cannot add digital_content - ContentList does not exist or has not yet been indexed by discovery node'
      )
    }
    // error if contentList already at max length
    if (
      contentList[0]!.content_list_contents.digital_content_ids.length >= MAX_CONTENT_LIST_LENGTH
    ) {
      throw new Error(
        `Cannot add digital_content - contentList is already at max length of ${MAX_CONTENT_LIST_LENGTH}`
      )
    }
    return await this.contracts.ContentListFactoryClient.addContentListDigitalContent(
      contentListId,
      digitalContentId
    )
  }

  /**
   * Reorders the digitalContents in a contentList
   */
  async orderContentListDigitalContents(
    contentListId: number,
    digitalContentIds: number[],
    retriesOverride?: number
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    if (!Array.isArray(digitalContentIds)) {
      throw new Error('Cannot order contentList - digitalContentIds must be array')
    }

    const userId = this.userStateManager.getCurrentUserId()
    const contentList = await this.discoveryNode.getContentLists(
      100,
      0,
      [contentListId],
      userId
    )

    // error if contentList does not exist or hasn't been indexed by discovery node
    if (!Array.isArray(contentList) || !contentList.length) {
      throw new Error(
        'Cannot order contentList - ContentList does not exist or has not yet been indexed by discovery node'
      )
    }

    const contentListDigitalContentIds = contentList[0]!.content_list_contents.digital_content_ids.map(
      (a) => a.digital_content
    )
    // error if digitalContentIds arg array length does not match contentList length
    if (digitalContentIds.length !== contentListDigitalContentIds.length) {
      throw new Error(
        'Cannot order contentList - digitalContentIds length must match contentList length'
      )
    }

    // ensure existing contentList digitalContents and digitalContentIds have same content, regardless of order
    const digitalContentIdsSorted = [...digitalContentIds].sort()
    const contentListDigitalContentIdsSorted = contentListDigitalContentIds.sort()
    for (let i = 0; i < digitalContentIdsSorted.length; i++) {
      if (digitalContentIdsSorted[i] !== contentListDigitalContentIdsSorted[i]) {
        throw new Error(
          'Cannot order contentList - digitalContentIds must have same content as contentList digitalContents'
        )
      }
    }

    return await this.contracts.ContentListFactoryClient.orderContentListDigitalContents(
      contentListId,
      digitalContentIds,
      retriesOverride
    )
  }

  /**
   * Checks if a contentList has entered a corrupted state
   * Check that each of the digitalContents within a contentList retrieved from discprov are in the onchain contentList
   * Note: the onchain contentLists stores the digitalContents as a mapping of digital_content ID to digital_content count and the
   * digital_content order is an event that is indexed by discprov. The digital_content order event does not validate that the
   * updated order of digitalContents has the correct digital_content count, so a digital_content order event w/ duplicate digitalContents can
   * lead the contentList entering a corrupted state.
   */
  async validateDigitalContentsInContentList(contentListId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER, Services.CONTENT_NODE)

    const userId = this.userStateManager.getCurrentUserId()
    const contentListsReponse = await this.discoveryNode.getContentLists(
      1,
      0,
      [contentListId],
      userId
    )

    // error if contentList does not exist or hasn't been indexed by discovery node
    if (!Array.isArray(contentListsReponse) || !contentListsReponse.length) {
      throw new Error(
        'Cannot validate contentList - ContentList does not exist, is private and not owned by current user or has not yet been indexed by discovery node'
      )
    }

    const contentList = contentListsReponse[0]!
    const contentListDigitalContentIds = contentList.content_list_contents.digital_content_ids.map(
      (a) => a.digital_content
    )

    // Check if each digital_content is in the contentList
    //const invalidDigitalContentIds = []
    const invalidDigitalContentIds : number[] = []
    for (const digitalContentId of contentListDigitalContentIds) {
      const digitalContentInContentList =
        await this.contracts.ContentListFactoryClient.isDigitalContentInContentList(
          contentListId,
          digitalContentId
        )
      if (!digitalContentInContentList) invalidDigitalContentIds.push(digitalContentId)
    }

    return {
      isValid: invalidDigitalContentIds.length === 0,
      invalidDigitalContentIds
    }
  }

  /**
   * Uploads a cover photo for a contentList without updating the actual contentList
   * @param coverPhotoFile the file to upload as the cover photo
   * @return CID of the uploaded cover photo
   */
  async uploadContentListCoverPhoto(coverPhotoFile: File) {
    this.REQUIRES(Services.CONTENT_NODE)

    const updatedContentListImage = await this.contentNode.uploadImage(
      coverPhotoFile,
      true // square
    )
    return updatedContentListImage.dirCID
  }

  /**
   * Updates the cover photo for a contentList
   */
  async updateContentListCoverPhoto(contentListId: number, coverPhoto: File) {
    this.REQUIRES(Services.CONTENT_NODE)

    const updatedContentListImageDirCid = await this.uploadContentListCoverPhoto(
      coverPhoto
    )
    return await this.contracts.ContentListFactoryClient.updateContentListCoverPhoto(
      contentListId,
      Utils.formatOptionalMultihash(updatedContentListImageDirCid)
    )
  }

  /**
   * Updates a contentList name
   */
  async updateContentListName(contentListId: number, contentListName: string) {
    return await this.contracts.ContentListFactoryClient.updateContentListName(
      contentListId,
      contentListName
    )
  }

  /**
   * Updates a contentList description
   * @param contentListId
   * @param updatedContentListDescription
   */
  async updateContentListDescription(
    contentListId: number,
    updatedContentListDescription: string
  ) {
    return await this.contracts.ContentListFactoryClient.updateContentListDescription(
      contentListId,
      updatedContentListDescription
    )
  }

  /**
   * Updates whether a contentList is public or private
   */
  async updateContentListPrivacy(
    contentListId: number,
    updatedContentListPrivacy: boolean
  ) {
    return await this.contracts.ContentListFactoryClient.updateContentListPrivacy(
      contentListId,
      updatedContentListPrivacy
    )
  }

  /**
   * Reposts a contentList for a user
   */
  async addContentListRepost(contentListId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.SocialFeatureFactoryClient.addContentListRepost(
      userId!,
      contentListId
    )
  }

  /**
   * Undoes a repost on a contentList for a user
   */
  async deleteContentListRepost(contentListId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.SocialFeatureFactoryClient.deleteContentListRepost(
      userId!,
      contentListId
    )
  }

  /**
   * Marks a digital_content to be deleted from a contentList. The contentList entry matching
   * the provided timestamp is deleted in the case of duplicates.
   * @param contentListId
   * @param deletedDigitalContentId
   * @param deletedContentListTimestamp parseable timestamp (to be copied from contentList metadata)
   * @param {number?} retriesOverride [Optional, defaults to web3Manager.sendTransaction retries default]
   */
  async deleteContentListDigitalContent(
    contentListId: number,
    deletedDigitalContentId: number,
    deletedContentListTimestamp: number,
    retriesOverride?: number
  ) {
    return await this.contracts.ContentListFactoryClient.deleteContentListDigitalContent(
      contentListId,
      deletedDigitalContentId,
      deletedContentListTimestamp,
      retriesOverride
    )
  }

  /**
   * Saves a contentList on behalf of a user
   */
  async addContentListSave(contentListId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.UserLibraryFactoryClient.addContentListSave(
      userId!,
      contentListId
    )
  }

  /**
   * Unsaves a contentList on behalf of a user
   */
  async deleteContentListSave(contentListId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.UserLibraryFactoryClient.deleteContentListSave(
      userId!,
      contentListId
    )
  }

  /**
   * Marks a contentList as deleted
   */
  async deleteContentList(contentListId: number) {
    return await this.contracts.ContentListFactoryClient.deleteContentList(contentListId)
  }
}
