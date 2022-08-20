// Common operation types for tests.

const OPERATION_TYPE = Object.freeze({
  AGREEMENT_UPLOAD: 'AGREEMENT_UPLOAD',
  AGREEMENT_REPOST: 'AGREEMENT_REPOST',
  ADD_CONTENT_LIST_AGREEMENT: 'ADD_CONTENT_LIST_AGREEMENT',
  CREATE_CONTENT_LIST: 'CREATE_CONTENT_LIST'
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

function AddContentListAgreementRequest (walletIndex, userId) {
  return {
    type: OPERATION_TYPE.ADD_CONTENT_LIST_AGREEMENT,
    walletIndex,
    userId
  }
}

function AddContentListAgreementResponse (
  walletIndex,
  agreementId,
  success = true,
  error = null
) {
  return {
    type: OPERATION_TYPE.ADD_CONTENT_LIST_AGREEMENT,
    walletIndex,
    agreementId,
    success,
    error
  }
}

function CreateContentListRequest (walletIndex, userId) {
  return {
    type: OPERATION_TYPE.CREATE_CONTENT_LIST,
    walletIndex,
    userId
  }
}

function CreateContentListResponse (
  walletIndex,
  content list,
  userId,
  success = true,
  error = null
) {
  return {
    type: OPERATION_TYPE.CREATE_CONTENT_LIST,
    walletIndex,
    content list,
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
  AddContentListAgreementRequest,
  AddContentListAgreementResponse,
  CreateContentListRequest,
  CreateContentListResponse
}
