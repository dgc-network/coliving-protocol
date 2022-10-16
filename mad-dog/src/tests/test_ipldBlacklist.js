const ServiceCommands = require('@coliving/service-commands')
const {
  addIPLDToBlacklist,
  updateDigitalContentOnChain,
  updateDigitalContentOnChainAndCnode,
  addDigitalContentToChain,
  uploadDigitalContent,
  uploadDigitalContentCoverArt,
  uploadProfilePic,
  uploadCoverPhoto,
  getDigitalContentMetadata,
  updateMultihash,
  updateCreator,
  updateCoverPhoto,
  updateProfilePhoto,
  createContentList,
  updateContentListCoverPhoto,
  uploadContentListCoverPhoto,
  getContentLists,
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
  getRandomDigitalContentMetadata,
  getRandomDigitalContentFilePath,
  genRandomString
} = RandomUtils
const { logger } = require('../logger.js')
const { libs } = require('@coliving/sdk')
const LibsUtils = libs.Utils

const TEMP_STORAGE_PATH = path.resolve('./local-storage/tmp/')

const BLACKLISTER_INDEX = 0 // blacklister wallet address = 0th libs instance (see index.js)
const CREATOR_INDEX = 1

const IpldBlacklistTest = {}

// TEST NEW DIGITAL_CONTENT FLOW -- BLACKLISTED METADATA CID
IpldBlacklistTest.newDigitalContentMetadata = async ({
  numUsers,
  executeAll,
  executeOne,
  numContentNodes
}) => {
  try {
    const userId = await getCreatorId({
      numUsers,
      executeAll,
      executeOne,
      numContentNodes
    })

    // Create and upload a throwaway digital_content
    const throwawayDigitalContent = getRandomDigitalContentMetadata(userId)
    const randomDigitalContentFilePath = await getRandomDigitalContentFilePath(TEMP_STORAGE_PATH)
    const throwawayDigitalContentId = await executeOne(CREATOR_INDEX, libsWrapper => {
      return uploadDigitalContent(libsWrapper, throwawayDigitalContent, randomDigitalContentFilePath)
    })

    // Verify that fetching the throwaway digital_content doesn't throw any errors
    const uploadedThrowawayDigitalContent = await executeOne(CREATOR_INDEX, libsWrapper => {
      return getDigitalContentMetadata(libsWrapper, throwawayDigitalContentId)
    })
    const throwawayDigitalContentMetadataCid = uploadedThrowawayDigitalContent.metadata_multihash
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())

    // Make a new digital_content with a different title so it has a different metadata CID
    const blacklistedDigitalContentMetadata = {
      ...throwawayDigitalContent,
      title: `Blacklisted DigitalContent ${genRandomString(8)}`
    }
    const blacklistedMetadataCid = await LibsUtils.fileHasher.generateNonImageCid(
      Buffer.from(JSON.stringify(blacklistedDigitalContentMetadata))
    )
    if (blacklistedMetadataCid === throwawayDigitalContentMetadataCid) {
      return {
        error: "Metadata of blacklisted digital_content should have different CID from throwaway digital_content's metadata."
      }
    }

    // Blacklist the digital_content metadata's CID before uploading it
    const digitalContentMultihashDecoded = Utils.decodeMultihash(blacklistedMetadataCid)
    logger.info(`Adding CID ${blacklistedMetadataCid} to the IPLD Blacklist!`)
    const ipldTxReceipt = await executeOne(BLACKLISTER_INDEX, libsWrapper => {
      return addIPLDToBlacklist(libsWrapper, digitalContentMultihashDecoded.digest)
    })
    await executeOne(BLACKLISTER_INDEX, libs => libs.waitForLatestIPLDBlock())

    // Verify that attempting to upload the digital_content with blacklisted metadata fails
    try {
      const blacklistedDigitalContentId = await executeOne(CREATOR_INDEX, libsWrapper => {
        return uploadDigitalContent(libsWrapper, blacklistedDigitalContentMetadata, randomDigitalContentFilePath)
      })
      const uploadedDigitalContentAfterUpdate = await executeOne(CREATOR_INDEX, libsWrapper => {
        return getDigitalContentMetadata(libsWrapper, blacklistedDigitalContentId)
      })
      throw new Error(`Upload succeeded but should have failed with error 'No digitalContents returned.'`)
    } catch (e) {
      if (e.message !== 'No digitalContents returned.') {
        return {
          error: `Error with IPLD Blacklist test for new digital_content with blacklisted metadata: ${e.message}`
        }
      }
    }
  } catch (e) {
    let error = e
    if (e.message) {
      error = e.message
    }

    return {
      error: `Error with IPLD Blacklist test for update digital_content with blacklisted metadata CID: ${error}`
    }
  } finally {
    await fs.remove(TEMP_STORAGE_PATH)
  }
}

