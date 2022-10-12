// TODO: strictly type each method with the models defined in coliving-client
import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  Method
} from 'axios'

import { CollectionMetadata, Nullable, User, Utils } from '../../utils'

import { DEFAULT_UNHEALTHY_BLOCK_DIFF, REQUEST_TIMEOUT_MS } from './constants'

import * as Requests from './requests'

import urlJoin, { PathArg } from 'proper-url-join'
import {
  DiscoveryNodeSelection,
  DiscoveryNodeSelectionConfig
} from './discoveryNodeSelection'
import type { CurrentUser, UserStateManager } from '../../userStateManager'
import type { EthContracts } from '../ethContracts'
import type { Web3Manager } from '../web3Manager'

const MAX_MAKE_REQUEST_RETRY_COUNT = 5
const MAX_MAKE_REQUEST_RETRIES_WITH_404 = 2

type RequestParams = {
  queryParams: Record<string, string>
  endpoint: string
  timeout?: number
  method?: Method
  urlParams?: PathArg
  headers?: Record<string, string>
  data?: Record<string, unknown>
}

export type DiscoveryNodeConfig = {
  whitelist?: Set<string>
  blacklist?: Set<string>
  userStateManager: UserStateManager
  ethContracts: EthContracts
  web3Manager?: Web3Manager
  reselectTimeout?: number
  selectionRequestTimeout?: number
  selectionRequestRetries?: number
  unhealthySlotDiffPlays?: number
  unhealthyBlockDiff?: number
} & Pick<
  DiscoveryNodeSelectionConfig,
  'selectionCallback' | 'monitoringCallbacks' | 'localStorage'
>

export type UserProfile = {
  userId: string
  email: string
  name: string
  handle: string
  verified: boolean
  profilePicture:
    | { '150x150': string; '480x480': string; '1000x1000': string }
    | null
    | undefined
  sub: number
  iat: string
}

/**
 * Constructs a service class for a discovery node
 * @param whitelist whether or not to only include specified nodes in selection
 * @param userStateManager singleton UserStateManager instance
 * @param ethContracts singleton EthContracts instance
 * @param web3Manager
 * @param reselectTimeout timeout to clear locally cached discovery nodes
 * @param selectionCallback invoked when a discovery node is selected
 * @param monitoringCallbacks callbacks to be invoked with metrics from requests sent to a service
 *  @param monitoringCallbacks.request
 *  @param monitoringCallbacks.healthCheck
 * @param selectionRequestTimeout the amount of time (ms) an individual request should take before reselecting
 * @param selectionRequestRetries the number of retries to a given discovery node we make before reselecting
 * @param unhealthySlotDiffPlays the number of slots we would consider a discovery node unhealthy
 * @param unhealthyBlockDiff the number of missed blocks after which we would consider a discovery node unhealthy
 */
export class DiscoveryNode {
  whitelist: Set<string> | undefined
  blacklist: Set<string> | undefined
  userStateManager: UserStateManager
  ethContracts: EthContracts
  web3Manager: Web3Manager | undefined
  unhealthyBlockDiff: number
  serviceSelector: DiscoveryNodeSelection
  selectionRequestTimeout: number
  selectionRequestRetries: number
  unhealthySlotDiffPlays: number | undefined
  request404Count: number
  maxRequestsForTrue404: number
  monitoringCallbacks:
    | DiscoveryNodeSelection['monitoringCallbacks']
    | undefined

  discoveryNodeEndpoint: string | undefined
  isInitialized = false

  constructor({
    whitelist,
    blacklist,
    userStateManager,
    ethContracts,
    web3Manager,
    reselectTimeout,
    selectionCallback,
    monitoringCallbacks,
    selectionRequestTimeout = REQUEST_TIMEOUT_MS,
    selectionRequestRetries = MAX_MAKE_REQUEST_RETRY_COUNT,
    localStorage,
    unhealthySlotDiffPlays,
    unhealthyBlockDiff
  }: DiscoveryNodeConfig) {
    this.whitelist = whitelist
    this.blacklist = blacklist
    this.userStateManager = userStateManager
    this.ethContracts = ethContracts
    this.web3Manager = web3Manager

    this.unhealthyBlockDiff = unhealthyBlockDiff ?? DEFAULT_UNHEALTHY_BLOCK_DIFF
    this.serviceSelector = new DiscoveryNodeSelection(
      {
        whitelist: this.whitelist,
        blacklist: this.blacklist,
        reselectTimeout,
        selectionCallback,
        monitoringCallbacks,
        requestTimeout: selectionRequestTimeout,
        unhealthySlotDiffPlays: unhealthySlotDiffPlays,
        localStorage: localStorage,
        unhealthyBlockDiff: this.unhealthyBlockDiff
      },
      this.ethContracts
    )
    this.selectionRequestTimeout = selectionRequestTimeout
    this.selectionRequestRetries = selectionRequestRetries
    this.unhealthySlotDiffPlays = unhealthySlotDiffPlays

    // Keep digital_content of the number of times a request 404s so we know when a true 404 occurs
    // Due to incident where some discovery nodes may erroneously be missing content #flare-51,
    // we treat 404s differently than generic 4xx's or other 5xx errors.
    // In the case of a 404, try a few other nodes
    this.request404Count = 0
    this.maxRequestsForTrue404 = MAX_MAKE_REQUEST_RETRIES_WITH_404

    this.monitoringCallbacks = monitoringCallbacks
  }

