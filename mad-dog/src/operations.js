// Common operation types for tests.

const OPERATION_TYPE = Object.freeze({
  AGREEMENT_UPLOAD: 'AGREEMENT_UPLOAD',
  AGREEMENT_REPOST: 'AGREEMENT_REPOST',
  ADD_PLAYLIST_AGREEMENT: 'ADD_PLAYLIST_AGREEMENT',
  CREATE_PLAYLIST: 'CREATE_PLAYLIST'
})

function AgreementUploadRequest (walletIndex, userId) {
  return {
    type: OPERATION_TYPE.AGREEMENT_UPLOAD,
    walletIndex,
    userId
  }
}

function AgreementUploadResponse (
  walletIndex,
  agreementId,
  metadata,
  success = true,
  error = null
) {
  return {
    type: OPERATION_TYPE.AGREEMENT_UPLOAD,
    walletIndex,
    agreementId,
    metadata,
    success,
    error
  }
}

function AgreementRepostRequest (walletIndex, userId) {
  return {
    type: OPERATION_TYPE.AGREEMENT_REPOST,
    walletIndex,
    userId
  }
}

function AgreementRepostResponse (
  walletIndex,
  agreementId,
  userId,
  success = true,
  error = null
) {
  return {
    type: OPERATION_TYPE.AGREEMENT_REPOST,
    walletIndex,
    agreementId,
    userId,
    success,
    error
  }
}

function AddPlaylistAgreementRequest (walletIndex, userId) {
  return {
    type: OPERATION_TYPE.ADD_PLAYLIST_AGREEMENT,
    walletIndex,
    userId
  }
}

function AddPlaylistAgreementResponse (
  walletIndex,
  agreementId,
  success = true,
  error = null
) {
  return {
    type: OPERATION_TYPE.ADD_PLAYLIST_AGREEMENT,
    walletIndex,
    agreementId,
    success,
    error
  }
}

function CreatePlaylistRequest (walletIndex, userId) {
  return {
    type: OPERATION_TYPE.CREATE_PLAYLIST,
    walletIndex,
    userId
  }
}

function CreatePlaylistResponse (
  walletIndex,
  playlist,
  userId,
  success = true,
  error = null
) {
  return {
    type: OPERATION_TYPE.CREATE_PLAYLIST,
    walletIndex,
    playlist,
    userId,
    success,
    error
  }
}

module.exports = {
  OPERATION_TYPE,
  AgreementUploadRequest,
  AgreementUploadResponse,
  AgreementRepostRequest,
  AgreementRepostResponse,
  AddPlaylistAgreementRequest,
  AddPlaylistAgreementResponse,
  CreatePlaylistRequest,
  CreatePlaylistResponse
}
