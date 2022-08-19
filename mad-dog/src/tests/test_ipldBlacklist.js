const ServiceCommands = require('@coliving/service-commands')
const {
  addIPLDToBlacklist,
  updateAgreementOnChain,
  updateAgreementOnChainAndCnode,
  addAgreementToChain,
  uploadAgreement,
  uploadAgreementCoverArt,
  uploadProfilePic,
  uploadCoverPhoto,
  getAgreementMetadata,
  updateMultihash,
  updateCreator,
  updateCoverPhoto,
  updateProfilePhoto,
  createPlaylist,
  updatePlaylistCoverPhoto,
  uploadPlaylistCoverPhoto,
  getPlaylists,
  getUser,
  cleanUserMetadata,
  Utils,
  RandomUtils
} = ServiceCommands
const path = require('path')
const fs = require('fs-extra')
const {
  addAndUpgradeUsers
} = require('../helpers.js')
const {
  getRandomImageFilePath,
  getRandomAgreementMetadata,
  getRandomAgreementFilePath,
  genRandomString
} = RandomUtils
const { logger } = require('../logger.js')
const { libs } = require('@coliving/sdk')
const LibsUtils = libs.Utils

const TEMP_STORAGE_PATH = path.resolve('./local-storage/tmp/')

const BLACKLISTER_INDEX = 0 // blacklister wallet address = 0th libs instance (see index.js)
const CREATOR_INDEX = 1

const IpldBlacklistTest = {}

// TEST NEW AGREEMENT FLOW -- BLACKLISTED METADATA CID
IpldBlacklistTest.newAgreementMetadata = async ({
  numUsers,
  executeAll,
  executeOne,
  numCreatorNodes
}) => {
  try {
    const userId = await getCreatorId({
      numUsers,
      executeAll,
      executeOne,
      numCreatorNodes
    })

    // Create and upload a throwaway agreement
    const throwawayAgreement = getRandomAgreementMetadata(userId)
    const randomAgreementFilePath = await getRandomAgreementFilePath(TEMP_STORAGE_PATH)
    const throwawayAgreementId = await executeOne(CREATOR_INDEX, libsWrapper => {
      return uploadAgreement(libsWrapper, throwawayAgreement, randomAgreementFilePath)
    })

    // Verify that fetching the throwaway agreement doesn't throw any errors
    const uploadedThrowawayAgreement = await executeOne(CREATOR_INDEX, libsWrapper => {
      return getAgreementMetadata(libsWrapper, throwawayAgreementId)
    })
    const throwawayAgreementMetadataCid = uploadedThrowawayAgreement.metadata_multihash
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())

    // Make a new agreement with a different title so it has a different metadata CID
    const blacklistedAgreementMetadata = {
      ...throwawayAgreement,
      title: `Blacklisted Agreement ${genRandomString(8)}`
    }
    const blacklistedMetadataCid = await LibsUtils.fileHasher.generateNonImageCid(
      Buffer.from(JSON.stringify(blacklistedAgreementMetadata))
    )
    if (blacklistedMetadataCid === throwawayAgreementMetadataCid) {
      return {
        error: "Metadata of blacklisted agreement should have different CID from throwaway agreement's metadata."
      }
    }

    // Blacklist the agreement metadata's CID before uploading it
    const agreementMultihashDecoded = Utils.decodeMultihash(blacklistedMetadataCid)
    logger.info(`Adding CID ${blacklistedMetadataCid} to the IPLD Blacklist!`)
    const ipldTxReceipt = await executeOne(BLACKLISTER_INDEX, libsWrapper => {
      return addIPLDToBlacklist(libsWrapper, agreementMultihashDecoded.digest)
    })
    await executeOne(BLACKLISTER_INDEX, libs => libs.waitForLatestIPLDBlock())

    // Verify that attempting to upload the agreement with blacklisted metadata fails
    try {
      const blacklistedAgreementId = await executeOne(CREATOR_INDEX, libsWrapper => {
        return uploadAgreement(libsWrapper, blacklistedAgreementMetadata, randomAgreementFilePath)
      })
      const uploadedAgreementAfterUpdate = await executeOne(CREATOR_INDEX, libsWrapper => {
        return getAgreementMetadata(libsWrapper, blacklistedAgreementId)
      })
      throw new Error(`Upload succeeded but should have failed with error 'No agreements returned.'`)
    } catch (e) {
      if (e.message !== 'No agreements returned.') {
        return {
          error: `Error with IPLD Blacklist test for new agreement with blacklisted metadata: ${e.message}`
        }
      }
    }
  } catch (e) {
    let error = e
    if (e.message) {
      error = e.message
    }

    return {
      error: `Error with IPLD Blacklist test for update agreement with blacklisted metadata CID: ${error}`
    }
  } finally {
    await fs.remove(TEMP_STORAGE_PATH)
  }
}