  async init() {
    const endpoint = await this.serviceSelector.select()
    this.setEndpoint(endpoint)

    if (endpoint && this.web3Manager && this.web3Manager.web3) {
      // Set current user if it exists
      const userAccount = await this.getUserAccount(
        this.web3Manager.getWalletAddress()
      )
      if (userAccount) {
        await this.userStateManager.setCurrentUser(userAccount)
      }
    }
  }

  setEndpoint(endpoint: string) {
    this.discoveryNodeEndpoint = endpoint
  }

  setUnhealthyBlockDiff(updatedBlockDiff = DEFAULT_UNHEALTHY_BLOCK_DIFF) {
    this.unhealthyBlockDiff = updatedBlockDiff
    this.serviceSelector.setUnhealthyBlockDiff(updatedBlockDiff)
  }

  setUnhealthySlotDiffPlays(updatedDiff: number) {
    this.unhealthySlotDiffPlays = updatedDiff
    this.serviceSelector.setUnhealthySlotDiffPlays(updatedDiff)
  }

  /**
   * Get users with all relevant user data
   * can be filtered by providing an integer array of ids
   * @returns Array of User metadata Objects
   * additional metadata fields on user objects:
   *  {Integer} digital_content_count - digital_content count for given user
   *  {Integer} content_list_count - contentList count for given user
   *  {Integer} album_count - album count for given user
   *  {Integer} follower_count - follower count for given user
   *  {Integer} followee_count - followee count for given user
   *  {Integer} repost_count - repost count for given user
   *  {Integer} digital_content_blocknumber - blocknumber of latest digital_content for user
   *  {Boolean} does_current_user_follow - does current user follow given user
   *  {Array} followee_follows - followees of current user that follow given user
   * @example
   * await getUsers()
   * await getUsers(100, 0, [3,2,6]) - Invalid user ids will not be accepted
   */
  async getUsers(
    limit = 100,
    offset = 0,
    idsArray: Nullable<number[]>,
    walletAddress?: Nullable<string>,
    handle?: Nullable<string>,
    minBlockNumber?: Nullable<number>
  ) {
    const req = Requests.getUsers(
      limit,
      offset,
      idsArray,
      walletAddress,
      handle,
      minBlockNumber
    )
    return await this._makeRequest<Nullable<User[]>>(req)
  }

  /**
   * get agreements with all relevant digital_content data
   * can be filtered by providing an integer array of ids
   * @param limit
   * @param offset
   * @param idsArray
   * @param targetUserId the owner of the agreements being queried
   * @param sort a string of form eg. blocknumber:asc,timestamp:desc describing a sort path
   * @param minBlockNumber The min block number
   * @param filterDeleted If set to true, filters the deleted agreements
   * @returns Array of digital_content metadata Objects
   * additional metadata fields on digital_content objects:
   *  {Integer} repost_count - repost count for given digital_content
   *  {Integer} save_count - save count for given digital_content
   *  {Array} followee_reposts - followees of current user that have reposted given digital_content
   *  {Boolean} has_current_user_reposted - has current user reposted given digital_content
   *  {Boolean} has_current_user_saved - has current user saved given digital_content
   * @example
   * await getAgreements()
   * await getAgreements(100, 0, [3,2,6]) - Invalid digital_content ids will not be accepted
   */
  async getAgreements(
    limit = 100,
    offset = 0,
    idsArray: Nullable<string[]>,
    targetUserId: Nullable<string>,
    sort: Nullable<boolean>,
    minBlockNumber: Nullable<number>,
    filterDeleted: Nullable<boolean>,
    withUsers?: boolean
  ) {
    const req = Requests.getAgreements(
      limit,
      offset,
      idsArray,
      targetUserId,
      sort,
      minBlockNumber,
      filterDeleted,
      withUsers
    )

    return await this._makeRequest(req)
  }

