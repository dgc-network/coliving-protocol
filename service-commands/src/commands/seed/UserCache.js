const fs = require('fs')

const { Constants } = require('../../utils')

const { SEED_CACHE_PATH } = Constants

class UserCache {
  constructor() {
    this.CACHE_PATH = SEED_CACHE_PATH
  }

  update = cacheObject => {
    fs.writeFileSync(this.CACHE_PATH, JSON.stringify(cacheObject))
    return
  }

  getActiveUser = () => {
    const cache = this.get()
    const defaultAlias = null
    const defaultDetails = {}
    const activeUser = Object.entries(cache).find(([alias, details]) => {
      return details && details.active
    }) || [defaultAlias, defaultDetails]
    const activeUserObject = activeUser[1]

    return activeUserObject
  }

  setActiveUser = alias => {
    let cache = this.get()
    let currentlyActiveUser = this.getActiveUser()
    currentlyActiveUser['active'] = false
    let newActiveUser = cache[alias]
    newActiveUser['active'] = true
    this.update(cache)
  }

  addUser = ({ alias, hedgehogEntropyKey, userId = null }) => {
    let cache = this.get()
    cache[alias] = {
      userId,
      hedgehogEntropyKey,
      tracks: [],
      active: false
    }
    this.update(cache)
  }

  addLoginDetails = ({ entropy, email, password }) => {
    const match = ([alias, { hedgehogEntropyKey }]) => {
      return hedgehogEntropyKey === entropy
    }
    let cache = this.get()
    const [alias, info] = Object.entries(cache).find(match)
    cache[alias] = Object.assign(info, { email, password })
    this.update(cache)
  }

  addWalletDetails = ({ entropy, privKey }) => {
    const match = ([alias, { hedgehogEntropyKey }]) => {
      return hedgehogEntropyKey === entropy
    }
    let cache = this.get()
    const [alias, info] = Object.entries(cache).find(match)
    cache[alias] = Object.assign(info, { wallet: { privKey } })
    this.update(cache)
  }

  get = () => {
    let cache
    if (fs.existsSync(this.CACHE_PATH)) {
      cache = JSON.parse(fs.readFileSync(this.CACHE_PATH))
    } else {
      cache = {}
    }
    return cache
  }

  findUser = ({ alias, userId }) => {
    const cache = this.get()
    const match = ([cacheAlias, { userId: cacheUserId }]) => {
      return alias === cacheAlias || userId == cacheUserId
    }
    const [userAlias, userDetails] = Object.entries(cache).find(match) || {}
    return Object.assign(userDetails, { userAlias })
  }

  addTrackToCachedUserDetails = ({ userId, trackId }) => {
    const cache = this.get()
    let { userAlias, ...userDetails } = this.findUser({ userId })
    userDetails.tracks = userDetails.tracks.concat([trackId])
    cache[userAlias] = userDetails
    this.update(cache)
  }

  getUsers = () => {
    return Object.values(this.get())
  }

  getTracks = () => {
    return Object.values(this.get())
      .map(u => u.tracks)
      .flat()
  }

  clear = () => {
    this.update({})
  }
}

module.exports = UserCache
