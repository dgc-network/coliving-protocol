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
   * get full contentList objects, including agreements, for passed in array of contentListId
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
   * NOTE in returned JSON, SaveType string one of agreement, contentList, album
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
   * NOTE in returned JSON, SaveType string one of agreement, contentList, album
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
    agreementIds: number[]
  ) {
    const maxInitialAgreements = 50
    const createInitialIdsArray = agreementIds.slice(0, maxInitialAgreements)
    const postInitialIdsArray = agreementIds.slice(maxInitialAgreements)
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

      // Add remaining agreements
      await Promise.all(
        postInitialIdsArray.map(async (agreementId) => {
          return await this.contracts.ContentListFactoryClient.addContentListAgreement(
            contentListId,
            agreementId
          )
        })
      )

      // Order agreements
      if (postInitialIdsArray.length > 0) {
        receipt =
          await this.contracts.ContentListFactoryClient.orderContentListAgreements(
            contentListId,
            agreementIds
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
   * Adds a agreement to a given contentList
   */
  async addContentListAgreement(contentListId: number, agreementId: number) {
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
        'Cannot add agreement - ContentList does not exist or has not yet been indexed by discovery node'
      )
    }
    // error if contentList already at max length
    if (
      contentList[0]!.contentList_contents.agreement_ids.length >= MAX_CONTENT_LIST_LENGTH
    ) {
      throw new Error(
        `Cannot add agreement - contentList is already at max length of ${MAX_CONTENT_LIST_LENGTH}`
      )
    }
    return await this.contracts.ContentListFactoryClient.addContentListAgreement(
      contentListId,
      agreementId
    )
  }

  /**
   * Reorders the agreements in a contentList
   */
  async orderContentListAgreements(
    contentListId: number,
    agreementIds: number[],
    retriesOverride?: number
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    if (!Array.isArray(agreementIds)) {
      throw new Error('Cannot order contentList - agreementIds must be array')
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

    const contentListAgreementIds = contentList[0]!.contentList_contents.agreement_ids.map(
      (a) => a.agreement
    )
    // error if agreementIds arg array length does not match contentList length
    if (agreementIds.length !== contentListAgreementIds.length) {
      throw new Error(
        'Cannot order contentList - agreementIds length must match contentList length'
      )
    }

    // ensure existing contentList agreements and agreementIds have same content, regardless of order
    const agreementIdsSorted = [...agreementIds].sort()
    const contentListAgreementIdsSorted = contentListAgreementIds.sort()
    for (let i = 0; i < agreementIdsSorted.length; i++) {
      if (agreementIdsSorted[i] !== contentListAgreementIdsSorted[i]) {
        throw new Error(
          'Cannot order contentList - agreementIds must have same content as contentList agreements'
        )
      }
    }

    return await this.contracts.ContentListFactoryClient.orderContentListAgreements(
      contentListId,
      agreementIds,
      retriesOverride
    )
  }

  /**
   * Checks if a contentList has entered a corrupted state
   * Check that each of the agreements within a contentList retrieved from discprov are in the onchain contentList
   * Note: the onchain contentLists stores the agreements as a mapping of agreement ID to agreement count and the
   * agreement order is an event that is indexed by discprov. The agreement order event does not validate that the
   * updated order of agreements has the correct agreement count, so a agreement order event w/ duplicate agreements can
   * lead the contentList entering a corrupted state.
   */
  async validateAgreementsInContentList(contentListId: number) {
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
    const contentListAgreementIds = contentList.contentList_contents.agreement_ids.map(
      (a) => a.agreement
    )

    // Check if each agreement is in the contentList
    const invalidAgreementIds = []
    for (const agreementId of contentListAgreementIds) {
      const agreementInContentList =
        await this.contracts.ContentListFactoryClient.isAgreementInContentList(
          contentListId,
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
   * Marks a agreement to be deleted from a contentList. The contentList entry matching
   * the provided timestamp is deleted in the case of duplicates.
   * @param contentListId
   * @param deletedAgreementId
   * @param deletedContentListTimestamp parseable timestamp (to be copied from contentList metadata)
   * @param {number?} retriesOverride [Optional, defaults to web3Manager.sendTransaction retries default]
   */
  async deleteContentListAgreement(
    contentListId: number,
    deletedAgreementId: number,
    deletedContentListTimestamp: number,
    retriesOverride?: number
  ) {
    return await this.contracts.ContentListFactoryClient.deleteContentListAgreement(
      contentListId,
      deletedAgreementId,
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
