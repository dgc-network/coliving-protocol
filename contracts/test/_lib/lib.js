/** Wrapper class for all e2e tests */
import * as testContract from './testContract.js'
import * as testPlaylist from './testPlaylist'
import * as testAgreement from './testAgreement'
import * as testUser from './testUser'

let fns = {}
Object.assign(fns, testContract, testPlaylist, testAgreement, testUser)

module.exports = fns
