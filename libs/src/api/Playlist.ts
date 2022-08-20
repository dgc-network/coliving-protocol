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
    this.addContentListAgreement = this.addContentListAgreement.bind(this)
    this.orderContentListAgreements = this.orderContentListAgreements.bind(this)
    this.validateAgreementsInContentList = this.validateAgreementsInContentList.bind(this)
    this.uploadContentListCoverPhoto = this.uploadContentListCoverPhoto.bind(this)
    this.updateContentListCoverPhoto = this.updateContentListCoverPhoto.bind(this)
    this.updateContentListName = this.updateContentListName.bind(this)
    this.updateContentListDescription = this.updateContentListDescription.bind(this)
    this.updateContentListPrivacy = this.updateContentListPrivacy.bind(this)
    this.addContentListRepost = this.addContentListRepost.bind(this)
    this.deleteContentListRepost = this.deleteContentListRepost.bind(this)
    this.deleteContentListAgreement = this.deleteContentListAgreement.bind(this)
    this.addContentListSave = this.addContentListSave.bind(this)
    this.deleteContentListSave = this.deleteContentListSave.bind(this)
    this.deleteContentList = this.deleteContentList.bind(this)
  }

  /* ------- GETTERS ------- */

  /**
   * get full content list objects, including agreements, for passed in array of content listId
   * @param limit max # of items to return
   * @param offset offset into list to return from (for pagination)
   * @param idsArray list of content list ids
   * @param targetUserId the user whose content lists we're trying to get
   * @param withUsers whether to return users nested within the collection objects
   * @returns array of content list objects
   * additional metadata fields on content list objects:
   *  {Integer} repost_count - repost count for given content list
   *  {Integer} save_count - save count for given content list
   *  {Boolean} has_current_user_reposted - has current user reposted given content list
   *  {Array} followee_reposts - followees of current user that have reposted given content list
   *  {Boolean} has_current_user_reposted - has current user reposted given content list
   *  {Boolean} has_current_user_saved - has current user saved given content list
   */
  async getContentLists(
    limit = 100,
    offset = 0,
    idsArray = null,
    targetUserId = null,
    withUsers = false
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getContentLists(
      limit,
      offset,
      idsArray,
      targetUserId,
      withUsers
    )
  }

  /**
   * Return saved content lists for current user
   * NOTE in returned JSON, SaveType string one of agreement, content list, album
   * @param limit - max # of items to return
   * @param offset - offset into list to return from (for pagination)
   */
  async getSavedContentLists(limit = 100, offset = 0, withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getSavedContentLists(
      limit,
      offset,
      withUsers
    )
  }

  /**
   * Return saved albums for current user
   * NOTE in returned JSON, SaveType string one of agreement, content list, album
   * @param limit - max # of items to return
   * @param offset - offset into list to return from (for pagination)
   */
  async getSavedAlbums(limit = 100, offset = 0, withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getSavedAlbums(limit, offset, withUsers)
  }

  /* ------- SETTERS ------- */

  /**
   * Creates a new content list
   */
  async createContentList(
    userId: number,
    content listName: string,
    isPrivate: boolean,
    isAlbum: boolean,
    agreementIds: number[]
  ) {
    const maxInitialAgreements = 50
    const createInitialIdsArray = agreementIds.slice(0, maxInitialAgreements)
    const postInitialIdsArray = agreementIds.slice(maxInitialAgreements)
    let content listId: number
    let receipt: Partial<TransactionReceipt> = {}
    try {
      const response =
        await this.contracts.ContentListFactoryClient.createContentList(
          userId,
          content listName,
          isPrivate,
          isAlbum,
          createInitialIdsArray
        )
      content listId = response.content listId
      receipt = response.txReceipt

      // Add remaining agreements
      await Promise.all(
        postInitialIdsArray.map(async (agreementId) => {
          return await this.contracts.ContentListFactoryClient.addContentListAgreement(
            content listId,
            agreementId
          )
        })
      )

      // Order agreements
      if (postInitialIdsArray.length > 0) {
        receipt =
          await this.contracts.ContentListFactoryClient.orderContentListAgreements(
            content listId,
            agreementIds
          )
      }
    } catch (e) {
      console.debug(
        `Reached libs createContentList catch block with content list id ${content listId!}`
      )
      console.error(e)
      return { content listId: content listId!, error: true }
    }
    return {
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber,
      content listId,
      error: false
    }
  }

  /**
   * Adds a agreement to a given content list
   */
  async addContentListAgreement(content listId: number, agreementId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)

    const userId = this.userStateManager.getCurrentUserId()
    const content list = await this.discoveryProvider.getContentLists(
      100,
      0,
      [content listId],
      userId
    )

    // error if content list does not exist or hasn't been indexed by discovery node
    if (!Array.isArray(content list) || !content list.length) {
      throw new Error(
        'Cannot add agreement - ContentList does not exist or has not yet been indexed by discovery node'
      )
    }
    // error if content list already at max length
    if (
      content list[0]!.content list_contents.agreement_ids.length >= MAX_CONTENT_LIST_LENGTH
    ) {
      throw new Error(
        `Cannot add agreement - content list is already at max length of ${MAX_CONTENT_LIST_LENGTH}`
      )
    }
    return await this.contracts.ContentListFactoryClient.addContentListAgreement(
      content listId,
      agreementId
    )
  }

  /**
   * Reorders the agreements in a content list
   */
  async orderContentListAgreements(
    content listId: number,
    agreementIds: number[],
    retriesOverride?: number
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    if (!Array.isArray(agreementIds)) {
      throw new Error('Cannot order content list - agreementIds must be array')
    }

    const userId = this.userStateManager.getCurrentUserId()
    const content list = await this.discoveryProvider.getContentLists(
      100,
      0,
      [content listId],
      userId
    )

    // error if content list does not exist or hasn't been indexed by discovery node
    if (!Array.isArray(content list) || !content list.length) {
      throw new Error(
        'Cannot order content list - ContentList does not exist or has not yet been indexed by discovery node'
      )
    }

    const content listAgreementIds = content list[0]!.content list_contents.agreement_ids.map(
      (a) => a.agreement
    )
    // error if agreementIds arg array length does not match content list length
    if (agreementIds.length !== content listAgreementIds.length) {
      throw new Error(
        'Cannot order content list - agreementIds length must match content list length'
      )
    }

    // ensure existing content list agreements and agreementIds have same content, regardless of order
    const agreementIdsSorted = [...agreementIds].sort()
    const content listAgreementIdsSorted = content listAgreementIds.sort()
    for (let i = 0; i < agreementIdsSorted.length; i++) {
      if (agreementIdsSorted[i] !== content listAgreementIdsSorted[i]) {
        throw new Error(
          'Cannot order content list - agreementIds must have same content as content list agreements'
        )
      }
    }

    return await this.contracts.ContentListFactoryClient.orderContentListAgreements(
      content listId,
      agreementIds,
      retriesOverride
    )
  }

  /**
   * Checks if a content list has entered a corrupted state
   * Check that each of the agreements within a content list retrieved from discprov are in the onchain content list
   * Note: the onchain content lists stores the agreements as a mapping of agreement ID to agreement count and the
   * agreement order is an event that is indexed by discprov. The agreement order event does not validate that the
   * updated order of agreements has the correct agreement count, so a agreement order event w/ duplicate agreements can
   * lead the content list entering a corrupted state.
   */
  async validateAgreementsInContentList(content listId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER, Services.CONTENT_NODE)

    const userId = this.userStateManager.getCurrentUserId()
    const content listsReponse = await this.discoveryProvider.getContentLists(
      1,
      0,
      [content listId],
      userId
    )

    // error if content list does not exist or hasn't been indexed by discovery node
    if (!Array.isArray(content listsReponse) || !content listsReponse.length) {
      throw new Error(
        'Cannot validate content list - ContentList does not exist, is private and not owned by current user or has not yet been indexed by discovery node'
      )
    }

    const content list = content listsReponse[0]!
    const content listAgreementIds = content list.content list_contents.agreement_ids.map(
      (a) => a.agreement
    )

    // Check if each agreement is in the content list
    const invalidAgreementIds = []
    for (const agreementId of content listAgreementIds) {
      const agreementInContentList =
        await this.contracts.ContentListFactoryClient.isAgreementInContentList(
          content listId,
          agreementId
        )
      if (!agreementInContentList) invalidAgreementIds.push(agreementId)
    }

    return {
      isValid: invalidAgreementIds.length === 0,
      invalidAgreementIds
    }
  }

  /**
   * Uploads a cover photo for a content list without updating the actual content list
   * @param coverPhotoFile the file to upload as the cover photo
   * @return CID of the uploaded cover photo
   */
  async uploadContentListCoverPhoto(coverPhotoFile: File) {
    this.REQUIRES(Services.CONTENT_NODE)

    const updatedContentListImage = await this.creatorNode.uploadImage(
      coverPhotoFile,
      true // square
    )
    return updatedContentListImage.dirCID
  }

  /**
   * Updates the cover photo for a content list
   */
  async updateContentListCoverPhoto(content listId: number, coverPhoto: File) {
    this.REQUIRES(Services.CONTENT_NODE)

    const updatedContentListImageDirCid = await this.uploadContentListCoverPhoto(
      coverPhoto
    )
    return await this.contracts.ContentListFactoryClient.updateContentListCoverPhoto(
      content listId,
      Utils.formatOptionalMultihash(updatedContentListImageDirCid)
    )
  }

  /**
   * Updates a content list name
   */
  async updateContentListName(content listId: number, content listName: string) {
    return await this.contracts.ContentListFactoryClient.updateContentListName(
      content listId,
      content listName
    )
  }

  /**
   * Updates a content list description
   * @param content listId
   * @param updatedContentListDescription
   */
  async updateContentListDescription(
    content listId: number,
    updatedContentListDescription: string
  ) {
    return await this.contracts.ContentListFactoryClient.updateContentListDescription(
      content listId,
      updatedContentListDescription
    )
  }

  /**
   * Updates whether a content list is public or private
   */
  async updateContentListPrivacy(
    content listId: number,
    updatedContentListPrivacy: boolean
  ) {
    return await this.contracts.ContentListFactoryClient.updateContentListPrivacy(
      content listId,
      updatedContentListPrivacy
    )
  }

  /**
   * Reposts a content list for a user
   */
  async addContentListRepost(content listId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.SocialFeatureFactoryClient.addContentListRepost(
      userId!,
      content listId
    )
  }

  /**
   * Undoes a repost on a content list for a user
   */
  async deleteContentListRepost(content listId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.SocialFeatureFactoryClient.deleteContentListRepost(
      userId!,
      content listId
    )
  }

  /**
   * Marks a agreement to be deleted from a content list. The content list entry matching
   * the provided timestamp is deleted in the case of duplicates.
   * @param content listId
   * @param deletedAgreementId
   * @param deletedContentListTimestamp parseable timestamp (to be copied from content list metadata)
   * @param {number?} retriesOverride [Optional, defaults to web3Manager.sendTransaction retries default]
   */
  async deleteContentListAgreement(
    content listId: number,
    deletedAgreementId: number,
    deletedContentListTimestamp: number,
    retriesOverride?: number
  ) {
    return await this.contracts.ContentListFactoryClient.deleteContentListAgreement(
      content listId,
      deletedAgreementId,
      deletedContentListTimestamp,
      retriesOverride
    )
  }

  /**
   * Saves a content list on behalf of a user
   */
  async addContentListSave(content listId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.UserLibraryFactoryClient.addContentListSave(
      userId!,
      content listId
    )
  }

  /**
   * Unsaves a content list on behalf of a user
   */
  async deleteContentListSave(content listId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.UserLibraryFactoryClient.deleteContentListSave(
      userId!,
      content listId
    )
  }

  /**
   * Marks a content list as deleted
   */
  async deleteContentList(content listId: number) {
    return await this.contracts.ContentListFactoryClient.deleteContentList(content listId)
  }
}