  /**
   * Gets a particular digital_content by its creator's handle and the digital_content's URL slug
   * @param handle the handle of the owner of the digital_content
   * @param slug the URL slug of the digital_content, generally the title urlized
   * @returns the requested digital_content's metadata
   */
  async getAgreementsByHandleAndSlug(handle: string, slug: string) {
    // Note: retries are disabled here because the v1 API response returns a 404 instead
    // of an empty array, which can cause a retry storm.
    // TODO: Rewrite this API with something more effective, change makeRequest to
    // support 404s and not retry & use ColivingAPIClient.
    return await this._makeRequest(
      Requests.getAgreementsByHandleAndSlug(handle, slug),
      /* retry */ false
    )
  }

  /**
   * gets all agreements matching identifiers, including unlisted.
   *
   */
  async getAgreementsIncludingUnlisted(identifiers: string[], withUsers = false) {
    const req = Requests.getAgreementsIncludingUnlisted(identifiers, withUsers)
    return await this._makeRequest(req)
  }

  /**
   * Gets random agreements from trending agreements for a given genre.
   * If genre not given, will return trending agreements across all genres.
   * Excludes specified digital_content ids.
   */
  async getRandomAgreements(
    genre: string,
    limit: number,
    exclusionList: number[],
    time: string
  ) {
    const req = Requests.getRandomAgreements(genre, limit, exclusionList, time)
    return await this._makeRequest(req)
  }

  /**
   * Gets all stems for a given agreementId as an array of agreements.
   */
  async getStemsForAgreement(agreementId: number) {
    const req = Requests.getStemsForAgreement(agreementId)
    return await this._makeRequest(req)
  }

  /**
   * Gets all the remixes of a given agreementId as an array of agreements.
   */
  async getRemixesOfAgreement(
    agreementId: number,
    limit: Nullable<number>,
    offset: Nullable<number>
  ) {
    const req = Requests.getRemixesOfAgreement(agreementId, limit, offset)
    return await this._makeRequest(req)
  }

  /**
   * Gets the remix parents of a given agreementId as an array of agreements.
   */
  async getRemixAgreementParents(
    agreementId: number,
    limit: Nullable<number>,
    offset: Nullable<number>
  ) {
    const req = Requests.getRemixAgreementParents(agreementId, limit, offset)
    return await this._makeRequest(req)
  }

  /**
   * Gets agreements trending on Coliving.
   * @param genre
   * @param timeFrame one of day, week, month, or year
   * @param idsArray digital_content ids
   * @param limit
   * @param offset
   */
  async getTrendingAgreements(
    genre: Nullable<string>,
    timeFrame: Nullable<string>,
    idsArray: Nullable<number[]>,
    limit: Nullable<number>,
    offset: Nullable<number>,
    withUsers = false
  ) {
    const req = Requests.getTrendingAgreements(
      genre,
      timeFrame,
      idsArray,
      limit,
      offset,
      withUsers
    )
    return await this._makeRequest<{
      listenCounts: Array<{ agreementId: number; listens: number }>
    }>(req)
  }

  /**
   * get full contentList objects, including agreements, for passed in array of contentListId
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
    idsArray: Nullable<number[]> = null,
    targetUserId: Nullable<number> = null,
    withUsers = false
  ) {
    const req = Requests.getContentLists(
      limit,
      offset,
      idsArray,
      targetUserId,
      withUsers
    )
    return await this._makeRequest<CollectionMetadata[]>(req)
  }

  /**
   * Return social feed for current user
   * @param filter - filter by "all", "original", or "repost"
   * @param limit - max # of items to return
   * @param offset - offset into list to return from (for pagination)
   * @returns Array of digital_content and contentList metadata objects
   * additional metadata fields on digital_content and contentList objects:
   *  {String} activity_timestamp - timestamp of requested user's repost for given digital_content or contentList,
   *    used for sorting feed
   *  {Integer} repost_count - repost count of given digital_content/contentList
   *  {Integer} save_count - save count of given digital_content/contentList
   *  {Boolean} has_current_user_reposted - has current user reposted given digital_content/contentList
   *  {Array} followee_reposts - followees of current user that have reposted given digital_content/contentList
   */
  async getSocialFeed(
    filter: string,
    limit = 100,
    offset = 0,
    withUsers = false,
    agreementsOnly = false
  ) {
    const req = Requests.getSocialFeed(
      filter,
      limit,
      offset,
      withUsers,
      agreementsOnly
    )
    return await this._makeRequest(req)
  }

  /**
   * Return repost feed for requested user
   * @param userId - requested user id
   * @param limit - max # of items to return (for pagination)
   * @param offset - offset into list to return from (for pagination)
   * @returns Array of digital_content and contentList metadata objects}
   * additional metadata fields on digital_content and contentList objects:
   *  {String} activity_timestamp - timestamp of requested user's repost for given digital_content or contentList,
   *    used for sorting feed
   *  {Integer} repost_count - repost count of given digital_content/contentList
   *  {Integer} save_count - save count of given digital_content/contentList
   *  {Boolean} has_current_user_reposted - has current user reposted given digital_content/contentList
   *  {Array} followee_reposts - followees of current user that have reposted given digital_content/contentList
   */
  async getUserRepostFeed(
    userId: number,
    limit = 100,
    offset = 0,
    withUsers = false
  ) {
    const req = Requests.getUserRepostFeed(userId, limit, offset, withUsers)
    return await this._makeRequest(req)
  }

