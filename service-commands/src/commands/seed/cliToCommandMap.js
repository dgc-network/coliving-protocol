const fs = require('fs')
const {
    SeedUtils
} = require('../../utils')

const {
  parseMetadataIntoObject,
  getProgressCallback,
  getUserProvidedOrRandomAgreementFile,
  getUserProvidedOrRandomImageFile,
  getUserProvidedOrRandomAgreementMetadata,
  getRandomUserIdFromCurrentSeedSessionCache,
  getRandomAgreementIdFromCurrentSeedSessionCache,
  addAgreementToSeedSessionCache,
  getActiveUserFromSeedSessionCache,
  getRandomString
} = SeedUtils

/*
This file is the entrypoint for adding new methods.

Each entry must be structured as follows:
{
    'some-command': {
      api: 'LibsClass',
      description: 'high-level description',
      method: 'methodName', // belonging to LibsClass
      params: [
        {
          name: 'someParam', // should be camelCased; converted to kebab-case for CLI input automagically
          description: 'what this param is',
          userInputHandler: <function>, // optional
          defaultHandler: <function> // optional
        }
      ],
      onSuccess: <function> // optional, called with response from `await LibsClass.methodName(someParam)`
    }
}

^ The above, when added to this file, may be called on the command-line as `A seed some-command --some-param 'userinput'`.

Notes on params:
  * Params must be in order of original params in fn signature of libs API method.
  * All commands accept -id or --user-id param to set user that is performing the action.
  * Each param has an optional userInputHandler which coerces CLI user input to a format that can be accepted by the libs API class. Typically this is a constructor like Boolean/Number or something more involved like parseMetadataIntoObject, which converts comma-separated values into a JS Object.
  * Each param has an optional defaultHandler which combines/handles user-provided value asynchronously/provides randomized or default value for option (usually from the SeedSession instance, the second provided argument) when user-provided value is unavailable.

*/

const CLI_TO_COMMAND_MAP = {
    'upload-agreement': {
      api: 'Agreement',
      description: 'upload agreement with dummy live and cover art file',
      method: 'uploadAgreement',
      params: [
        {
          name: 'agreementFile',
          description: 'path to agreement file on local FS',
          userInputHandler: fs.ensureFileSync,
          defaultHandler: getUserProvidedOrRandomAgreementFile
        },
        {
          name: 'coverArtFile',
          description: 'path to cover art file on local FS',
          userInputHandler: fs.ensureFileSync,
          defaultHandler: getUserProvidedOrRandomImageFile,
        },
        {
          name: 'metadata',
          description: 'metadata for agreement in comma-separated string',
          userInputHandler: parseMetadataIntoObject,
          defaultHandler: getUserProvidedOrRandomAgreementMetadata,
        },
        {
          name: 'onProgress',
          description: 'non-configurable; this is hardcoded to log out upload progress to console',
          defaultHandler: getProgressCallback
        }
      ],
      onSuccess: addAgreementToSeedSessionCache
    },
    // below is the only API not working right now - failing with tx rejection 'caller does not own userId'
    // 'update-user': {
    //   api: 'User',
    //   description: 'update user metadata',
    //   method: 'updateUser',
    //   params: [
    //     {
    //       name: 'userId',
    //       description: 'user ID of user to update metadata for',
    //       userInputHandler: Number,
    //       defaultHandler: getActiveUserFromSeedSessionCache
    //     },
    //     {
    //       name: 'metadata',
    //       description: 'metadata for user in comma-separated string',
    //       userInputHandler: parseMetadataIntoObject
    //     }
    //   ]
    // },
    'follow-user': {
      api: 'User',
      description: 'follow user',
      method: 'addUserFollow',
      params: [
        {
          name: 'followeeUserId',
          description: 'user ID of user receiving the follow',
          userInputHandler: Number,
          defaultHandler: getRandomUserIdFromCurrentSeedSessionCache
        }
      ]
    },
    'unfollow-user': {
      api: 'User',
      description: 'unfollow user',
      method: 'deleteUserFollow',
      params: [
        {
          name: 'followeeUserId',
          description: 'user ID of user to stop following',
          userInputHandler: Number,
          defaultHandler: getRandomUserIdFromCurrentSeedSessionCache
        }
      ]
    },
    'repost-agreement': {
      api: 'Agreement',
      description: 'add agreement repost by user',
      method: 'addAgreementRepost',
      params: [
        {
          name: 'agreementId',
          description: 'agreement ID of agreement receiving the repost',
          userInputHandler: Number,
          defaultHandler: getRandomAgreementIdFromCurrentSeedSessionCache
        }
      ]
    },
    'favorite-agreement': {
      api: 'Agreement',
      description: 'add agreement favorite/save by user',
      method: 'addAgreementSave',
      params: [
        {
          name: 'agreementId',
          description: 'agreement ID of agreement receiving the favorite',
          userInputHandler: Number,
          defaultHandler: getRandomAgreementIdFromCurrentSeedSessionCache
        }
      ]
    },
    'create-playlist': {
      api: 'Playlist',
      description: 'create playlist',
      method: 'createPlaylist',
      params: [
        {
          name: 'userId',
          description: 'ID of user creating the playlist',
          userInputHandler: Number,
          defaultHandler: getActiveUserFromSeedSessionCache
        },
        {
          name: 'playlistName',
          description: 'name of playlist',
          defaultHandler: getRandomString
        },
        {
          name: 'isPrivate',
          description: 'set to true to create playlist as private',
          userInputHandler: Boolean,
          defaultHandler: () => false
        },
        {
          name: 'isAlbum',
          description: 'set to true to create playlist as album',
          userInputHandler: Boolean,
          defaultHandler: () => false
        },
        {
          name: 'agreementIds',
          description: 'comma-separated list of agreement IDs to associate with the playlist - example: 5,6',
          userInputHandler: userInput => userInput.split(',').map(Number)
        }
      ]
    },
    'add-playlist-agreement': {
      api: 'Playlist',
      description: 'add agreement to playlist (must be owned by user ID passed in as active user)',
      method: 'addPlaylistAgreement',
      params: [
        {
          name: 'playlistId',
          description: 'ID of playlist to add agreement to (must already exist)',
          userInputHandler: Number
        },
        {
          name: 'agreementId',
          description: 'ID of agreement to add',
          userInputHandler: Number
        }
      ]
    },
    'repost-playlist': {
      api: 'Playlist',
      description: 'repost playlist',
      method: 'addPlaylistRepost',
      params: [
        {
          name: 'playlistId',
          description: 'ID of playlist to repost',
          userInputHandler: Number
        }
      ]
    },
    'favorite-playlist': {
      api: 'Playlist',
      description: 'favorite playlist',
      method: 'addPlaylistSave',
      params: [
        {
          name: 'playlistId',
          description: 'ID of playlist to favorite',
          userInputHandler: Number
        }
      ]
    }
}

module.exports = CLI_TO_COMMAND_MAP
