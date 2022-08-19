const fs = require('fs')

const Playlist = {}

Playlist.createPlaylist = async (
  libs,
  userId,
  playlistName,
  isPrivate,
  isAlbum,
  agreementIds
) => {
  const createPlaylistTxReceipt = await libs.createPlaylist(
    userId,
    playlistName,
    isPrivate,
    isAlbum,
    agreementIds
  )
  return createPlaylistTxReceipt
}

Playlist.uploadPlaylistCoverPhoto = async (
  libs,
  coverPhotoFilePath
) => {
  const coverPhotoFile = fs.createReadStream(coverPhotoFilePath)
  const dirCid = await libs.uploadPlaylistCoverPhoto(coverPhotoFile)
  return dirCid
}

Playlist.updatePlaylistCoverPhoto = async (
  libs,
  playlistId,
  updatedPlaylistImageMultihashDigest
) => {
  const updatePlaylistCoverPhotoTxReceipt = await libs.updatePlaylistCoverPhoto(
    playlistId,
    updatedPlaylistImageMultihashDigest
  )
  return updatePlaylistCoverPhotoTxReceipt
}

Playlist.getPlaylists = async (
  libs,
  limit = 100,
  offset = 0,
  idsArray = null,
  targetUserId = null,
  withUsers = false
) => {
  return await libs.getPlaylists(limit, offset, idsArray, targetUserId, withUsers)
}

Playlist.addPlaylistAgreement = async (
  libs,
  playlistId,
  agreementId
) => {
  return await libs.addPlaylistAgreement(playlistId, agreementId)
}

module.exports = Playlist