  /**
   * get intersection of users that follow followeeUserId and users that are followed by followerUserId
   * @param followeeUserId user that is followed
   * @param followerUserId user that follows
   * @example
   * getFollowIntersectionUsers(100, 0, 1, 1) - IDs must be valid
   */
  async getFollowIntersectionUsers(
    limit = 100,
    offset = 0,
    followeeUserId: number,
    followerUserId: number
  ) {
    const req = Requests.getFollowIntersectionUsers(
      limit,
      offset,
      followeeUserId,
      followerUserId
    )
    return await this._makeRequest(req)
  }

  /**
   * get intersection of users that have reposted repostAgreementId and users that are followed by followerUserId
   * followee = user that is followed; follower = user that follows
   * @param repostAgreementId digital_content that is reposted
   * @param followerUserId user that reposted digital_content
   * @example
   * getAgreementRepostIntersectionUsers(100, 0, 1, 1) - IDs must be valid
   */
  async getAgreementRepostIntersectionUsers(
    limit = 100,
    offset = 0,
    repostAgreementId: number,
    followerUserId: number
  ) {
    const req = Requests.getAgreementRepostIntersectionUsers(
      limit,
      offset,
      repostAgreementId,
      followerUserId
    )
    return await this._makeRequest(req)
  }

  /**
   * get intersection of users that have reposted repostContentListId and users that are followed by followerUserId
   * followee = user that is followed; follower = user that follows
   * @param repostContentListId contentList that is reposted
   * @param followerUserId user that reposted digital_content
   * @example
   * getContentListRepostIntersectionUsers(100, 0, 1, 1) - IDs must be valid
   */
  async getContentListRepostIntersectionUsers(
    limit = 100,
    offset = 0,
    repostContentListId: number,
    followerUserId: number
  ) {
    const req = Requests.getContentListRepostIntersectionUsers(
      limit,
      offset,
      repostContentListId,
      followerUserId
    )
    return await this._makeRequest(req)
  }

  /**
   * get users that follow followeeUserId, sorted by follower count descending
   * @param followeeUserId user that is followed
   * @return {Array} array of user objects with standard user metadata
   */
  async getFollowersForUser(limit = 100, offset = 0, followeeUserId: string) {
    const req = Requests.getFollowersForUser(limit, offset, followeeUserId)
    return await this._makeRequest(req)
  }

  /**
   * get users that are followed by followerUserId, sorted by follower count descending
   * @param followerUserId user - i am the one who follows
   * @return array of user objects with standard user metadata
   */
  async getFolloweesForUser(limit = 100, offset = 0, followerUserId: string) {
    const req = Requests.getFolloweesForUser(limit, offset, followerUserId)
    return await this._makeRequest(req)
  }

  /**
   * get users that reposted repostAgreementId, sorted by follower count descending
   * @param repostAgreementId
   * @return array of user objects
   * additional metadata fields on user objects:
   *  {Integer} follower_count - follower count of given user
   * @example
   * getRepostersForAgreement(100, 0, 1) - ID must be valid
   */
  async getRepostersForAgreement(limit = 100, offset = 0, repostAgreementId: number) {
    const req = Requests.getRepostersForAgreement(limit, offset, repostAgreementId)
    return await this._makeRequest(req)
  }

  /**
   * get users that reposted repostContentListId, sorted by follower count descending
   * @param repostContentListId
   * @return array of user objects
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
    const req = Requests.getRepostersForContentList(
      limit,
      offset,
      repostContentListId
    )
    return await this._makeRequest(req)
  }

  /**
   * get users that saved saveAgreementId, sorted by follower count descending
   * @param saveAgreementId
   * @return array of user objects
   * additional metadata fields on user objects:
   *  {Integer} follower_count - follower count of given user
   * @example
   * getSaversForAgreement(100, 0, 1) - ID must be valid
   */
  async getSaversForAgreement(limit = 100, offset = 0, saveAgreementId: number) {
    const req = Requests.getSaversForAgreement(limit, offset, saveAgreementId)
    return await this._makeRequest(req)
  }

  /**
   * get users that saved saveContentListId, sorted by follower count descending
   * @param saveContentListId
   * @return array of user objects
   * additional metadata fields on user objects:
   *  {Integer} follower_count - follower count of given user
   * @example
   * getSaversForContentList(100, 0, 1) - ID must be valid
   */
  async getSaversForContentList(limit = 100, offset = 0, saveContentListId: number) {
    const req = Requests.getSaversForContentList(limit, offset, saveContentListId)
    return await this._makeRequest(req)
  }

