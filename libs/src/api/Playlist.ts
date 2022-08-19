import { Base, BaseConstructorArgs, Services } from './base'
import { Utils } from '../utils'
import type { TransactionReceipt } from 'web3-core'

const MAX_PLAYLIST_LENGTH = 200

export class Playlists extends Base {
  constructor(...args: BaseConstructorArgs) {
    super(...args)
    this.getPlaylists = this.getPlaylists.bind(this)
    this.getSavedPlaylists = this.getSavedPlaylists.bind(this)
    this.getSavedAlbums = this.getSavedAlbums.bind(this)
    this.createPlaylist = this.createPlaylist.bind(this)
    this.addPlaylistAgreement = this.addPlaylistAgreement.bind(this)
    this.orderPlaylistAgreements = this.orderPlaylistAgreements.bind(this)
    this.validateAgreementsInPlaylist = this.validateAgreementsInPlaylist.bind(this)
    this.uploadPlaylistCoverPhoto = this.uploadPlaylistCoverPhoto.bind(this)
    this.updatePlaylistCoverPhoto = this.updatePlaylistCoverPhoto.bind(this)
    this.updatePlaylistName = this.updatePlaylistName.bind(this)
    this.updatePlaylistDescription = this.updatePlaylistDescription.bind(this)
    this.updatePlaylistPrivacy = this.updatePlaylistPrivacy.bind(this)
    this.addPlaylistRepost = this.addPlaylistRepost.bind(this)
    this.deletePlaylistRepost = this.deletePlaylistRepost.bind(this)
    this.deletePlaylistAgreement = this.deletePlaylistAgreement.bind(this)
    this.addPlaylistSave = this.addPlaylistSave.bind(this)
    this.deletePlaylistSave = this.deletePlaylistSave.bind(this)
    this.deletePlaylist = this.deletePlaylist.bind(this)
  }

  /* ------- GETTERS ------- */

  /**
   * get full playlist objects, including agreements, for passed in array of playlistId
   * @param limit max # of items to return
   * @param offset offset into list to return from (for pagination)
   * @param idsArray list of playlist ids
   * @param targetUserId the user whose playlists we're trying to get
   * @param withUsers whether to return users nested within the collection objects
   * @returns array of playlist objects
   * additional metadata fields on playlist objects:
   *  {Integer} repost_count - repost count for given playlist
   *  {Integer} save_count - save count for given playlist
   *  {Boolean} has_current_user_reposted - has current user reposted given playlist
   *  {Array} followee_reposts - followees of current user that have reposted given playlist
   *  {Boolean} has_current_user_reposted - has current user reposted given playlist
   *  {Boolean} has_current_user_saved - has current user saved given playlist
   */
  async getPlaylists(
    limit = 100,
    offset = 0,
    idsArray = null,
    targetUserId = null,
    withUsers = false
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getPlaylists(
      limit,
      offset,
      idsArray,
      targetUserId,
      withUsers
    )
  }

  /**
   * Return saved playlists for current user
   * NOTE in returned JSON, SaveType string one of agreement, playlist, album
   * @param limit - max # of items to return
   * @param offset - offset into list to return from (for pagination)
   */
  async getSavedPlaylists(limit = 100, offset = 0, withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getSavedPlaylists(
      limit,
      offset,
      withUsers
    )
  }

  /**
   * Return saved albums for current user
   * NOTE in returned JSON, SaveType string one of agreement, playlist, album
   * @param limit - max # of items to return
   * @param offset - offset into list to return from (for pagination)
   */
  async getSavedAlbums(limit = 100, offset = 0, withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getSavedAlbums(limit, offset, withUsers)
  }

  /* ------- SETTERS ------- */

  /**
   * Creates a new playlist
   */
  async createPlaylist(
    userId: number,
    playlistName: string,
    isPrivate: boolean,
    isAlbum: boolean,
    agreementIds: number[]
  ) {
    const maxInitialAgreements = 50
    const createInitialIdsArray = agreementIds.slice(0, maxInitialAgreements)
    const postInitialIdsArray = agreementIds.slice(maxInitialAgreements)
    let playlistId: number
    let receipt: Partial<TransactionReceipt> = {}
    try {
      const response =
        await this.contracts.PlaylistFactoryClient.createPlaylist(
          userId,
          playlistName,
          isPrivate,
          isAlbum,
          createInitialIdsArray
        )
      playlistId = response.playlistId
      receipt = response.txReceipt

      // Add remaining agreements
      await Promise.all(
        postInitialIdsArray.map(async (agreementId) => {
          return await this.contracts.PlaylistFactoryClient.addPlaylistAgreement(
            playlistId,
            agreementId
          )
        })
      )

      // Order agreements
      if (postInitialIdsArray.length > 0) {
        receipt =
          await this.contracts.PlaylistFactoryClient.orderPlaylistAgreements(
            playlistId,
            agreementIds
          )
      }
    } catch (e) {
      console.debug(
        `Reached libs createPlaylist catch block with playlist id ${playlistId!}`
      )
      console.error(e)
      return { playlistId: playlistId!, error: true }
    }
    return {
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber,
      playlistId,
      error: false
    }
  }