// TEST UPDATE AGREEMENT FLOW -- BLACKLISTED METADATA CID
IpldBlacklistTest.updateAgreementMetadata = async ({
  numUsers,
  executeAll,
  executeOne,
  numCreatorNodes
}) => {
  try {
    const userId = await getCreatorId({
      numUsers,
      executeAll,
      executeOne,
      numCreatorNodes
    })

    // Create and upload agreement
    const agreement = getRandomAgreementMetadata(userId)
    const randomAgreementFilePath = await getRandomAgreementFilePath(TEMP_STORAGE_PATH)
    const agreementId = await executeOne(CREATOR_INDEX, libsWrapper => {
      return uploadAgreement(libsWrapper, agreement, randomAgreementFilePath)
    })

    // Keep agreement of original metadata CID
    const uploadedAgreementBeforeUpdate = await executeOne(CREATOR_INDEX, libsWrapper => {
      return getAgreementMetadata(libsWrapper, agreementId)
    })
    const originalMetadataCID = uploadedAgreementBeforeUpdate.metadata_multihash
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())

    // Modify a copy of the metadata to generate a new CID that's acceptable (not blacklisted)
    const acceptableAgreementMetadata = {
      ...agreement,
      agreement_id: uploadedAgreementBeforeUpdate.agreement_id,
      agreement_segments: uploadedAgreementBeforeUpdate.agreement_segments,
      title: `Updated Title ${genRandomString(8)}`
    }
    const acceptableMetadataCid = await LibsUtils.fileHasher.generateNonImageCid(Buffer.from(JSON.stringify(acceptableAgreementMetadata)))

    // Update the agreement to metadata that's acceptable (not blacklisted)
    await executeOne(CREATOR_INDEX, libsWrapper => {
      return updateAgreementOnChainAndCnode(libsWrapper, acceptableAgreementMetadata)
    })
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())

    // Ensure that the update was successful (agreement has new metadata CID)
    const uploadedAgreementAfterAcceptableUpdate = await executeOne(CREATOR_INDEX, libsWrapper => {
      return getAgreementMetadata(libsWrapper, agreementId)
    })
    const updatedAcceptableAgreementMetadataCid = uploadedAgreementAfterAcceptableUpdate.metadata_multihash
    if (updatedAcceptableAgreementMetadataCid === originalMetadataCID) {
      return {
        error: "Agreement metadata CID should've updated. The rest of the test will produce a false positive."
      }
    }
    if (updatedAcceptableAgreementMetadataCid !== acceptableMetadataCid) {
      return {
        error: 'Agreement metadata CID does not match the expected metadata. The rest of this test relies on the hashing logic to be consistent, so it will fail.'
      }
    }

    // Make new metadata again and this time blacklist its CID
    const blacklistedAgreementMetadata = {
      ...agreement,
      agreement_id: uploadedAgreementBeforeUpdate.agreement_id,
      agreement_segments: uploadedAgreementBeforeUpdate.agreement_segments,
      title: `Second Updated Title ${genRandomString(8)}`
    }
    const blacklistedMetadataCid = await LibsUtils.fileHasher.generateNonImageCid(Buffer.from(JSON.stringify(blacklistedAgreementMetadata)))

    // Send tx to add the blacklisted metadata CID to the ipld blacklist
    const agreementMultihashDecoded = Utils.decodeMultihash(blacklistedMetadataCid)
    logger.info(`Adding CID ${blacklistedMetadataCid} to the IPLD Blacklist!`)
    const ipldTxReceipt = await executeOne(BLACKLISTER_INDEX, libsWrapper => {
      return addIPLDToBlacklist(libsWrapper, agreementMultihashDecoded.digest)
    })
    await executeOne(BLACKLISTER_INDEX, libs => libs.waitForLatestIPLDBlock())

    // Attempt to update the agreement to metadata that's blacklisted
    await executeOne(CREATOR_INDEX, libsWrapper => {
      return updateAgreementOnChainAndCnode(libsWrapper, blacklistedAgreementMetadata)
    })
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())

    // Ensure that the update was unsuccessful (agreement has original metadata cid)
    const uploadedAgreementAfterUpdate = await executeOne(CREATOR_INDEX, libsWrapper => {
      return getAgreementMetadata(libsWrapper, agreementId)
    })
    if (acceptableMetadataCid !== uploadedAgreementAfterUpdate.metadata_multihash) {
      return {
        error: 'Update agreement with blacklisted metadata CID should not have been indexed.'
      }
    }
  } catch (e) {
    let error = e
    if (e.message) {
      error = e.message
    }

    return {
      error: `Error with IPLD Blacklist test for update agreement with blacklisted metadata CID: ${error}`
    }
  } finally {
    await fs.remove(TEMP_STORAGE_PATH)
  }
}

