/** Wrapper class for all e2e tests */
import * as testContract from './testContract.js'
import * as testContentList from './testContentList'
import * as testDigitalContent from './testDigitalContent'
import * as testUser from './testUser'

let fns = {}
Object.assign(fns, testContract, testContentList, testDigitalContent, testUser)

module.exports = fns