  /**
   * get whether a JWT given by Coliving Oauth popup is valid
   * @param token - JWT
   * @return profile info of user attached to JWT payload if the JWT is valid, else false
   */
  async verifyToken(token: string): Promise<UserProfile | false> {
    const req = Requests.verifyToken(token)
    const res = await this._makeRequest<UserProfile | null>(req)
    if (res == null) {
      return false
    } else {
      return res
    }
  }

  /**
   * Perform a full-text search. Returns agreements, users, contentLists, albums
   *    with optional user-specific results for each
   *  - user, digital_content, and contentList objects have all same data as returned from standalone endpoints
   * @param text search query
   * @param kind 'agreements', 'users', 'contentLists', 'albums', 'all'
   * @param limit max # of items to return per list (for pagination)
   * @param offset offset into list to return from (for pagination)
   */
  async searchFull(text: string, kind: string, limit = 100, offset = 0) {
    const req = Requests.searchFull(text, kind, limit, offset)
    return await this._makeRequest(req)
  }

  /**
   * Perform a lighter-weight full-text search. Returns agreements, users, contentLists, albums
   *    with optional user-specific results for each
   *  - user, digital_content, and contentList objects have core data, and digital_content & contentList objects
   *    also return user object
   * @param text search query
   * @param limit max # of items to return per list (for pagination)
   * @param offset offset into list to return from (for pagination)
   */
  async searchAutocomplete(text: string, limit = 100, offset = 0) {
    const req = Requests.searchAutocomplete(text, limit, offset)
    return await this._makeRequest(req)
  }

  /**
   * Perform a tags-only search. Returns agreements with required tag and users
   * that have used a tag greater than a specified number of times
   * @param text search query
   * @param userTagCount min # of times a user must have used a tag to be returned
   * @param kind 'agreements', 'users', 'contentLists', 'albums', 'all'
   * @param limit max # of items to return per list (for pagination)
   * @param offset offset into list to return from (for pagination)
   */
  async searchTags(
    text: string,
    userTagCount = 2,
    kind = 'all',
    limit = 100,
    offset = 0
  ) {
    const req = Requests.searchTags(text, userTagCount, kind, limit, offset)
    return await this._makeRequest(req)
  }

  /**
   * Return saved contentLists for current user
   * NOTE in returned JSON, SaveType string one of digital_content, contentList, album
   * @param limit - max # of items to return
   * @param offset - offset into list to return from (for pagination)
   */
  async getSavedContentLists(limit = 100, offset = 0, withUsers = false) {
    const req = Requests.getSavedContentLists(limit, offset, withUsers)
    return await this._makeRequest(req)
  }

  /**
   * Return saved albums for current user
   * NOTE in returned JSON, SaveType string one of digital_content, contentList, album
   * @param limit - max # of items to return
   * @param offset - offset into list to return from (for pagination)
   */
  async getSavedAlbums(limit = 100, offset = 0, withUsers = false) {
    const req = Requests.getSavedAlbums(limit, offset, withUsers)
    return await this._makeRequest(req)
  }

  /**
   * Return saved agreements for current user
   * NOTE in returned JSON, SaveType string one of digital_content, contentList, album
   * @param limit - max # of items to return
   * @param offset - offset into list to return from (for pagination)
   */
  async getSavedAgreements(limit = 100, offset = 0, withUsers = false) {
    const req = Requests.getSavedAgreements(limit, offset, withUsers)
    return await this._makeRequest(req)
  }

  /**
   * Return user collections (saved & uploaded) along w/ users for those collections
   */
  async getUserAccount(wallet: string) {
    const req = Requests.getUserAccount(wallet)
    return await this._makeRequest<CurrentUser>(req)
  }

  /**
   * @deprecated Migrate to using getTrendingContentLists
   */
  async getTopContentLists(
    type: 'contentList' | 'album',
    limit: number,
    mood: string,
    filter: string,
    withUsers = false
  ) {
    const req = Requests.getTopContentLists(type, limit, mood, filter, withUsers)
    return await this._makeRequest(req)
  }

  async getTopFullContentLists({
    type,
    limit,
    mood,
    filter,
    withUsers = false
  }: Requests.GetTopFullContentListsParams) {
    const req = Requests.getTopFullContentLists({
      type,
      limit,
      mood,
      filter,
      withUsers
    })
    return await this._makeRequest(req)
  }

  /**
   * @deprecated Migrate to using getBestNewReleases
   */
  async getTopFolloweeWindowed(
    type: string,
    window: string,
    limit: string,
    withUsers = false
  ) {
    const req = Requests.getTopFolloweeWindowed(type, window, limit, withUsers)
    return await this._makeRequest(req)
  }