// TEST NEW AGREEMENT FLOW -- BLACKLISTED COVER PHOTO CID
IpldBlacklistTest.newAgreementCoverPhoto = async ({
  numUsers,
  executeAll,
  executeOne,
  numCreatorNodes
}) => {
  let agreementTxReceipt
  try {
    const userId = await getCreatorId({
      numUsers,
      executeAll,
      executeOne,
      numCreatorNodes
    })

    // Generate cover art and upload it to a Content Node
    const acceptableCoverArtFilePath = await getRandomImageFilePath(TEMP_STORAGE_PATH)
    const acceptableCID = await executeOne(
      CREATOR_INDEX,
      libsWrapper => uploadAgreementCoverArt(libsWrapper, acceptableCoverArtFilePath)
    )

    // Make agreement metadata containing acceptable cover art CID
    const acceptableAgreementToUpload = {
      ...getRandomAgreementMetadata(userId),
      cover_art: acceptableCID,
      cover_art_sizes: acceptableCID
    }

    // Verify that the agreement with non-blacklisted cover art can upload successfully
    const randomAcceptableAgreementFilePath = await getRandomAgreementFilePath(TEMP_STORAGE_PATH)
    const acceptableAgreementId = await executeOne(
      CREATOR_INDEX,
      libsWrapper => uploadAgreement(libsWrapper, acceptableAgreementToUpload, randomAcceptableAgreementFilePath)
    )
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())
    const fetchedAgreementWithAcceptableCoverArt = await executeOne(
      CREATOR_INDEX,
      libsWrapper => getAgreementMetadata(libsWrapper, acceptableAgreementId)
    )
    if (
      fetchedAgreementWithAcceptableCoverArt.cover_art_sizes !== acceptableCID
    ) {
      return {
        error:
          "Agreement metadata should've included cover art. The rest of the test will produce a false positive."
      }
    }

    // Upload cover art image and blacklist its CID
    const blacklistedCoverArtFilePath = await getRandomImageFilePath(TEMP_STORAGE_PATH)
    const blacklistedCID = await executeOne(
      CREATOR_INDEX,
      libsWrapper => uploadAgreementCoverArt(libsWrapper, blacklistedCoverArtFilePath)
    )
    const agreementMultihashDecoded = Utils.decodeMultihash(blacklistedCID)
    logger.info(`Adding CID ${blacklistedCID} to the IPLD Blacklist!`)
    const ipldTxReceipt = await executeOne(BLACKLISTER_INDEX, libsWrapper => {
      return addIPLDToBlacklist(libsWrapper, agreementMultihashDecoded.digest)
    })
    await executeOne(BLACKLISTER_INDEX, libs => libs.waitForLatestIPLDBlock())

    // Make agreement metadata containing blacklisted cover art CID
    const agreementToUploadWithBlacklistedCoverArt = {
      ...getRandomAgreementMetadata(userId),
      cover_art: blacklistedCID,
      cover_art_sizes: blacklistedCID
    }
    const randomAgreementFilePath = await getRandomAgreementFilePath(TEMP_STORAGE_PATH)

    // Verify that attempting to upload the agreement with blacklisted cover art fails
    try {
      await executeOne(CREATOR_INDEX, libsWrapper => {
        return uploadAgreement(libsWrapper, agreementToUploadWithBlacklistedCoverArt, randomAgreementFilePath)
      })
      throw new Error(`Upload succeeded but should have failed with error 'No agreements returned.'`)
    } catch (e) {
      if (e.message !== 'No agreements returned.') {
        return {
          error: `Error with IPLD Blacklist test for new agreement with blacklisted cover photo: ${e.message}`
        }
      }
    }
  } catch (e) {
    return {
      error: `Error with IPLD Blacklist test for new agreement with blacklisted cover photo: ${e.message}`
    }
  }  finally {
    await fs.remove(TEMP_STORAGE_PATH)
  }
}

