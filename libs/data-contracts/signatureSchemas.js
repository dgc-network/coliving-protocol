/**
 * This file includes schemas for use in EIP-712 compliant signature generation and
 * signature validation, generator functions for generating data
 * in the form needed by eth_personalSign / eth-sig-util's signTypedData functions,
 * generators for contract signing domains, and a helper function for generating
 * cryptographically secure nonces in nodejs or in the browser.
 * modeled off: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md
 */

const domains = {}

function getDomainData (contractName, signatureVersion, chainId, contractAddress) {
  return {
    name: contractName,
    version: signatureVersion,
    chainId: chainId,
    verifyingContract: contractAddress
  }
}

domains.getSocialFeatureFactoryDomain = function (chainId, contractAddress) {
  return getDomainData('Social Feature Factory', '1', chainId, contractAddress)
}

domains.getUserFactoryDomain = function (chainId, contractAddress) {
  return getDomainData('User Factory', '1', chainId, contractAddress)
}

domains.getAgreementFactoryDomain = function (chainId, contractAddress) {
  return getDomainData('Agreement Factory', '1', chainId, contractAddress)
}

domains.getContentListFactoryDomain = function (chainId, contractAddress) {
  return getDomainData('ContentList Factory', '1', chainId, contractAddress)
}

domains.getUserLibraryFactoryDomain = function (chainId, contractAddress) {
  return getDomainData('User Library Factory', '1', chainId, contractAddress)
}

domains.getIPLDBlacklistFactoryDomain = function (chainId, contractAddress) {
  return getDomainData('IPLD Blacklist Factory', '1', chainId, contractAddress)
}

domains.getUserReplicaSetManagerDomain = function (chainId, contractAddress) {
  return getDomainData('User Replica Set Manager', '1', chainId, contractAddress)
}

domains.getEntityManagerDomain = function (chainId, contractAddress) {
  return getDomainData("Entity Manager", "1", chainId, contractAddress)
}

const schemas = {}

/* contract signing domain */
schemas.domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' }
]

/* user factory requests */
schemas.addUserRequest = [
  { name: 'handle', type: 'bytes16' },
  { name: 'nonce', type: 'bytes32' }
]

/* rather than having a schema type for every update op, we have a type for each unique
 * structure */