  /**
   * Adds a agreement to a given playlist
   */
  async addPlaylistAgreement(playlistId: number, agreementId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)

    const userId = this.userStateManager.getCurrentUserId()
    const playlist = await this.discoveryProvider.getPlaylists(
      100,
      0,
      [playlistId],
      userId
    )

    // error if playlist does not exist or hasn't been indexed by discovery node
    if (!Array.isArray(playlist) || !playlist.length) {
      throw new Error(
        'Cannot add agreement - Playlist does not exist or has not yet been indexed by discovery node'
      )
    }
    // error if playlist already at max length
    if (
      playlist[0]!.playlist_contents.agreement_ids.length >= MAX_PLAYLIST_LENGTH
    ) {
      throw new Error(
        `Cannot add agreement - playlist is already at max length of ${MAX_PLAYLIST_LENGTH}`
      )
    }
    return await this.contracts.PlaylistFactoryClient.addPlaylistAgreement(
      playlistId,
      agreementId
    )
  }

  /**
   * Reorders the agreements in a playlist
   */
  async orderPlaylistAgreements(
    playlistId: number,
    agreementIds: number[],
    retriesOverride?: number
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    if (!Array.isArray(agreementIds)) {
      throw new Error('Cannot order playlist - agreementIds must be array')
    }

    const userId = this.userStateManager.getCurrentUserId()
    const playlist = await this.discoveryProvider.getPlaylists(
      100,
      0,
      [playlistId],
      userId
    )

    // error if playlist does not exist or hasn't been indexed by discovery node
    if (!Array.isArray(playlist) || !playlist.length) {
      throw new Error(
        'Cannot order playlist - Playlist does not exist or has not yet been indexed by discovery node'
      )
    }

    const playlistAgreementIds = playlist[0]!.playlist_contents.agreement_ids.map(
      (a) => a.agreement
    )
    // error if agreementIds arg array length does not match playlist length
    if (agreementIds.length !== playlistAgreementIds.length) {
      throw new Error(
        'Cannot order playlist - agreementIds length must match playlist length'
      )
    }

    // ensure existing playlist agreements and agreementIds have same content, regardless of order
    const agreementIdsSorted = [...agreementIds].sort()
    const playlistAgreementIdsSorted = playlistAgreementIds.sort()
    for (let i = 0; i < agreementIdsSorted.length; i++) {
      if (agreementIdsSorted[i] !== playlistAgreementIdsSorted[i]) {
        throw new Error(
          'Cannot order playlist - agreementIds must have same content as playlist agreements'
        )
      }
    }

    return await this.contracts.PlaylistFactoryClient.orderPlaylistAgreements(
      playlistId,
      agreementIds,
      retriesOverride
    )
  }

  /**
   * Checks if a playlist has entered a corrupted state
   * Check that each of the agreements within a playlist retrieved from discprov are in the onchain playlist
   * Note: the onchain playlists stores the agreements as a mapping of agreement ID to agreement count and the
   * agreement order is an event that is indexed by discprov. The agreement order event does not validate that the
   * updated order of agreements has the correct agreement count, so a agreement order event w/ duplicate agreements can
   * lead the playlist entering a corrupted state.
   */
  async validateAgreementsInPlaylist(playlistId: number) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER, Services.CREATOR_NODE)

    const userId = this.userStateManager.getCurrentUserId()
    const playlistsReponse = await this.discoveryProvider.getPlaylists(
      1,
      0,
      [playlistId],
      userId
    )

    // error if playlist does not exist or hasn't been indexed by discovery node
    if (!Array.isArray(playlistsReponse) || !playlistsReponse.length) {
      throw new Error(
        'Cannot validate playlist - Playlist does not exist, is private and not owned by current user or has not yet been indexed by discovery node'
      )
    }

    const playlist = playlistsReponse[0]!
    const playlistAgreementIds = playlist.playlist_contents.agreement_ids.map(
      (a) => a.agreement
    )

    // Check if each agreement is in the playlist
    const invalidAgreementIds = []
    for (const agreementId of playlistAgreementIds) {
      const agreementInPlaylist =
        await this.contracts.PlaylistFactoryClient.isAgreementInPlaylist(
          playlistId,
          agreementId
        )
      if (!agreementInPlaylist) invalidAgreementIds.push(agreementId)
    }

    return {
      isValid: invalidAgreementIds.length === 0,
      invalidAgreementIds
    }
  }

  /**
   * Uploads a cover photo for a playlist without updating the actual playlist
   * @param coverPhotoFile the file to upload as the cover photo
   * @return CID of the uploaded cover photo
   */
  async uploadPlaylistCoverPhoto(coverPhotoFile: File) {
    this.REQUIRES(Services.CREATOR_NODE)

    const updatedPlaylistImage = await this.creatorNode.uploadImage(
      coverPhotoFile,
      true // square
    )
    return updatedPlaylistImage.dirCID
  }

  /**
   * Updates the cover photo for a playlist
   */
  async updatePlaylistCoverPhoto(playlistId: number, coverPhoto: File) {
    this.REQUIRES(Services.CREATOR_NODE)

    const updatedPlaylistImageDirCid = await this.uploadPlaylistCoverPhoto(
      coverPhoto
    )
    return await this.contracts.PlaylistFactoryClient.updatePlaylistCoverPhoto(
      playlistId,
      Utils.formatOptionalMultihash(updatedPlaylistImageDirCid)
    )
  }

  /**
   * Updates a playlist name
   */
  async updatePlaylistName(playlistId: number, playlistName: string) {
    return await this.contracts.PlaylistFactoryClient.updatePlaylistName(
      playlistId,
      playlistName
    )
  }

  /**
   * Updates a playlist description
   * @param playlistId
   * @param updatedPlaylistDescription
   */
  async updatePlaylistDescription(
    playlistId: number,
    updatedPlaylistDescription: string
  ) {
    return await this.contracts.PlaylistFactoryClient.updatePlaylistDescription(
      playlistId,
      updatedPlaylistDescription
    )
  }

  /**
   * Updates whether a playlist is public or private
   */
  async updatePlaylistPrivacy(
    playlistId: number,
    updatedPlaylistPrivacy: boolean
  ) {
    return await this.contracts.PlaylistFactoryClient.updatePlaylistPrivacy(
      playlistId,
      updatedPlaylistPrivacy
    )
  }

  /**
   * Reposts a playlist for a user
   */
  async addPlaylistRepost(playlistId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.SocialFeatureFactoryClient.addPlaylistRepost(
      userId!,
      playlistId
    )
  }

  /**
   * Undoes a repost on a playlist for a user
   */
  async deletePlaylistRepost(playlistId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.SocialFeatureFactoryClient.deletePlaylistRepost(
      userId!,
      playlistId
    )
  }

  /**
   * Marks a agreement to be deleted from a playlist. The playlist entry matching
   * the provided timestamp is deleted in the case of duplicates.
   * @param playlistId
   * @param deletedAgreementId
   * @param deletedPlaylistTimestamp parseable timestamp (to be copied from playlist metadata)
   * @param {number?} retriesOverride [Optional, defaults to web3Manager.sendTransaction retries default]
   */
  async deletePlaylistAgreement(
    playlistId: number,
    deletedAgreementId: number,
    deletedPlaylistTimestamp: number,
    retriesOverride?: number
  ) {
    return await this.contracts.PlaylistFactoryClient.deletePlaylistAgreement(
      playlistId,
      deletedAgreementId,
      deletedPlaylistTimestamp,
      retriesOverride
    )
  }

  /**
   * Saves a playlist on behalf of a user
   */
  async addPlaylistSave(playlistId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.UserLibraryFactoryClient.addPlaylistSave(
      userId!,
      playlistId
    )
  }

  /**
   * Unsaves a playlist on behalf of a user
   */
  async deletePlaylistSave(playlistId: number) {
    const userId = this.userStateManager.getCurrentUserId()
    return await this.contracts.UserLibraryFactoryClient.deletePlaylistSave(
      userId!,
      playlistId
    )
  }

  /**
   * Marks a playlist as deleted
   */
  async deletePlaylist(playlistId: number) {
    return await this.contracts.PlaylistFactoryClient.deletePlaylist(playlistId)
  }
}