// TEST UPDATE DIGITAL_CONTENT FLOW -- BLACKLISTED METADATA CID
IpldBlacklistTest.updateDigitalContentMetadata = async ({
  numUsers,
  executeAll,
  executeOne,
  numContentNodes
}) => {
  try {
    const userId = await getCreatorId({
      numUsers,
      executeAll,
      executeOne,
      numContentNodes
    })

    // Create and upload digital_content
    const digital_content = getRandomDigitalContentMetadata(userId)
    const randomDigitalContentFilePath = await getRandomDigitalContentFilePath(TEMP_STORAGE_PATH)
    const digitalContentId = await executeOne(CREATOR_INDEX, libsWrapper => {
      return uploadDigitalContent(libsWrapper, digital_content, randomDigitalContentFilePath)
    })

    // Keep digital_content of original metadata CID
    const uploadedDigitalContentBeforeUpdate = await executeOne(CREATOR_INDEX, libsWrapper => {
      return getDigitalContentMetadata(libsWrapper, digitalContentId)
    })
    const originalMetadataCID = uploadedDigitalContentBeforeUpdate.metadata_multihash
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())

    // Modify a copy of the metadata to generate a new CID that's acceptable (not blacklisted)
    const acceptableDigitalContentMetadata = {
      ...digital_content,
      digital_content_id: uploadedDigitalContentBeforeUpdate.digital_content_id,
      digital_content_segments: uploadedDigitalContentBeforeUpdate.digital_content_segments,
      title: `Updated Title ${genRandomString(8)}`
    }
    const acceptableMetadataCid = await LibsUtils.fileHasher.generateNonImageCid(Buffer.from(JSON.stringify(acceptableDigitalContentMetadata)))

    // Update the digital_content to metadata that's acceptable (not blacklisted)
    await executeOne(CREATOR_INDEX, libsWrapper => {
      return updateDigitalContentOnChainAndCnode(libsWrapper, acceptableDigitalContentMetadata)
    })
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())

    // Ensure that the update was successful (digital_content has new metadata CID)
    const uploadedDigitalContentAfterAcceptableUpdate = await executeOne(CREATOR_INDEX, libsWrapper => {
      return getDigitalContentMetadata(libsWrapper, digitalContentId)
    })
    const updatedAcceptableDigitalContentMetadataCid = uploadedDigitalContentAfterAcceptableUpdate.metadata_multihash
    if (updatedAcceptableDigitalContentMetadataCid === originalMetadataCID) {
      return {
        error: "DigitalContent metadata CID should've updated. The rest of the test will produce a false positive."
      }
    }
    if (updatedAcceptableDigitalContentMetadataCid !== acceptableMetadataCid) {
      return {
        error: 'DigitalContent metadata CID does not match the expected metadata. The rest of this test relies on the hashing logic to be consistent, so it will fail.'
      }
    }

    // Make new metadata again and this time blacklist its CID
    const blacklistedDigitalContentMetadata = {
      ...digital_content,
      digital_content_id: uploadedDigitalContentBeforeUpdate.digital_content_id,
      digital_content_segments: uploadedDigitalContentBeforeUpdate.digital_content_segments,
      title: `Second Updated Title ${genRandomString(8)}`
    }
    const blacklistedMetadataCid = await LibsUtils.fileHasher.generateNonImageCid(Buffer.from(JSON.stringify(blacklistedDigitalContentMetadata)))

    // Send tx to add the blacklisted metadata CID to the ipld blacklist
    const digitalContentMultihashDecoded = Utils.decodeMultihash(blacklistedMetadataCid)
    logger.info(`Adding CID ${blacklistedMetadataCid} to the IPLD Blacklist!`)
    const ipldTxReceipt = await executeOne(BLACKLISTER_INDEX, libsWrapper => {
      return addIPLDToBlacklist(libsWrapper, digitalContentMultihashDecoded.digest)
    })
    await executeOne(BLACKLISTER_INDEX, libs => libs.waitForLatestIPLDBlock())

    // Attempt to update the digital_content to metadata that's blacklisted
    await executeOne(CREATOR_INDEX, libsWrapper => {
      return updateDigitalContentOnChainAndCnode(libsWrapper, blacklistedDigitalContentMetadata)
    })
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())

    // Ensure that the update was unsuccessful (digital_content has original metadata cid)
    const uploadedDigitalContentAfterUpdate = await executeOne(CREATOR_INDEX, libsWrapper => {
      return getDigitalContentMetadata(libsWrapper, digitalContentId)
    })
    if (acceptableMetadataCid !== uploadedDigitalContentAfterUpdate.metadata_multihash) {
      return {
        error: 'Update digital_content with blacklisted metadata CID should not have been indexed.'
      }
    }
  } catch (e) {
    let error = e
    if (e.message) {
      error = e.message
    }

    return {
      error: `Error with IPLD Blacklist test for update digital_content with blacklisted metadata CID: ${error}`
    }
  } finally {
    await fs.remove(TEMP_STORAGE_PATH)
  }
}