// TEST UPDATE AGREEMENT FLOW -- BLACKLISTED COVER PHOTO CID
IpldBlacklistTest.updateAgreementCoverPhoto = async ({
  numUsers,
  executeAll,
  executeOne,
  numCreatorNodes
}) => {
  const userId = await getCreatorId({
    numUsers,
    executeAll,
    executeOne,
    numCreatorNodes
  })

  const agreementToUpload = getRandomAgreementMetadata(userId)

  const _createAndUploadAgreement = async () => {
    const randomAgreementFilePath = await getRandomAgreementFilePath(TEMP_STORAGE_PATH)
    const agreementId = await executeOne(CREATOR_INDEX, libsWrapper => {
      return uploadAgreement(libsWrapper, agreementToUpload, randomAgreementFilePath)
    })
    return agreementId
  }

  const _createAndUploadCoverArt = async (libs) =>
    uploadAgreementCoverArt(libs, await getRandomImageFilePath(TEMP_STORAGE_PATH))

  const _setCoverArt = async (libs, uploadedAgreement, cid) => {
    const agreementUpdatedWithAcceptableCoverArt = {
      ...agreementToUpload,
      agreement_id: uploadedAgreement.agreement_id,
      agreement_segments: uploadedAgreement.agreement_segments,
      cover_art: cid,
      cover_art_sizes: cid
    }
    return updateAgreementOnChainAndCnode(libs, agreementUpdatedWithAcceptableCoverArt)
  }

  const _verifyNonBlacklistedCidUpdated = (agreementBeforeUpdate, agreementAfterUpdate, nonBlacklistedCid) => {
    const previousPicCid = agreementBeforeUpdate.cover_art_sizes
    const updatedPicCid = agreementAfterUpdate.cover_art_sizes
    if (previousPicCid === updatedPicCid) {
      throw new Error(
        "Agreement cover art CID should've updated. The rest of the test will produce a false positive."
      )
    }
    if (updatedPicCid !== nonBlacklistedCid) {
      throw new Error(
        'Agreement cover art CID does not match the expected CID. The rest of this test relies on the hashing logic to be consistent, so it will fail.'
      )
    }
  }

  const _verifyBlacklistedCidDidNotUpdate = (agreement, blacklistedCid) => {
    if (
      agreement.cover_art === blacklistedCid ||
      agreement.cover_art_sizes === blacklistedCid
    ) {
      throw new Error('Update agreement with blacklisted cover photo should not have been indexed.')
    }
  }

  await testUpdateFlow(
    'agreement cover photo',
    executeOne,
    _createAndUploadAgreement,
    getAgreementMetadata,
    _createAndUploadCoverArt,
    _setCoverArt,
    _verifyNonBlacklistedCidUpdated,
    _verifyBlacklistedCidDidNotUpdate
  )
}