  async getBestNewReleases(
    encodedUserId: string,
    window: string,
    limit: string,
    withUsers = false
  ) {
    const req = Requests.getBestNewReleases(
      window,
      limit,
      encodedUserId,
      withUsers
    )
    return await this._makeRequest(req)
  }

  /**
   * @deprecated Migrate to using getMostLovedAgreements
   */
  async getTopFolloweeSaves(type: string, limit: string, withUsers = false) {
    const req = Requests.getTopFolloweeSaves(type, limit, withUsers)
    return await this._makeRequest(req)
  }

  async getMostLovedAgreements(
    encodedUserId: string,
    limit: string,
    withUsers = false
  ) {
    const req = Requests.getMostLovedAgreements(encodedUserId, limit, withUsers)
    return await this._makeRequest(req)
  }

  async getLatest(type: string) {
    const req = Requests.getLatest(type)
    return await this._makeRequest(req)
  }

  async getTopCreatorsByGenres(
    genres: string[],
    limit = 30,
    offset = 0,
    withUsers = false
  ) {
    const req = Requests.getTopCreatorsByGenres(
      genres,
      limit,
      offset,
      withUsers
    )
    return await this._makeRequest(req)
  }

  async getURSMContentNodes(ownerWallet: string | null = null) {
    const req = Requests.getURSMContentNodes(ownerWallet)
    return await this._makeRequest(req)
  }

  async getNotifications(
    minBlockNumber: string,
    agreementIds: string[],
    timeout: number
  ) {
    const req = Requests.getNotifications(minBlockNumber, agreementIds, timeout)
    return await this._makeRequest(req)
  }

  async getSolanaNotifications(minSlotNumber: number, timeout: number) {
    const req = Requests.getSolanaNotifications(minSlotNumber, timeout)
    return await this._makeRequest(req)
  }

  async getAgreementListenMilestones(timeout: number) {
    const req = Requests.getAgreementListenMilestones(timeout)
    return await this._makeRequest(req)
  }

  async getChallengeAttestation(
    challengeId: string,
    encodedUserId: string,
    specifier: string,
    oracleAddress: string,
    discoveryNodeEndpoint: string
  ) {
    const req = Requests.getChallengeAttestation(
      challengeId,
      encodedUserId,
      specifier,
      oracleAddress
    )
    const { data } = await this._performRequestWithMonitoring<{
      data: { owner_wallet: string; attestation: string }
    }>(req, discoveryNodeEndpoint)
    return data
  }

  async getCreateSenderAttestation(
    senderEthAddress: string,
    discoveryNodeEndpoint: string
  ) {
    const req = Requests.getCreateSenderAttestation(senderEthAddress)
    const { data } = await this._performRequestWithMonitoring<{
      data: { owner_wallet: string; attestation: string }
    }>(req, discoveryNodeEndpoint)
    return data
  }

  async getUndisbursedChallenges(
    limit: number | null = null,
    offset: number | null = null,
    completedBlockNumber: string | null = null,
    encodedUserId: number | null = null
  ) {
    const req = Requests.getUndisbursedChallenges(
      limit,
      offset,
      completedBlockNumber,
      encodedUserId
    )
    const res = await this._makeRequest<Array<{ amount: string }>>(req)
    if (!res) return []
    return res.map((r) => ({ ...r, amount: parseInt(r.amount) }))
  }

  /* ------- INTERNAL FUNCTIONS ------- */

  /**
   * Performs a single request, defined in the request, via axios, calling any
   * monitoring callbacks as needed.
   *
   */
  async _performRequestWithMonitoring<Response>(
    requestObj: RequestParams,
    discoveryNodeEndpoint: string
  ) {
    const axiosRequest = this._createDiscProvRequest(
      requestObj,
      discoveryNodeEndpoint
    )
    let response: AxiosResponse<{
      signer: string
      signature: string
    }>
    let parsedResponse: Response

    const url = new URL(axiosRequest.url ?? '')
    const start = Date.now()
    try {
      response = await axios(axiosRequest)
      const duration = Date.now() - start
      parsedResponse = Utils.parseDataFromResponse(response)

      // Fire monitoring callbacks for request success case
      if (this.monitoringCallbacks && 'request' in this.monitoringCallbacks) {
        try {
          this.monitoringCallbacks.request({
            endpoint: url.origin,
            pathname: url.pathname,
            queryString: url.search,
            signer: response.data.signer,
            signature: response.data.signature,
            requestMethod: axiosRequest.method,
            status: response.status,
            responseTimeMillis: duration
          })
        } catch (e) {
          // Swallow errors -- this method should not throw generally
          console.error(e)
        }
      }
    } catch (e) {
      const error = e as AxiosError
      const resp = error.response
      const duration = Date.now() - start
      //const errData = error.response?.data ?? error
      const errData = error;
      //const errData = Object.assign(resp, error);

      // Fire monitoring callbacks for request failure case
      if (this.monitoringCallbacks && 'request' in this.monitoringCallbacks) {
        try {
          this.monitoringCallbacks.request({
            endpoint: url.origin,
            pathname: url.pathname,
            queryString: url.search,
            requestMethod: axiosRequest.method,
            status: resp?.status,
            responseTimeMillis: duration
          })
        } catch (e) {
          // Swallow errors -- this method should not throw generally
          console.error(e)
        }
      }
      if (resp && resp.status === 404) {
        // We have 404'd. Throw that error message back out
        throw { ...errData, status: '404' }
      }

      throw errData
    }
    return parsedResponse
  }

