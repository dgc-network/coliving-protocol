/* eslint-disable @typescript-eslint/restrict-plus-operands */

import type { Nullable } from '../../utils'

export const getUsers = (
  limit = 100,
  offset = 0,
  idsArray: Nullable<number[]>,
  walletAddress?: Nullable<string>,
  handle?: Nullable<string>,
  minBlockNumber?: Nullable<number>
) => {
  type QueryParams = {
    limit: number
    offset: number
    handle?: string
    wallet?: string
    min_block_number?: number
    id?: string[]
  }

  const queryParams: QueryParams = { limit: limit, offset: offset }
  if (handle) {
    queryParams.handle = handle
  }
  if (walletAddress) {
    queryParams.wallet = walletAddress
  }
  if (minBlockNumber) {
    queryParams.min_block_number = minBlockNumber
  }
  if (idsArray != null) {
    if (!Array.isArray(idsArray)) {
      throw new Error('Expected integer array of user ids')
    }
    queryParams.id = idsArray as unknown as string[]
  }

  const req = { endpoint: 'users', queryParams }

  return req
}

export const getAgreements = (
  limit = 100,
  offset = 0,
  idsArray: Nullable<string[]>,
  targetUserId: Nullable<string>,
  sort: Nullable<boolean>,
  minBlockNumber: Nullable<number>,
  filterDeleted: Nullable<boolean>,
  withUsers = false
) => {
  type QueryParams = {
    limit: number
    offset: number
    id?: string[]
    min_block_number?: number
    user_id?: string
    sort?: boolean
    filter_deleted?: boolean
    with_users?: boolean
  }

  const queryParams: QueryParams = { limit: limit, offset: offset }

  if (idsArray) {
    if (!Array.isArray(idsArray)) {
      throw new Error('Expected array of digital_content ids')
    }
    queryParams.id = idsArray
  }
  if (minBlockNumber) {
    queryParams.min_block_number = minBlockNumber
  }
  if (targetUserId) {
    queryParams.user_id = targetUserId
  }
  if (sort) {
    queryParams.sort = sort
  }
  if (typeof filterDeleted === 'boolean') {
    queryParams.filter_deleted = filterDeleted
  }
  if (withUsers) {
    queryParams.with_users = true
  }

  const req = { endpoint: 'agreements', queryParams }
  return req
}

export const getAgreementsByHandleAndSlug = (handle: string, slug: string) => {
  return {
    endpoint: 'v1/agreements',
    method: 'get',
    queryParams: { handle, slug }
  }
}

export const getAgreementsIncludingUnlisted = (
  identifiers: string[],
  withUsers = false
) => {
  const queryParams: { with_users?: boolean } = {}

  if (withUsers) {
    queryParams.with_users = true
  }

  const req = {
    endpoint: 'agreements_including_unlisted',
    method: 'post',
    data: {
      agreements: identifiers
    },
    queryParams
  }

  return req
}

export const getRandomAgreements = (
  genre: string,
  limit: number,
  exclusionList: number[],
  time: string
) => {
  const req = {
    endpoint: 'agreements/random',
    queryParams: {
      genre,
      limit,
      exclusionList,
      time
    }
  }
  return req
}

export const getStemsForAgreement = (agreementId: number) => {
  const req = {
    endpoint: `stems/${agreementId}`,
    queryParams: {
      with_users: true
    }
  }
  return req
}

export const getRemixesOfAgreement = (
  agreementId: number,
  limit: number | null = null,
  offset: number | null = null
) => {
  const req = {
    endpoint: `remixes/${agreementId}/children`,
    queryParams: {
      with_users: true,
      limit,
      offset
    }
  }
  return req
}

export const getRemixAgreementParents = (
  agreementId: number,
  limit: number | null = null,
  offset: number | null = null
) => {
  const req = {
    endpoint: `remixes/${agreementId}/parents`,
    queryParams: {
      with_users: true,
      limit,
      offset
    }
  }
  return req
}

export const getTrendingAgreements = (
  genre: string | null = null,
  timeFrame: string | null = null,
  idsArray: number[] | null = null,
  limit: number | null = null,
  offset: number | null = null,
  withUsers = false
) => {
  let endpoint = '/trending/'

  if (timeFrame != null) {
    switch (timeFrame) {
      case 'day':
      case 'week':
      case 'month':
      case 'year':
        break
      default:
        throw new Error('Invalid timeFrame value provided')
    }
    endpoint += `${endpoint}${timeFrame}`
  }

  const req = {
    endpoint,
    method: 'get',
    queryParams: {
      ...(idsArray !== null ? { id: idsArray } : {}),
      ...(limit !== null ? { limit } : {}),
      ...(offset !== null ? { offset } : {}),
      ...(genre !== null ? { genre } : {}),
      ...(withUsers ? { with_users: withUsers } : {})
    }
  }
  return req
}