// TEST UPDATE USER FLOW -- BLACKLISTED METADATA CID
IpldBlacklistTest.updateUserMetadata = async ({
  numUsers,
  executeAll,
  executeOne,
  numCreatorNodes
}) => {
  try {
    const userId = await getCreatorId({
      numUsers,
      executeAll,
      executeOne,
      numCreatorNodes
    })

    // Keep agreement of original metadata CID
    const userBeforeUpdate = await executeOne(CREATOR_INDEX, libsWrapper => {
      return getUser(libsWrapper, userId)
    })
    const metadataCidBeforeUpdate = userBeforeUpdate.metadata_multihash

    // Modify metadata to generate a new CID that's acceptable (not blacklisted)
    const acceptableUserMetadata = await executeOne(
      CREATOR_INDEX,
      libsWrapper => cleanUserMetadata(libsWrapper, {
        ...userBeforeUpdate,
        bio: `Updated Bio (not blacklisted) ${genRandomString(8)}`
      })
    )
    const acceptableMetadataCid = await LibsUtils.fileHasher.generateNonImageCid(Buffer.from(JSON.stringify(acceptableUserMetadata)))

    // Update the user to metadata that's acceptable (not blacklisted)
    await executeOne(
      CREATOR_INDEX,
      libsWrapper => updateCreator(libsWrapper, userId, acceptableUserMetadata)
    )
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())

    // Ensure that the update was successful (user has new metadata CID)
    const userAfterAcceptableUpdate = await executeOne(
      CREATOR_INDEX,
      libsWrapper => getUser(libsWrapper, userId)
    )
    const updatedAcceptableMetadataCid = userAfterAcceptableUpdate.metadata_multihash
    if (updatedAcceptableMetadataCid === metadataCidBeforeUpdate) {
      return {
        error: "User metadata CID should've updated. The rest of the test will produce a false positive."
      }
    }
    if (updatedAcceptableMetadataCid !== acceptableMetadataCid) {
      return {
        error: 'User metadata CID does not match the expected metadata. The rest of this test relies on the hashing logic to be consistent, so it will fail.'
      }
    }

    // Make new metadata again and this time blacklist its CID
    const blacklistedUserMetadata = await executeOne(
      CREATOR_INDEX,
      libsWrapper => cleanUserMetadata(libsWrapper, {
        ...userBeforeUpdate,
        bio: `Blacklisted User Metadata ${genRandomString(8)}`
      })
    )
    const blacklistedMetadataCid = await LibsUtils.fileHasher.generateNonImageCid(Buffer.from(JSON.stringify(blacklistedUserMetadata)))

    // Send tx to add the blacklisted metadata CID to the ipld blacklist
    const agreementMultihashDecoded = Utils.decodeMultihash(blacklistedMetadataCid)
    logger.info(`Adding CID ${blacklistedMetadataCid} to the IPLD Blacklist!`)
    const ipldTxReceipt = await executeOne(BLACKLISTER_INDEX, libsWrapper => {
      return addIPLDToBlacklist(libsWrapper, agreementMultihashDecoded.digest)
    })
    await executeOne(BLACKLISTER_INDEX, libs => libs.waitForLatestIPLDBlock())

    // Attempt to update the user's metadata to the blacklisted metadata
    await executeOne(CREATOR_INDEX, libsWrapper => {
      return updateCreator(libsWrapper, userId, blacklistedUserMetadata)
    })
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())

    // Verify that user does not have updated blacklisted metadata
    const userAfterUpdate = await executeOne(CREATOR_INDEX, libsWrapper => {
      return getUser(libsWrapper, userId)
    })
    if (userAfterUpdate.metadata_multihash !== acceptableMetadataCid) {
      return {
        error:
          'Update user with blacklisted metadata CID should not have been indexed.'
      }
    }
  } catch (e) {
    return {
      error: `Error with IPLD Blacklist test for update user metadata CID: ${e.message}`
    }
  }
}