  /**
   * Gets how many blocks behind a discovery node is.
   * If this method throws (missing data in health check response),
   * return an unhealthy number of blocks
   * @param parsedResponse health check response object
   * @returns a number of blocks if behind or null if not behind
   */
  async _getBlocksBehind(parsedResponse: {
    latest_indexed_block: number
    latest_chain_block: number
  }) {
    try {
      const {
        latest_indexed_block: indexedBlock,
        latest_chain_block: chainBlock
      } = parsedResponse

      const blockDiff = chainBlock - indexedBlock
      if (blockDiff > this.unhealthyBlockDiff) {
        return blockDiff
      }
      return null
    } catch (e) {
      console.error(e)
      return this.unhealthyBlockDiff
    }
  }

  /**
   * Gets how many plays slots behind a discovery node is.
   * If this method throws (missing data in health check response),
   * return an unhealthy number of slots
   * @param parsedResponse health check response object
   * @returns a number of slots if behind or null if not behind
   */
  async _getPlaysSlotsBehind(parsedResponse: {
    latest_indexed_slot_plays: number
    latest_chain_slot_plays: number
  }) {
    if (!this.unhealthySlotDiffPlays) return null

    try {
      const {
        latest_indexed_slot_plays: indexedSlotPlays,
        latest_chain_slot_plays: chainSlotPlays
      } = parsedResponse

      const slotDiff = chainSlotPlays - indexedSlotPlays
      if (slotDiff > this.unhealthySlotDiffPlays) {
        return slotDiff
      }
      return null
    } catch (e) {
      console.error(e)
      return this.unhealthySlotDiffPlays
    }
  }

  /**
   * Makes a request to a discovery node, reselecting if necessary
   * @param {{
   *  endpoint: string
   *  urlParams: object
   *  queryParams: object
   *  method: string
   *  headers: object
   * }} {
   *  endpoint: the base route
   *  urlParams: string of URL params to be concatenated after base route
   *  queryParams: URL query (search) params
   *  method: string HTTP method
   * }
   * @param retry whether to retry on failure
   * @param attemptedRetries number of attempted retries (stops retrying at max)
   */
  async _makeRequest<Response>(
    requestObj: Record<string, unknown>,
    retry = true,
    attemptedRetries = 0,
    throwError = false
  ): Promise<Response | undefined | null> {
    const returnOrThrow = <ErrorType>(e: ErrorType) => {
      if (throwError) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw e
      }
      return null
    }

    try {
      const newDiscProvEndpoint =
        await this.getHealthyDiscoveryNodeEndpoint(attemptedRetries)

      // If new DP endpoint is selected, update disc prov endpoint and reset attemptedRetries count
      if (this.discoveryNodeEndpoint !== newDiscProvEndpoint) {
        let updateDiscProvEndpointMsg = `Current Discovery Node endpoint ${this.discoveryNodeEndpoint} is unhealthy. `
        updateDiscProvEndpointMsg += `Switching over to the new Discovery Node endpoint ${newDiscProvEndpoint}!`
        console.info(updateDiscProvEndpointMsg)
        this.discoveryNodeEndpoint = newDiscProvEndpoint
        attemptedRetries = 0
      }
    } catch (e) {
      console.error(e)
      return
    }
    let parsedResponse: {
      latest_indexed_block: number
      latest_chain_block: number
      latest_indexed_slot_plays: number
      latest_chain_slot_plays: number
      data: Response
    }
    try {
      parsedResponse = await this._performRequestWithMonitoring(
        requestObj as RequestParams,
        this.discoveryNodeEndpoint
      )
    } catch (e) {
      const error = e as { message: string; status: string }
      const failureStr = 'Failed to make Discovery Node request, '
      const attemptStr = `attempt #${attemptedRetries}, `
      const errorStr = `error ${JSON.stringify(error.message)}, `
      const requestStr = `request: ${JSON.stringify(requestObj)}`
      const fullErrString = `${failureStr}${attemptStr}${errorStr}${requestStr}`

      console.warn(fullErrString)

      if (retry) {
        if (error.status === '404') {
          this.request404Count += 1
          if (this.request404Count < this.maxRequestsForTrue404) {
            // In the case of a 404, retry with a different discovery node entirely
            // using selectionRequestRetries + 1 to force reselection
            return await this._makeRequest(
              requestObj,
              retry,
              this.selectionRequestRetries + 1,
              throwError
            )
          } else {
            this.request404Count = 0
            return returnOrThrow(e)
          }
        }

        // In the case of an unknown error, retry with attempts += 1
        return await this._makeRequest(
          requestObj,
          retry,
          attemptedRetries + 1,
          throwError
        )
      }

      return returnOrThrow(e)
    }