// TEST NEW DIGITAL_CONTENT FLOW -- BLACKLISTED COVER PHOTO CID
IpldBlacklistTest.newDigitalContentCoverPhoto = async ({
  numUsers,
  executeAll,
  executeOne,
  numContentNodes
}) => {
  let digitalContentTxReceipt
  try {
    const userId = await getCreatorId({
      numUsers,
      executeAll,
      executeOne,
      numContentNodes
    })

    // Generate cover art and upload it to a Content Node
    const acceptableCoverArtFilePath = await getRandomImageFilePath(TEMP_STORAGE_PATH)
    const acceptableCID = await executeOne(
      CREATOR_INDEX,
      libsWrapper => uploadDigitalContentCoverArt(libsWrapper, acceptableCoverArtFilePath)
    )

    // Make digital_content metadata containing acceptable cover art CID
    const acceptableDigitalContentToUpload = {
      ...getRandomDigitalContentMetadata(userId),
      cover_art: acceptableCID,
      cover_art_sizes: acceptableCID
    }

    // Verify that the digital_content with non-blacklisted cover art can upload successfully
    const randomAcceptableDigitalContentFilePath = await getRandomDigitalContentFilePath(TEMP_STORAGE_PATH)
    const acceptableDigitalContentId = await executeOne(
      CREATOR_INDEX,
      libsWrapper => uploadDigitalContent(libsWrapper, acceptableDigitalContentToUpload, randomAcceptableDigitalContentFilePath)
    )
    await executeOne(CREATOR_INDEX, libs => libs.waitForLatestBlock())
    const fetchedDigitalContentWithAcceptableCoverArt = await executeOne(
      CREATOR_INDEX,
      libsWrapper => getDigitalContentMetadata(libsWrapper, acceptableDigitalContentId)
    )
    if (
      fetchedDigitalContentWithAcceptableCoverArt.cover_art_sizes !== acceptableCID
    ) {
      return {
        error:
          "DigitalContent metadata should've included cover art. The rest of the test will produce a false positive."
      }
    }

    // Upload cover art image and blacklist its CID
    const blacklistedCoverArtFilePath = await getRandomImageFilePath(TEMP_STORAGE_PATH)
    const blacklistedCID = await executeOne(
      CREATOR_INDEX,
      libsWrapper => uploadDigitalContentCoverArt(libsWrapper, blacklistedCoverArtFilePath)
    )
    const digitalContentMultihashDecoded = Utils.decodeMultihash(blacklistedCID)
    logger.info(`Adding CID ${blacklistedCID} to the IPLD Blacklist!`)
    const ipldTxReceipt = await executeOne(BLACKLISTER_INDEX, libsWrapper => {
      return addIPLDToBlacklist(libsWrapper, digitalContentMultihashDecoded.digest)
    })
    await executeOne(BLACKLISTER_INDEX, libs => libs.waitForLatestIPLDBlock())

    // Make digital_content metadata containing blacklisted cover art CID
    const digitalContentToUploadWithBlacklistedCoverArt = {
      ...getRandomDigitalContentMetadata(userId),
      cover_art: blacklistedCID,
      cover_art_sizes: blacklistedCID
    }
    const randomDigitalContentFilePath = await getRandomDigitalContentFilePath(TEMP_STORAGE_PATH)

    // Verify that attempting to upload the digital_content with blacklisted cover art fails
    try {
      await executeOne(CREATOR_INDEX, libsWrapper => {
        return uploadDigitalContent(libsWrapper, digitalContentToUploadWithBlacklistedCoverArt, randomDigitalContentFilePath)
      })
      throw new Error(`Upload succeeded but should have failed with error 'No digitalContents returned.'`)
    } catch (e) {
      if (e.message !== 'No digitalContents returned.') {
        return {
          error: `Error with IPLD Blacklist test for new digital_content with blacklisted cover photo: ${e.message}`
        }
      }
    }
  } catch (e) {
    return {
      error: `Error with IPLD Blacklist test for new digital_content with blacklisted cover photo: ${e.message}`
    }
  }  finally {
    await fs.remove(TEMP_STORAGE_PATH)
  }
}