// TEST UPDATE USER PROFILE FLOW -- BLACKLISTED PROFILE PHOTO CID
IpldBlacklistTest.updateUserProfilePhoto = async ({
  numUsers,
  executeAll,
  executeOne,
  numCreatorNodes
}) => {
  const userId = await getCreatorId({
    numUsers,
    executeAll,
    executeOne,
    numCreatorNodes
  })

  const _createAndUploadUser = async () => Promise.resolve(userId)

  const _createAndUploadProfilePhoto = async (libs) =>
    uploadProfilePic(libs, await getRandomImageFilePath(TEMP_STORAGE_PATH))

  const _setProfilePhoto = async (libs, user, cid) => {
    const userMetadataWithNonUpdatedPhoto = await executeOne(
      CREATOR_INDEX,
      libsWrapper => cleanUserMetadata(libsWrapper, {
        ...user,
        profile_picture: cid,
        profile_picture_sizes: cid
      })
    )
    return updateCreator(libs, userId, userMetadataWithNonUpdatedPhoto)
  }

  const _verifyNonBlacklistedCidUpdated = (userBeforeUpdate, userAfterUpdate, nonBlacklistedCid) => {
    const previousPicCid = userBeforeUpdate.profile_picture_sizes
    const updatedPicCid = userAfterUpdate.profile_picture_sizes
    if (previousPicCid === updatedPicCid) {
      throw new Error(
        "User profile pic CID should've updated. The rest of the test will produce a false positive."
      )
    }
    if (updatedPicCid !== nonBlacklistedCid) {
      throw new Error(
        'User profile pic CID does not match the expected CID. The rest of this test relies on the hashing logic to be consistent, so it will fail.'
      )
    }
  }

  const _verifyBlacklistedCidDidNotUpdate = (user, blacklistedCid) => {
    if (user.profile_picture_sizes === blacklistedCid) {
      throw new Error(
        'Update user with blacklisted profile pic should not have been indexed.'
      )
    }
  }

  await testUpdateFlow(
    'user profile photo',
    executeOne,
    _createAndUploadUser,
    getUser,
    _createAndUploadProfilePhoto,
    _setProfilePhoto,
    _verifyNonBlacklistedCidUpdated,
    _verifyBlacklistedCidDidNotUpdate
  )
}