    // Validate health check response

    // Regressed mode signals we couldn't find a node that wasn't behind by some measure
    // so we should should pick something
    const notInRegressedMode =
      this.ethContracts && !this.ethContracts.isInRegressedMode()

    const blockDiff = await this._getBlocksBehind(parsedResponse)
    if (notInRegressedMode && blockDiff) {
      const errorMessage = `${this.discoveryNodeEndpoint} is too far behind [block diff: ${blockDiff}]`
      if (retry) {
        console.info(
          `${errorMessage}. Retrying request at attempt #${attemptedRetries}...`
        )
        return await this._makeRequest(
          requestObj,
          retry,
          attemptedRetries + 1,
          throwError
        )
      }
      return returnOrThrow(new Error(errorMessage))
    }

    const playsSlotDiff = await this._getPlaysSlotsBehind(parsedResponse)
    if (notInRegressedMode && playsSlotDiff) {
      const errorMessage = `${this.discoveryNodeEndpoint} is too far behind [slot diff: ${playsSlotDiff}]`
      if (retry) {
        console.info(
          `${errorMessage}. Retrying request at attempt #${attemptedRetries}...`
        )
        return await this._makeRequest(
          requestObj,
          retry,
          attemptedRetries + 1,
          throwError
        )
      }
      return returnOrThrow(new Error(errorMessage))
    }

    // Reset 404 counts
    this.request404Count = 0

    // Everything looks good, return the data!
    return parsedResponse.data
  }

  /**
   * Gets the healthy discovery node endpoint used in creating the axios request later.
   * If the number of retries is over the max count for retires, clear the cache and reselect
   * another healthy discovery node. Else, return the current discovery node endpoint
   * @param attemptedRetries the number of attempted requests made to the current disc prov endpoint
   */
  async getHealthyDiscoveryNodeEndpoint(attemptedRetries: number) {
    let endpoint = this.discoveryNodeEndpoint as string
    if (attemptedRetries > this.selectionRequestRetries || !endpoint) {
      // Add to unhealthy list if current disc prov endpoint has reached max retry count
      console.info(`Attempted max retries with endpoint ${endpoint}`)
      this.serviceSelector.addUnhealthy(endpoint)

      // Clear the cached endpoint and select new endpoint from backups
      this.serviceSelector.clearCached()
      endpoint = await this.serviceSelector.select()
    }

    // If there are no more available backups, throw error
    if (!endpoint) {
      throw new Error('All Discovery Nodes are unhealthy and unavailable.')
    }

    return endpoint
  }

  /**
   * Creates the discovery node axios request object with necessary configs
   * @param requestObj
   * @param discoveryNodeEndpoint
   */
  _createDiscProvRequest(
    requestObj: RequestParams,
    discoveryNodeEndpoint: string
  ) {
    // Sanitize URL params if needed
    if (requestObj.queryParams) {
      Object.entries(requestObj.queryParams).forEach(([k, v]) => {
        if (v === undefined || v === null) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete requestObj.queryParams[k]
        }
      })
    }

    const requestUrl = urlJoin(
      discoveryNodeEndpoint,
      requestObj.endpoint,
      requestObj.urlParams,
      { query: requestObj.queryParams }
    )

    let headers: Record<string, string> = {}
    if (requestObj.headers) {
      headers = requestObj.headers
    }
    const currentUserId = this.userStateManager.getCurrentUserId()
    if (currentUserId) {
      headers['X-User-ID'] = currentUserId as unknown as string
    }

    const timeout = requestObj.timeout ?? this.selectionRequestTimeout
    let axiosRequest: AxiosRequestConfig = {
      url: requestUrl,
      headers: headers,
      method: requestObj.method ?? 'get',
      timeout
    }

    if (requestObj.method === 'post' && requestObj.data) {
      axiosRequest = {
        ...axiosRequest,
        data: requestObj.data
      }
    }
    return axiosRequest
  }
}