export const getContentLists = (
  limit = 100,
  offset = 0,
  idsArray: Nullable<number[]> = null,
  targetUserId: Nullable<number> = null,
  withUsers = false
) => {
  if (idsArray != null) {
    if (!Array.isArray(idsArray)) {
      throw new Error('Expected integer array of user ids')
    }
  }
  return {
    endpoint: 'contentLists',
    queryParams: {
      limit,
      offset,
      ...(idsArray != null ? { content_list_id: idsArray } : {}),
      ...(targetUserId ? { user_id: targetUserId } : {}),
      ...(withUsers ? { with_users: true } : {})
    }
  }
}

export const getSocialFeed = (
  filter: string,
  limit = 100,
  offset = 0,
  withUsers = false,
  agreementsOnly = false
) => {
  return {
    endpoint: 'feed',
    queryParams: {
      filter,
      limit,
      offset,
      with_users: withUsers,
      agreements_only: agreementsOnly
    }
  }
}

export const getUserRepostFeed = (
  userId: number,
  limit = 100,
  offset = 0,
  withUsers = false
) => {
  return {
    endpoint: 'feed',
    urlParams: '/reposts/' + userId,
    queryParams: { limit, offset, with_users: withUsers }
  }
}

export const getFollowIntersectionUsers = (
  limit = 100,
  offset = 0,
  followeeUserId: number,
  followerUserId: number
) => {
  return {
    endpoint: 'users',
    urlParams: '/intersection/follow/' + followeeUserId + '/' + followerUserId,
    queryParams: { limit, offset }
  }
}

export const getAgreementRepostIntersectionUsers = (
  limit = 100,
  offset = 0,
  repostAgreementId: number,
  followerUserId: number
) => {
  return {
    endpoint: 'users',
    urlParams:
      '/intersection/repost/digital_content/' + repostAgreementId + '/' + followerUserId,
    queryParams: { limit: limit, offset: offset }
  }
}

export const getContentListRepostIntersectionUsers = (
  limit = 100,
  offset = 0,
  repostContentListId: number,
  followerUserId: number
) => {
  return {
    endpoint: 'users',
    urlParams:
      '/intersection/repost/contentList/' +
      repostContentListId +
      '/' +
      followerUserId,
    queryParams: { limit: limit, offset: offset }
  }
}

export const getFollowersForUser = (
  limit = 100,
  offset = 0,
  followeeUserId: string
) => {
  return {
    endpoint: 'users',
    urlParams: '/followers/' + followeeUserId,
    queryParams: { limit: limit, offset: offset }
  }
}

export const getFolloweesForUser = (
  limit = 100,
  offset = 0,
  followerUserId: string
) => {
  return {
    endpoint: 'users',
    urlParams: '/followees/' + followerUserId,
    queryParams: { limit: limit, offset: offset }
  }
}

export const getRepostersForAgreement = (
  limit = 100,
  offset = 0,
  repostAgreementId: number
) => {
  return {
    endpoint: 'users',
    urlParams: '/reposts/digital_content/' + repostAgreementId,
    queryParams: { limit: limit, offset: offset }
  }
}

export const getRepostersForContentList = (
  limit = 100,
  offset = 0,
  repostContentListId: number
) => {
  return {
    endpoint: 'users',
    urlParams: '/reposts/contentList/' + repostContentListId,
    queryParams: { limit: limit, offset: offset }
  }
}

export const getSaversForAgreement = (
  limit = 100,
  offset = 0,
  saveAgreementId: number
) => {
  return {
    endpoint: 'users',
    urlParams: '/saves/digital_content/' + saveAgreementId,
    queryParams: { limit: limit, offset: offset }
  }
}

export const getSaversForContentList = (
  limit = 100,
  offset = 0,
  saveContentListId: number
) => {
  return {
    endpoint: 'users',
    urlParams: '/saves/contentList/' + saveContentListId,
    queryParams: { limit: limit, offset: offset }
  }
}

export const searchFull = (
  text: string,
  kind: string,
  limit = 100,
  offset = 0
) => {
  return {
    endpoint: 'search/full',
    queryParams: { query: text, kind, limit, offset }
  }
}

export const searchAutocomplete = (text: string, limit = 100, offset = 0) => {
  return {
    endpoint: 'search/autocomplete',
    queryParams: { query: text, limit: limit, offset: offset }
  }
}

export const searchTags = (
  text: string,
  userTagCount = 2,
  kind = 'all',
  limit = 100,
  offset = 0
) => {
  return {
    endpoint: 'search/tags',
    queryParams: {
      query: text,
      user_tag_count: userTagCount,
      kind,
      limit,
      offset
    }
  }
}

export const getSavedContentLists = (
  limit = 100,
  offset = 0,
  withUsers = false
) => {
  return {
    endpoint: 'saves/contentLists',
    queryParams: { limit: limit, offset: offset, with_users: withUsers }
  }
}

export const getSavedAlbums = (limit = 100, offset = 0, withUsers = false) => {
  return {
    endpoint: 'saves/albums',
    queryParams: { limit: limit, offset: offset, with_users: withUsers }
  }
}