// TEST UPDATE USER FLOW -- BLACKLISTED COVER PHOTO CID
IpldBlacklistTest.updateUserCoverPhoto = async ({
  numUsers,
  executeAll,
  executeOne,
  numCreatorNodes
}) => {
  const userId = await getCreatorId({
    numUsers,
    executeAll,
    executeOne,
    numCreatorNodes
  })
  
  const _createAndUploadUser = async () => Promise.resolve(userId)

  const _createAndUploadCoverPhoto = async (libs) =>
    uploadCoverPhoto(libs, await getRandomImageFilePath(TEMP_STORAGE_PATH))

  const _setCoverPhoto = async (libs, user, cid) => {
    const userMetadataWithNonUpdatedPhoto = await executeOne(
      CREATOR_INDEX,
      libsWrapper => cleanUserMetadata(libsWrapper, {
        ...user,
        cover_photo: cid,
        cover_photo_sizes: cid
      })
    )
    return updateCreator(libs, userId, userMetadataWithNonUpdatedPhoto)
  }

  const _verifyNonBlacklistedCidUpdated = (userBeforeUpdate, userAfterUpdate, nonBlacklistedCid) => {
    const previousPicCid = userBeforeUpdate.cover_photo_sizes
    const updatedPicCid = userAfterUpdate.cover_photo_sizes
    if (previousPicCid === updatedPicCid) {
      throw new Error(
        "User cover photo CID should've updated. The rest of the test will produce a false positive."
      )
    }
    if (updatedPicCid !== nonBlacklistedCid) {
      throw new Error(
        'User cover photo CID does not match the expected CID. The rest of this test relies on the hashing logic to be consistent, so it will fail.'
      )
    }
  }

  const _verifyBlacklistedCidDidNotUpdate = (user, blacklistedCid) => {
    if (user.cover_photo_sizes === blacklistedCid) {
      throw new Error(
        'Update user with blacklisted cover photo should not have been indexed.'
      )
    }
  }

  await testUpdateFlow(
    'user cover photo',
    executeOne,
    _createAndUploadUser,
    getUser,
    _createAndUploadCoverPhoto,
    _setCoverPhoto,
    _verifyNonBlacklistedCidUpdated,
    _verifyBlacklistedCidDidNotUpdate
  )
}

// TEST UPDATE PLAYLIST FLOW -- BLACKLISTED COVER PHOTO CID
IpldBlacklistTest.updatePlaylistCoverPhoto = async ({
  numUsers,
  executeAll,
  executeOne,
  numCreatorNodes
}) => {
  const userId = await getCreatorId({
    numUsers,
    executeAll,
    executeOne,
    numCreatorNodes
  })

  const _createAndUploadPlaylist = async () => {
    const randomPlaylistName = genRandomString(8)
    const { playlistId } = await executeOne(CREATOR_INDEX, libsWrapper => {
      return createPlaylist(
        libsWrapper,
        userId,
        randomPlaylistName,
        false,
        false,
        []
      )
    })
    return playlistId
  }

  const _createAndUploadCoverPhoto = async (libs) => {
    const randomCoverPhotoFilePath = await getRandomImageFilePath(TEMP_STORAGE_PATH)
    const cid = await executeOne(
      CREATOR_INDEX,
      libsWrapper => uploadPlaylistCoverPhoto(libsWrapper, randomCoverPhotoFilePath)
    )
    return cid
  }

  const _getPlaylists = async (libs, playlistId) =>
    getPlaylists(libs, 1, 0, [playlistId], userId, false)

  const _setCoverPhoto = async (libs, uploadedPlaylists, cid) => {
    const { digest } = Utils.decodeMultihash(cid)
    await executeOne(
      CREATOR_INDEX,
      libsWrapper => {
        return updatePlaylistCoverPhoto(
          libsWrapper,
          uploadedPlaylists[0].playlist_id,
          digest
        )
      }
    )
  }

  const _verifyNonBlacklistedCidUpdated = (playlistsBeforeUpdate, playlistsAfterUpdate, nonBlacklistedCid) => {
    const previousPicCid = playlistsBeforeUpdate[0].playlist_image_sizes_multihash
    const updatedPicCid = playlistsAfterUpdate[0].playlist_image_sizes_multihash
    if (previousPicCid === updatedPicCid) {
      throw new Error(
        "Playlist cover photo CID should've updated. The rest of the test will produce a false positive."
      )
    }
    if (updatedPicCid !== nonBlacklistedCid) {
      throw new Error(
        'Playlist cover photo CID does not match the expected CID. The rest of this test relies on the hashing logic to be consistent, so it will fail.'
      )
    }
  }

  const _verifyBlacklistedCidDidNotUpdate = (playlists, blacklistedCid) => {
    const playlist = playlists[0]
    if (
      playlist.playlist_image_multihash === blacklistedCid ||
      playlist.playlist_image_sizes_multihash === blacklistedCid
    ) {
      throw new Error('Update playlist with blacklisted cover photo should not have been indexed.')
    }
  }

  await testUpdateFlow(
    'playlist cover photo',
    executeOne,
    _createAndUploadPlaylist,
    _getPlaylists,
    _createAndUploadCoverPhoto,
    _setCoverPhoto,
    _verifyNonBlacklistedCidUpdated,
    _verifyBlacklistedCidDidNotUpdate
  )
}

