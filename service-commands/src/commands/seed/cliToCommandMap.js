const fs = require('fs')
const {
    SeedUtils
} = require('../../utils')

const {
  parseMetadataIntoObject,
  getProgressCallback,
  getUserProvidedOrRandomDigitalContentFile,
  getUserProvidedOrRandomImageFile,
  getUserProvidedOrRandomDigitalContentMetadata,
  getRandomUserIdFromCurrentSeedSessionCache,
  getRandomDigitalContentIdFromCurrentSeedSessionCache,
  addDigitalContentToSeedSessionCache,
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
    'upload-digital-content': {
      api: 'DigitalContent',
      description: 'upload digital_content with dummy digitalcoin and cover art file',
      method: 'uploadDigitalContent',
      params: [
        {
          name: 'digitalContentFile',
          description: 'path to digital_content file on local FS',
          userInputHandler: fs.ensureFileSync,
          defaultHandler: getUserProvidedOrRandomDigitalContentFile
        },
        {
          name: 'coverArtFile',
          description: 'path to cover art file on local FS',
          userInputHandler: fs.ensureFileSync,
          defaultHandler: getUserProvidedOrRandomImageFile,
        },
        {
          name: 'metadata',
          description: 'metadata for digital_content in comma-separated string',
          userInputHandler: parseMetadataIntoObject,
          defaultHandler: getUserProvidedOrRandomDigitalContentMetadata,
        },
        {
          name: 'onProgress',
          description: 'non-configurable; this is hardcoded to log out upload progress to console',
          defaultHandler: getProgressCallback
        }
      ],
      onSuccess: addDigitalContentToSeedSessionCache
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
    'repost-digital-content': {
      api: 'DigitalContent',
      description: 'add digital_content repost by user',
      method: 'addDigitalContentRepost',
      params: [
        {
          name: 'digitalContentId',
          description: 'digital_content ID of digital_content receiving the repost',
          userInputHandler: Number,
          defaultHandler: getRandomDigitalContentIdFromCurrentSeedSessionCache
        }
      ]
    },
    'favorite-digital-content': {
      api: 'DigitalContent',
      description: 'add digital_content favorite/save by user',
      method: 'addDigitalContentSave',
      params: [
        {
          name: 'digitalContentId',
          description: 'digital_content ID of digital_content receiving the favorite',
          userInputHandler: Number,
          defaultHandler: getRandomDigitalContentIdFromCurrentSeedSessionCache
        }
      ]
    },
    'create-content-list': {
      api: 'ContentList',
      description: 'create contentList',
      method: 'createContentList',
      params: [
        {
          name: 'userId',
          description: 'ID of user creating the contentList',
          userInputHandler: Number,
          defaultHandler: getActiveUserFromSeedSessionCache
        },
        {
          name: 'contentListName',
          description: 'name of contentList',
          defaultHandler: getRandomString
        },
        {
          name: 'isPrivate',
          description: 'set to true to create contentList as private',
          userInputHandler: Boolean,
          defaultHandler: () => false
        },
        {
          name: 'isAlbum',
          description: 'set to true to create contentList as album',
          userInputHandler: Boolean,
          defaultHandler: () => false
        },
        {
          name: 'digitalContentIds',
          description: 'comma-separated list of digital_content IDs to associate with the contentList - example: 5,6',
          userInputHandler: userInput => userInput.split(',').map(Number)
        }
      ]
    },
    'add-content-list-digital-content': {
      api: 'ContentList',
      description: 'add digital_content to contentList (must be owned by user ID passed in as active user)',
      method: 'addContentListDigitalContent',
      params: [
        {
          name: 'contentListId',
          description: 'ID of contentList to add digital_content to (must already exist)',
          userInputHandler: Number
        },
        {
          name: 'digitalContentId',
          description: 'ID of digital_content to add',
          userInputHandler: Number
        }
      ]
    },
    'repost-content-list': {
      api: 'ContentList',
      description: 'repost contentList',
      method: 'addContentListRepost',
      params: [
        {
          name: 'contentListId',
          description: 'ID of contentList to repost',
          userInputHandler: Number
        }
      ]
    },
    'favorite-content-list': {
      api: 'ContentList',
      description: 'favorite contentList',
      method: 'addContentListSave',
      params: [
        {
          name: 'contentListId',
          description: 'ID of contentList to favorite',
          userInputHandler: Number
        }
      ]
    }
}

module.exports = CLI_TO_COMMAND_MAP
