const Setup = require('./setup')

const { LibsWrapper, Utils } = require('./libs')

// Any method you add in these commands files will be automatically imported
// and accessible via ServiceCommands
const User = require('./commands/users')
const Agreement = require('./commands/agreements')
const File = require('./commands/files')
const IpldBlacklist = require('./commands/ipldBlacklist')
const ContentList = require('./commands/contentLists')
const DataContracts = require('./commands/dataContracts')
const SeedSession = require('./commands/seed')
const {
  RandomUtils,
  SeedUtils,
  Constants
} = require('./utils')

module.exports = {
  LibsWrapper,
  Utils,
  ...Setup,
  ...User,
  ...Agreement,
  ...File,
  ...IpldBlacklist,
  ...ContentList,
  ...DataContracts,
  SeedSession,
  RandomUtils,
  SeedUtils,
  Constants
}