// Get the userId that is a creator with wallet index 1
async function getCreatorId ({
  numUsers,
  executeAll,
  executeOne,
  numCreatorNodes
}) {
  const walletIndexToUserIdMap = await addAndUpgradeUsers(
    numUsers,
    executeAll,
    executeOne
  )

  return walletIndexToUserIdMap[CREATOR_INDEX]
}

/**
* Tests blacklist functionality for updating an object with a property.
* An object is metadata (user, agreement, or playlist), and property is the field
* on the metadata that's being updated (agreement cover art, playlist cover photo,
* user cover photo, etc...) by:
* 1. Retrieving the object
* 2. Verifying that the object can successfully be modified when its CID is NOT blacklisted
* 3. Blacklisting a new CID
* 4. Modifying the object to use the blacklisted CID in some way
* 5. Verifying that the object fails to be modified when its CID is blacklisted
*/
async function testUpdateFlow(
  testName,
  executeOne,
  createAndUploadObject,
  getObject,
  createAndUploadProperty,
  setPropertyOnObject,
  verifyNonBlacklistedCidUpdated,
  verifyBlacklistedCidDidNotUpdate
 ) {
   try {
    // Create and upload the object
    const objectId = await createAndUploadObject()
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())
    const uploadedObject = await executeOne(CREATOR_INDEX, libs => getObject(libs, objectId))
    
    // Create non-blacklisted property for this object, and upload the property to a CN
    const nonBlacklistedCid = await executeOne(CREATOR_INDEX, libs => createAndUploadProperty(libs))
    
    // Update the object to contain the property set to the non-blacklisted CID
    await executeOne(
      CREATOR_INDEX,
      async libs => await setPropertyOnObject(libs, uploadedObject, nonBlacklistedCid)
    )
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())
    
    // Verify that the property was able to be set to a non-blacklisted CID.
    // This rules out false positives when we try to set the property to a blacklisted CID later
    const objectUpdatedNotBlacklisted = await executeOne(CREATOR_INDEX, libs => getObject(libs, objectId))
    verifyNonBlacklistedCidUpdated(uploadedObject, objectUpdatedNotBlacklisted, nonBlacklistedCid)
    
    // Create another property, upload it to a CN, and blacklist it
    const blacklistedCid = await executeOne(CREATOR_INDEX, libs => createAndUploadProperty(libs))
    const { digest: blacklistedDigest } = Utils.decodeMultihash(blacklistedCid)
    await executeOne(
      BLACKLISTER_INDEX,
      libs => addIPLDToBlacklist(libs, blacklistedDigest)
    )
    await executeOne(BLACKLISTER_INDEX, libs => libs.waitForLatestIPLDBlock())
    
    // Attempt to update the object to have a blacklisted property
    await executeOne(
      CREATOR_INDEX,
      libs => setPropertyOnObject(libs, uploadedObject, blacklistedCid)
    )
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())
    
    // Fetch the object again and verify that it was not indexed
    const objectAfterBlacklisting = await executeOne(CREATOR_INDEX, libs => getObject(libs, objectId))
    verifyBlacklistedCidDidNotUpdate(objectAfterBlacklisting, blacklistedCid)
  } catch (e) {
    let error = e
    if (e.message) {
      error = e.message
    }
    return {
      error: `Error with IPLD Blacklist test for update ${testName}: ${error}`
    }
  } finally {
    await fs.remove(TEMP_STORAGE_PATH)
  }
 } 

module.exports = IpldBlacklistTest