schemas.updateUserBytes32 = [
  { name: 'userId', type: 'uint' },
  { name: 'newValue', type: 'bytes32' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.updateUserString = [
  { name: 'userId', type: 'uint' },
  { name: 'newValue', type: 'string' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.updateUserBool = [
  { name: 'userId', type: 'uint' },
  { name: 'newValue', type: 'bool' },
  { name: 'nonce', type: 'bytes32' }
]

/* agreement factory requests */
schemas.addAgreementRequest = [
  { name: 'agreementOwnerId', type: 'uint' },
  { name: 'multihashDigest', type: 'bytes32' },
  { name: 'multihashHashFn', type: 'uint8' },
  { name: 'multihashSize', type: 'uint8' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.updateAgreementRequest = [
  { name: 'agreementId', type: 'uint' },
  { name: 'agreementOwnerId', type: 'uint' },
  { name: 'multihashDigest', type: 'bytes32' },
  { name: 'multihashHashFn', type: 'uint8' },
  { name: 'multihashSize', type: 'uint8' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.deleteAgreementRequest = [
  { name: 'agreementId', type: 'uint' },
  { name: 'nonce', type: 'bytes32' }
]

/* social features */
schemas.addAgreementRepostRequest = [
  { name: 'userId', type: 'uint' },
  { name: 'agreementId', type: 'uint' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.deleteAgreementRepostRequest = schemas.addAgreementRepostRequest

schemas.addContentListRepostRequest = [
  { name: 'userId', type: 'uint' },
  { name: 'contentListId', type: 'uint' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.deleteContentListRepostRequest = schemas.addContentListRepostRequest

schemas.userFollowRequest = [
  { name: 'followerUserId', type: 'uint' },
  { name: 'followeeUserId', type: 'uint' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.deleteUserFollowRequest = schemas.userFollowRequest

schemas.createContentListRequest = [
  { name: 'contentListOwnerId', type: 'uint' },
  { name: 'contentListName', type: 'string' },
  { name: 'isPrivate', type: 'bool' },
  { name: 'isAlbum', type: 'bool' },
  { name: 'agreementIdsHash', type: 'bytes32' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.deleteContentListRequest = [
  { name: 'contentListId', type: 'uint' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.addContentListAgreementRequest = [
  { name: 'contentListId', type: 'uint' },
  { name: 'addedAgreementId', type: 'uint' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.deleteContentListAgreementRequest = [
  { name: 'contentListId', type: 'uint' },
  { name: 'deletedAgreementId', type: 'uint' },
  { name: 'deletedAgreementTimestamp', type: 'uint' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.orderContentListAgreementsRequest = [
  { name: 'contentListId', type: 'uint' },
  { name: 'agreementIdsHash', type: 'bytes32' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.updateContentListPrivacyRequest = [
  { name: 'contentListId', type: 'uint' },
  { name: 'updatedContentListPrivacy', type: 'bool' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.updateContentListNameRequest = [
  { name: 'contentListId', type: 'uint' },
  { name: 'updatedContentListName', type: 'string' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.updateContentListCoverPhotoRequest = [
  { name: 'contentListId', type: 'uint' },
  { name: 'contentListImageMultihashDigest', type: 'bytes32' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.updateContentListDescriptionRequest = [
  { name: 'contentListId', type: 'uint' },
  { name: 'contentListDescription', type: 'string' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.updateContentListUPCRequest = [
  { name: 'contentListId', type: 'uint' },
  { name: 'contentListUPC', type: 'bytes32' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.agreementSaveRequest = [
  { name: 'userId', type: 'uint' },
  { name: 'agreementId', type: 'uint' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.deleteAgreementSaveRequest = schemas.agreementSaveRequest

schemas.contentListSaveRequest = [
  { name: 'userId', type: 'uint' },
  { name: 'contentListId', type: 'uint' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.deleteContentListSaveRequest = schemas.contentListSaveRequest

schemas.addIPLDBlacklist = [
  { name: 'multihashDigest', type: 'bytes32' },
  { name: 'nonce', type: 'bytes32' }
]

// User replica set manager schemas
schemas.proposeAddOrUpdateContentNode = [
  { name: 'cnodeSpId', type: 'uint' },
  { name: 'cnodeDelegateOwnerWallet', type: 'address' },
  { name: 'cnodeOwnerWallet', type: 'address' },
  { name: 'proposerSpId', type: 'uint' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.updateReplicaSet = [
  { name: 'userId', type: 'uint' },
  { name: 'primaryId', type: 'uint' },
  { name: 'secondaryIdsHash', type: 'bytes32' },
  { name: 'oldPrimaryId', type: 'uint' },
  { name: 'oldSecondaryIdsHash', type: 'bytes32' },
  { name: 'nonce', type: 'bytes32' }
]

schemas.manageUser = [
  { name: 'userId', type: 'uint' },
  { name: 'action', type: 'string' },
  { name: 'metadata', type: 'string'},
  { name: 'nonce', type: 'bytes32'}
]

schemas.manageEntity = [
  { name: 'userId', type: 'uint'},
  { name: 'entityType', type: 'string'},
  { name: 'entityId', type: 'uint'},
  { name: 'action', type: 'string'},
  { name: 'metadata', type: 'string'},
  { name: 'nonce', type: 'bytes32'},
]

const generators = {}

function getRequestData (domainDataFn, chainId, contractAddress, messageTypeName, messageSchema, message) {
  const domainData = domainDataFn(chainId, contractAddress)
  const types = {
    EIP712Domain: schemas.domain
  }
  types[messageTypeName] = messageSchema
  return {
    types: types,
    domain: domainData,
    primaryType: messageTypeName,
    message: message
  }
}

/* User Factory Generators */
generators.getAddUserRequestData = function (chainId, contractAddress, handle, nonce) {
  const message = {
    handle: handle,
    nonce: nonce
  }
  return getRequestData(
    domains.getUserFactoryDomain,
    chainId,
    contractAddress,
    'AddUserRequest',
    schemas.addUserRequest,
    message
  )
}

function _getUpdateUserRequestData (chainId, contractAddress, messageTypeName, schema, userId, newValue, nonce) {
  const message = {
    userId: userId,
    newValue: newValue,
    nonce: nonce
  }
  return getRequestData(
    domains.getUserFactoryDomain,
    chainId,
    contractAddress,
    messageTypeName,
    schema,
    message
  )
}

generators.getUpdateUserMultihashRequestData = function (chainId, contractAddress, userId, newValue, nonce) {
  return _getUpdateUserRequestData(
    chainId,
    contractAddress,
    'UpdateUserMultihashRequest',
    schemas.updateUserBytes32,
    userId,
    newValue,
    nonce
  )
}

generators.getUpdateUserNameRequestData = function (chainId, contractAddress, userId, newValue, nonce) {
  return _getUpdateUserRequestData(
    chainId,
    contractAddress,
    'UpdateUserNameRequest',
    schemas.updateUserBytes32,
    userId,
    newValue,
    nonce
  )
}

generators.getUpdateUserLocationRequestData = function (chainId, contractAddress, userId, newValue, nonce) {
  return _getUpdateUserRequestData(
    chainId,
    contractAddress,
    'UpdateUserLocationRequest',
    schemas.updateUserBytes32,
    userId,
    newValue,
    nonce
  )
}

generators.getUpdateUserProfilePhotoRequestData = function (chainId, contractAddress, userId, newValue, nonce) {
  return _getUpdateUserRequestData(
    chainId,
    contractAddress,
    'UpdateUserProfilePhotoRequest',
    schemas.updateUserBytes32,
    userId,
    newValue,
    nonce
  )
}

generators.getUpdateUserCoverPhotoRequestData = function (chainId, contractAddress, userId, newValue, nonce) {
  return _getUpdateUserRequestData(
    chainId,
    contractAddress,
    'UpdateUserCoverPhotoRequest',
    schemas.updateUserBytes32,
    userId,
    newValue,
    nonce
  )
}

generators.getUpdateUserBioRequestData = function (chainId, contractAddress, userId, newValue, nonce) {
  return _getUpdateUserRequestData(
    chainId,
    contractAddress,
    'UpdateUserBioRequest',
    schemas.updateUserString,
    userId,
    newValue,
    nonce
  )
}

generators.getUpdateUserContentNodeRequestData = function (chainId, contractAddress, userId, newValue, nonce) {
  return _getUpdateUserRequestData(
    chainId,
    contractAddress,
    'UpdateUserContentNodeRequest',
    schemas.updateUserString,
    userId,
    newValue,
    nonce
  )
}

generators.getUpdateUserCreatorRequestData = function (chainId, contractAddress, userId, newValue, nonce) {
  return _getUpdateUserRequestData(
    chainId,
    contractAddress,
    'UpdateUserCreatorRequest',
    schemas.updateUserBool,
    userId,
    newValue,
    nonce
  )
}

generators.getUpdateUserVerifiedRequestData = function (chainId, contractAddress, userId, newValue, nonce) {
  return _getUpdateUserRequestData(
    chainId,
    contractAddress,
    'UpdateUserVerifiedRequest',
    schemas.updateUserBool,
    userId,
    newValue,
    nonce
  )
}

/* Agreement Factory Generators */
generators.getAddAgreementRequestData = function (chainId, contractAddress, agreementOwnerId, multihashDigest, multihashHashFn, multihashSize, nonce) {
  const message = {
    agreementOwnerId: agreementOwnerId,
    multihashDigest: multihashDigest,
    multihashHashFn: multihashHashFn,
    multihashSize: multihashSize,
    nonce: nonce
  }
  return getRequestData(
    domains.getAgreementFactoryDomain,
    chainId,
    contractAddress,
    'AddAgreementRequest',
    schemas.addAgreementRequest,
    message
  )
}

generators.getUpdateAgreementRequestData = function (chainId, contractAddress, agreementId, agreementOwnerId, multihashDigest, multihashHashFn, multihashSize, nonce) {
  const message = {
    agreementId: agreementId,
    agreementOwnerId: agreementOwnerId,
    multihashDigest: multihashDigest,
    multihashHashFn: multihashHashFn,
    multihashSize: multihashSize,
    nonce: nonce
  }
  return getRequestData(
    domains.getAgreementFactoryDomain,
    chainId,
    contractAddress,
    'UpdateAgreementRequest',
    schemas.updateAgreementRequest,
    message
  )
}

generators.getDeleteAgreementRequestData = function (chainId, contractAddress, agreementId, nonce) {
  const message = {
    agreementId: agreementId,
    nonce: nonce
  }
  return getRequestData(
    domains.getAgreementFactoryDomain,
    chainId,
    contractAddress,
    'DeleteAgreementRequest',
    schemas.deleteAgreementRequest,
    message
  )
}

/* Social Feature Factory Generators */
generators.getAddAgreementRepostRequestData = function (chainId, contractAddress, userId, agreementId, nonce) {
  const message = {
    userId: userId,
    agreementId: agreementId,
    nonce: nonce
  }
  return getRequestData(
    domains.getSocialFeatureFactoryDomain,
    chainId,
    contractAddress,
    'AddAgreementRepostRequest',
    schemas.addAgreementRepostRequest,
    message
  )
}

generators.getDeleteAgreementRepostRequestData = function (chainId, contractAddress, userId, agreementId, nonce) {
  const message = {
    userId: userId,
    agreementId: agreementId,
    nonce: nonce
  }
  return getRequestData(
    domains.getSocialFeatureFactoryDomain,
    chainId,
    contractAddress,
    'DeleteAgreementRepostRequest',
    schemas.deleteAgreementRepostRequest,
    message
  )
}

generators.getAddContentListRepostRequestData = function (chainId, contractAddress, userId, contentListId, nonce) {
  const message = {
    userId: userId,
    contentListId: contentListId,
    nonce: nonce
  }
  return getRequestData(
    domains.getSocialFeatureFactoryDomain,
    chainId,
    contractAddress,
    'AddContentListRepostRequest',
    schemas.addContentListRepostRequest,
    message
  )
}

generators.getDeleteContentListRepostRequestData = function (chainId, contractAddress, userId, contentListId, nonce) {
  const message = {
    userId: userId,
    contentListId: contentListId,
    nonce: nonce
  }
  return getRequestData(
    domains.getSocialFeatureFactoryDomain,
    chainId,
    contractAddress,
    'DeleteContentListRepostRequest',
    schemas.deleteContentListRepostRequest,
    message
  )
}

generators.getUserFollowRequestData = function (chainId, contractAddress, followerUserId, followeeUserId, nonce) {
  const message = {
    followerUserId: followerUserId,
    followeeUserId: followeeUserId,
    nonce: nonce
  }
  return getRequestData(
    domains.getSocialFeatureFactoryDomain,
    chainId,
    contractAddress,
    'UserFollowRequest',
    schemas.userFollowRequest,
    message
  )
}

generators.getDeleteUserFollowRequestData = function (chainId, contractAddress, followerUserId, followeeUserId, nonce) {
  const message = {
    followerUserId: followerUserId,
    followeeUserId: followeeUserId,
    nonce: nonce
  }
  return getRequestData(
    domains.getSocialFeatureFactoryDomain,
    chainId,
    contractAddress,
    'DeleteUserFollowRequest',
    schemas.deleteUserFollowRequest,
    message
  )
}

generators.getAgreementSaveRequestData = function (chainId, contractAddress, userId, agreementId, nonce) {
  const message = {
    userId: userId,
    agreementId: agreementId,
    nonce: nonce
  }

  return getRequestData(
    domains.getUserLibraryFactoryDomain,
    chainId,
    contractAddress,
    'AgreementSaveRequest',
    schemas.agreementSaveRequest,
    message
  )
}

generators.getDeleteAgreementSaveRequestData = function (chainId, contractAddress, userId, agreementId, nonce) {
  const message = {
    userId: userId,
    agreementId: agreementId,
    nonce: nonce
  }

  return getRequestData(
    domains.getUserLibraryFactoryDomain,
    chainId,
    contractAddress,
    'DeleteAgreementSaveRequest',
    schemas.deleteAgreementSaveRequest,
    message
  )
}

generators.getContentListSaveRequestData = function (chainId, contractAddress, userId, contentListId, nonce) {
  const message = {
    userId: userId,
    contentListId: contentListId,
    nonce: nonce
  }

  return getRequestData(
    domains.getUserLibraryFactoryDomain,
    chainId,
    contractAddress,
    'ContentListSaveRequest',
    schemas.contentListSaveRequest,
    message
  )
}

generators.getDeleteContentListSaveRequestData = function (chainId, contractAddress, userId, contentListId, nonce) {
  const message = {
    userId: userId,
    contentListId: contentListId,
    nonce: nonce
  }

  return getRequestData(
    domains.getUserLibraryFactoryDomain,
    chainId,
    contractAddress,
    'DeleteContentListSaveRequest',
    schemas.deleteContentListSaveRequest,
    message
  )
}

/* ContentList Factory Generators */

/* NOTE: Ensure the value for agreementIds hash is generated using the following snippet prior to calling this generator function:
 * web3New.utils.soliditySha3(web3New.eth.abi.encodeParameter('uint[]', agreementIds))
 */
generators.getCreateContentListRequestData = function (chainId, contractAddress, contentListOwnerId, contentListName, isPrivate, isAlbum, agreementIdsHash, nonce) {
  const message = {
    contentListOwnerId: contentListOwnerId,
    contentListName: contentListName,
    isPrivate: isPrivate,
    isAlbum: isAlbum,
    agreementIdsHash: agreementIdsHash,
    nonce: nonce
  }

  return getRequestData(
    domains.getContentListFactoryDomain,
    chainId,
    contractAddress,
    'CreateContentListRequest',
    schemas.createContentListRequest,
    message
  )
}

generators.getDeleteContentListRequestData = function (chainId, contractAddress, contentListId, nonce) {
  const message = {
    contentListId: contentListId,
    nonce: nonce
  }
  return getRequestData(
    domains.getContentListFactoryDomain,
    chainId,
    contractAddress,
    'DeleteContentListRequest',
    schemas.deleteContentListRequest,
    message
  )
}

generators.getAddContentListAgreementRequestData = function (chainId, contractAddress, contentListId, addedAgreementId, nonce) {
  const message = {
    contentListId: contentListId,
    addedAgreementId: addedAgreementId,
    nonce: nonce
  }

  return getRequestData(
    domains.getContentListFactoryDomain,
    chainId,
    contractAddress,
    'AddContentListAgreementRequest',
    schemas.addContentListAgreementRequest,
    message
  )
}

generators.getDeleteContentListAgreementRequestData = function (chainId, contractAddress, contentListId, deletedAgreementId, deletedAgreementTimestamp, nonce) {
  const message = {
    contentListId: contentListId,
    deletedAgreementId: deletedAgreementId,
    deletedAgreementTimestamp: deletedAgreementTimestamp,
    nonce: nonce
  }

  return getRequestData(
    domains.getContentListFactoryDomain,
    chainId,
    contractAddress,
    'DeleteContentListAgreementRequest',
    schemas.deleteContentListAgreementRequest,
    message
  )
}

generators.getOrderContentListAgreementsRequestData = function (chainId, contractAddress, contentListId, agreementIdsHash, nonce) {
  const message = {
    contentListId: contentListId,
    agreementIdsHash: agreementIdsHash,
    nonce: nonce
  }

  return getRequestData(
    domains.getContentListFactoryDomain,
    chainId,
    contractAddress,
    'OrderContentListAgreementsRequest',
    schemas.orderContentListAgreementsRequest,
    message
  )
}

generators.getUpdateContentListNameRequestData = function (chainId, contractAddress, contentListId, updatedContentListName, nonce) {
  const message = {
    contentListId: contentListId,
    updatedContentListName: updatedContentListName,
    nonce: nonce
  }

  return getRequestData(
    domains.getContentListFactoryDomain,
    chainId,
    contractAddress,
    'UpdateContentListNameRequest',
    schemas.updateContentListNameRequest,
    message
  )
}

generators.getUpdateContentListPrivacyRequestData = function (chainId, contractAddress, contentListId, updatedContentListPrivacy, nonce) {
  const message = {
    contentListId: contentListId,
    updatedContentListPrivacy: updatedContentListPrivacy,
    nonce: nonce
  }

  return getRequestData(
    domains.getContentListFactoryDomain,
    chainId,
    contractAddress,
    'UpdateContentListPrivacyRequest',
    schemas.updateContentListPrivacyRequest,
    message
  )
}

generators.getUpdateContentListCoverPhotoRequestData = function (chainId, contractAddress, contentListId, contentListImageMultihashDigest, nonce) {
  const message = {
    contentListId: contentListId,
    contentListImageMultihashDigest: contentListImageMultihashDigest,
    nonce: nonce
  }

  return getRequestData(
    domains.getContentListFactoryDomain,
    chainId,
    contractAddress,
    'UpdateContentListCoverPhotoRequest',
    schemas.updateContentListCoverPhotoRequest,
    message)
}

generators.getUpdateContentListUPCRequestData = function (chainId, contractAddress, contentListId, contentListUPC, nonce) {
  const message = {
    contentListId: contentListId,
    contentListUPC: contentListUPC,
    nonce: nonce
  }

  return getRequestData(
    domains.getContentListFactoryDomain,
    chainId,
    contractAddress,
    'UpdateContentListUPCRequest',
    schemas.updateContentListUPCRequest,
    message)
}

generators.getUpdateContentListDescriptionRequestData = function (chainId, contractAddress, contentListId, contentListDescription, nonce) {
  const message = {
    contentListId: contentListId,
    contentListDescription: contentListDescription,
    nonce: nonce
  }

  return getRequestData(
    domains.getContentListFactoryDomain,
    chainId,
    contractAddress,
    'UpdateContentListDescriptionRequest',
    schemas.updateContentListDescriptionRequest,
    message)
}

generators.addIPLDToBlacklistRequestData = function (chainId, contractAddress, multihashDigest, nonce) {
  const message = {
    multihashDigest: multihashDigest,
    nonce: nonce
  }
  return getRequestData(
    domains.getIPLDBlacklistFactoryDomain,
    chainId,
    contractAddress,
    'AddIPLDToBlacklistRequest',
    schemas.addIPLDBlacklist,
    message
  )
}

/* User Replica Set Manager Generators */
generators.getProposeAddOrUpdateContentNodeRequestData = function (
  chainId,
  contractAddress,
  cnodeSpId,
  cnodeDelegateOwnerWallet,
  cnodeOwnerWallet,
  proposerSpId,
  nonce
) {
  const message = {
    cnodeSpId,
    cnodeDelegateOwnerWallet,
    cnodeOwnerWallet,
    proposerSpId,
    nonce
  }
  return getRequestData(
    domains.getUserReplicaSetManagerDomain,
    chainId,
    contractAddress,
    'ProposeAddOrUpdateContentNode',
    schemas.proposeAddOrUpdateContentNode,
    message
  )
}

generators.getUpdateReplicaSetRequestData = function (
  chainId,
  contractAddress,
  userId,
  primaryId,
  secondaryIdsHash,
  oldPrimaryId,
  oldSecondaryIdsHash,
  nonce
) {
  const message = {
    userId,
    primaryId,
    secondaryIdsHash,
    oldPrimaryId,
    oldSecondaryIdsHash,
    nonce
  }
  return getRequestData(
    domains.getUserReplicaSetManagerDomain,
    chainId,
    contractAddress,
    'UpdateReplicaSet',
    schemas.updateReplicaSet,
    message
  )
}

generators.getManageUserData = function (
  chainId,
  contractAddress,
  userId,
  action,
  metadata,
  nonce
) {
  const message = {
    userId,
    action,
    metadata,
    nonce,
  }
  return getRequestData(
    domains.getEntityManagerDomain,
    chainId,
    contractAddress,
    'ManageUser',
    schemas.manageUser,
    message
  )
}

generators.getManageEntityData = function(
  chainId,
  contractAddress,
  userId,
  entityType,
  entityId,
  action,
  metadata,
  nonce
) {
  const message = {
    userId,
    entityType,
    entityId,
    action,
    metadata,
    nonce
  }
  return getRequestData(
    domains.getEntityManagerDomain,
    chainId,
    contractAddress,
    'ManageEntity',
    schemas.manageEntity,
    message
  )
}

/** Return a secure random hex string of nChar length in a browser-compatible way
 *  Taken from https://stackoverflow.com/questions/37378237/how-to-generate-a-random-token-of-32-bit-in-javascript
 */
function browserRandomHash (nChar) {
  // convert number of characters to number of bytes
  var nBytes = Math.ceil(nChar = (+nChar || 8) / 2)

  // create a typed array of that many bytes
  var u = new Uint8Array(nBytes)

  // populate it wit crypto-random values
  window.crypto.getRandomValues(u)

  // convert it to an Array of Strings (e.g. '01', 'AF', ..)
  var zpad = function (str) {
    return '00'.slice(str.length) + str
  }
  var a = Array.prototype.map.call(u, function (x) {
    return zpad(x.toString(16))
  })

  // Array of String to String
  var str = a.join('').toLowerCase()
  // and snip off the excess digit if we want an odd number
  if (nChar % 2) str = str.slice(1)

  // return what we made
  return str
}

// We need to detect whether the nodejs crypto module is available to determine how to
// generate secure random numbers below
let nodeCrypto
try {
  nodeCrypto = require('crypto')
} catch (e) {
  nodeCrypto = null
}

function getNonce () {
  // detect whether we are in browser or in nodejs, and use the correct csprng
  if (typeof window === 'undefined' || window === null) {
    return '0x' + nodeCrypto.randomBytes(32).toString('hex')
  } else {
    return '0x' + browserRandomHash(64)
  }
}

module.exports = { domains, schemas, generators, getNonce }