// TEST UPDATE DIGITAL_CONTENT FLOW -- BLACKLISTED COVER PHOTO CID
IpldBlacklistTest.updateDigitalContentCoverPhoto = async ({
  numUsers,
  executeAll,
  executeOne,
  numContentNodes
}) => {
  const userId = await getCreatorId({
    numUsers,
    executeAll,
    executeOne,
    numContentNodes
  })

  const digitalContentToUpload = getRandomDigitalContentMetadata(userId)

  const _createAndUploadDigitalContent = async () => {
    const randomDigitalContentFilePath = await getRandomDigitalContentFilePath(TEMP_STORAGE_PATH)
    const digitalContentId = await executeOne(CREATOR_INDEX, libsWrapper => {
      return uploadDigitalContent(libsWrapper, digitalContentToUpload, randomDigitalContentFilePath)
    })
    return digitalContentId
  }

  const _createAndUploadCoverArt = async (libs) =>
    uploadDigitalContentCoverArt(libs, await getRandomImageFilePath(TEMP_STORAGE_PATH))

  const _setCoverArt = async (libs, uploadedDigitalContent, cid) => {
    const digitalContentUpdatedWithAcceptableCoverArt = {
      ...digitalContentToUpload,
      digital_content_id: uploadedDigitalContent.digital_content_id,
      digital_content_segments: uploadedDigitalContent.digital_content_segments,
      cover_art: cid,
      cover_art_sizes: cid
    }
    return updateDigitalContentOnChainAndCnode(libs, digitalContentUpdatedWithAcceptableCoverArt)
  }

  const _verifyNonBlacklistedCidUpdated = (digitalContentBeforeUpdate, digitalContentAfterUpdate, nonBlacklistedCid) => {
    const previousPicCid = digitalContentBeforeUpdate.cover_art_sizes
    const updatedPicCid = digitalContentAfterUpdate.cover_art_sizes
    if (previousPicCid === updatedPicCid) {
      throw new Error(
        "DigitalContent cover art CID should've updated. The rest of the test will produce a false positive."
      )
    }
    if (updatedPicCid !== nonBlacklistedCid) {
      throw new Error(
        'DigitalContent cover art CID does not match the expected CID. The rest of this test relies on the hashing logic to be consistent, so it will fail.'
      )
    }
  }

  const _verifyBlacklistedCidDidNotUpdate = (digital_content, blacklistedCid) => {
    if (
      digital_content.cover_art === blacklistedCid ||
      digital_content.cover_art_sizes === blacklistedCid
    ) {
      throw new Error('Update digital_content with blacklisted cover photo should not have been indexed.')
    }
  }

  await testUpdateFlow(
    'digital_content cover photo',
    executeOne,
    _createAndUploadDigitalContent,
    getDigitalContentMetadata,
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
  numContentNodes
}) => {
  try {
    const userId = await getCreatorId({
      numUsers,
      executeAll,
      executeOne,
      numContentNodes
    })

    // Keep digital_content of original metadata CID
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
    const digitalContentMultihashDecoded = Utils.decodeMultihash(blacklistedMetadataCid)
    logger.info(`Adding CID ${blacklistedMetadataCid} to the IPLD Blacklist!`)
    const ipldTxReceipt = await executeOne(BLACKLISTER_INDEX, libsWrapper => {
      return addIPLDToBlacklist(libsWrapper, digitalContentMultihashDecoded.digest)
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
  numContentNodes
}) => {
  const userId = await getCreatorId({
    numUsers,
    executeAll,
    executeOne,
    numContentNodes
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
  numContentNodes
}) => {
  const userId = await getCreatorId({
    numUsers,
    executeAll,
    executeOne,
    numContentNodes
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

// TEST UPDATE CONTENT_LIST FLOW -- BLACKLISTED COVER PHOTO CID
IpldBlacklistTest.updateContentListCoverPhoto = async ({
  numUsers,
  executeAll,
  executeOne,
  numContentNodes
}) => {
  const userId = await getCreatorId({
    numUsers,
    executeAll,
    executeOne,
    numContentNodes
  })

  const _createAndUploadContentList = async () => {
    const randomContentListName = genRandomString(8)
    const { contentListId } = await executeOne(CREATOR_INDEX, libsWrapper => {
      return createContentList(
        libsWrapper,
        userId,
        randomContentListName,
        false,
        false,
        []
      )
    })
    return contentListId
  }

  const _createAndUploadCoverPhoto = async (libs) => {
    const randomCoverPhotoFilePath = await getRandomImageFilePath(TEMP_STORAGE_PATH)
    const cid = await executeOne(
      CREATOR_INDEX,
      libsWrapper => uploadContentListCoverPhoto(libsWrapper, randomCoverPhotoFilePath)
    )
    return cid
  }

  const _getContentLists = async (libs, contentListId) =>
    getContentLists(libs, 1, 0, [contentListId], userId, false)

  const _setCoverPhoto = async (libs, uploadedContentLists, cid) => {
    const { digest } = Utils.decodeMultihash(cid)
    await executeOne(
      CREATOR_INDEX,
      libsWrapper => {
        return updateContentListCoverPhoto(
          libsWrapper,
          uploadedContentLists[0].content_list_id,
          digest
        )
      }
    )
  }

  const _verifyNonBlacklistedCidUpdated = (contentListsBeforeUpdate, contentListsAfterUpdate, nonBlacklistedCid) => {
    const previousPicCid = contentListsBeforeUpdate[0].content_list_image_sizes_multihash
    const updatedPicCid = contentListsAfterUpdate[0].content_list_image_sizes_multihash
    if (previousPicCid === updatedPicCid) {
      throw new Error(
        "ContentList cover photo CID should've updated. The rest of the test will produce a false positive."
      )
    }
    if (updatedPicCid !== nonBlacklistedCid) {
      throw new Error(
        'ContentList cover photo CID does not match the expected CID. The rest of this test relies on the hashing logic to be consistent, so it will fail.'
      )
    }
  }

  const _verifyBlacklistedCidDidNotUpdate = (contentLists, blacklistedCid) => {
    const contentList = contentLists[0]
    if (
      contentList.content_list_image_multihash === blacklistedCid ||
      contentList.content_list_image_sizes_multihash === blacklistedCid
    ) {
      throw new Error('Update contentList with blacklisted cover photo should not have been indexed.')
    }
  }

  await testUpdateFlow(
    'contentList cover photo',
    executeOne,
    _createAndUploadContentList,
    _getContentLists,
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
  numContentNodes
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
* An object is metadata (user, digital_content, or contentList), and property is the field
* on the metadata that's being updated (digital_content cover art, contentList cover photo,
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