export const getSavedAgreements = (limit = 100, offset = 0, withUsers = false) => {
  return {
    endpoint: 'saves/agreements',
    queryParams: { limit: limit, offset: offset, with_users: withUsers }
  }
}

/**
 * Return user collections (saved & uploaded) along w/ users for those collections
 */
export const getUserAccount = (wallet: string) => {
  if (wallet === undefined) {
    throw new Error('Expected wallet to get user account')
  }
  return {
    endpoint: 'users/account',
    queryParams: { wallet }
  }
}

/**
 * @deprecated Migrate to using getTopFullContentLists
 */
export const getTopContentLists = (
  type: 'contentList' | 'album',
  limit: number,
  mood: string,
  filter: string,
  withUsers = false
) => {
  return {
    endpoint: `/top/${type}`,
    queryParams: {
      limit,
      mood,
      filter,
      with_users: withUsers
    }
  }
}

export type GetTopFullContentListsParams = {
  type: 'contentList' | 'album'
  limit?: number
  mood?: string
  filter?: string
  withUsers?: boolean
}

export const getTopFullContentLists = ({
  type,
  limit,
  mood,
  filter,
  withUsers = false
}: GetTopFullContentListsParams) => {
  return {
    endpoint: `/v1/full/contentLists/top`,
    queryParams: {
      type,
      limit,
      mood,
      filter,
      with_users: withUsers
    }
  }
}

/**
 * @deprecated Migrate to using getBestNewReleases
 */
export const getTopFolloweeWindowed = (
  type: string,
  window: string,
  limit: string,
  withUsers = false
) => {
  return {
    endpoint: `/top_followee_windowed/${type}/${window}`,
    queryParams: {
      limit,
      with_users: withUsers
    }
  }
}

export const getBestNewReleases = (
  window: string,
  limit: string,
  encodedUserId: string,
  withUsers = false
) => {
  return {
    endpoint: `/v1/full/agreements/best_new_releases`,
    queryParams: {
      window,
      limit,
      user_id: encodedUserId,
      with_users: withUsers
    }
  }
}

export const getMostLovedAgreements = (
  encodedUserId: string,
  limit: string,
  withUsers = false
) => {
  return {
    endpoint: `/v1/full/agreements/most_loved`,
    queryParams: {
      limit,
      user_id: encodedUserId,
      with_users: withUsers
    }
  }
}

export const getTopFolloweeSaves = (
  type: string,
  limit: string,
  withUsers = false
) => {
  return {
    endpoint: `/top_followee_saves/${type}`,
    queryParams: {
      limit,
      with_users: withUsers
    }
  }
}

export const getLatest = (type: string) => {
  return {
    endpoint: `/latest/${type}`
  }
}

export const getTopCreatorsByGenres = (
  genres: string[],
  limit = 30,
  offset = 0,
  withUsers = false
) => {
  return {
    endpoint: 'users/genre/top',
    queryParams: { genre: genres, limit, offset, with_users: withUsers }
  }
}

export const getURSMContentNodes = (ownerWallet: string | null) => {
  return {
    endpoint: 'ursm_content_nodes',
    queryParams: {
      owner_wallet: ownerWallet
    }
  }
}

export const getNotifications = (
  minBlockNumber: string,
  agreementIds: string[],
  timeout: number
) => {
  return {
    endpoint: 'notifications',
    queryParams: {
      min_block_number: minBlockNumber,
      digital_content_id: agreementIds
    },
    timeout
  }
}

export const getSolanaNotifications = (
  minSlotNumber: number,
  timeout: number
) => {
  return {
    endpoint: 'solana_notifications',
    queryParams: {
      min_slot_number: minSlotNumber
    },
    timeout
  }
}

export const getAgreementListenMilestones = (timeout: number) => {
  return {
    endpoint: 'digital_content_listen_milestones',
    timeout
  }
}

export const getChallengeAttestation = (
  challengeId: string,
  encodedUserId: string,
  specifier: string,
  oracleAddress: string
) => {
  return {
    endpoint: `/v1/challenges/${challengeId}/attest`,
    queryParams: {
      user_id: encodedUserId,
      specifier,
      oracle: oracleAddress
    }
  }
}

export const getCreateSenderAttestation = (senderEthAddress: string) => {
  return {
    endpoint: '/v1/challenges/attest_sender',
    queryParams: {
      sender_eth_address: senderEthAddress
    }
  }
}

export const getUndisbursedChallenges = (
  limit: number | null,
  offset: number | null,
  completedBlockNumber: string | null,
  encodedUserId: number | null
) => {
  return {
    endpoint: '/v1/challenges/undisbursed',
    queryParams: {
      limit,
      offset,
      completed_blocknumber: completedBlockNumber,
      user_id: encodedUserId
    }
  }
}

export const verifyToken = (token: string) => {
  return {
    endpoint: '/v1/users/verify_token',
    queryParams: {
      token: token
    }
  }
}
