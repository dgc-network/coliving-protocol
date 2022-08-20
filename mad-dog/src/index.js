const ServiceCommands = require('@coliving/service-commands')
const ContainerLogs = require('@coliving/service-commands/src/ContainerLogs')
const { _ } = require('lodash')
 
const { logger, addFileLogger } = require('./logger.js')
const { makeExecuteAll, makeExecuteOne } = require('./helpers.js')
const {
 coreIntegration,
 snapbackSMParallelSyncTest,
 userReplicaSetManagerTest,
 IpldBlacklistTest,
 userReplicaSetBlockSaturationTest,
 agreementListenCountsTest,
 SnapbackReconfigTests
} = require('./tests/')
 
// Configuration.
// Should be CLI configurable in the future.
const DEFAULT_NUM_CONTENT_NODES = 4
const DEFAULT_NUM_USERS = 2
const SNAPBACK_NUM_USERS = 10
const USER_REPLICA_SET_NUM_USERS = 4
const MAD_DOG_NIGHTLY_DURATION_SECONDS = 300
 
// Allow command line args for wallet index offset
const commandLineOffset = parseInt(process.argv.slice(4)[0])
let accountOffset = commandLineOffset || 0
 
const {
 runSetupCommand,
 Service,
 SetupCommand,
 LibsWrapper,
 allUp
} = ServiceCommands
 
const contentNodeHealthChecks = _.range(1, DEFAULT_NUM_CONTENT_NODES + 1).reduce(
 (acc, cur) => {
   return [
     ...acc,
     [
       Service.CONTENT_NODE,
       SetupCommand.HEALTH_CHECK,
       { verbose: true, serviceNumber: cur }
     ]
   ]
 },
 []
)
const services = [
 [Service.DISCOVERY_PROVIDER, SetupCommand.HEALTH_CHECK],
 [Service.IDENTITY_SERVICE, SetupCommand.HEALTH_CHECK],
 ...contentNodeHealthChecks
]
 
// Writing IPLD txns to chain require the 0th indexed wallet.
// This flag is set to 'true' to run the test with the 0th indexed wallet.
// The default will be 'undefined' for the other tests that do not require
// this flag.
// The `additionalConfigs` is used for additional parameters for tests
// * It is used to pass in `iterations` for the test_userReplicaSetNodes
const makeTest = (name, testFn, { numUsers, numCreatorNodes, useZeroIndexedWallet, executeAllBatchSize = numUsers + 1, ...additionalConfigs }) => {
 const wrappedTest = async ({ executeAll, executeOne }) => {
   try {
     const res = await testFn({
       executeAll,
       executeOne,
       numUsers,
       numCreatorNodes,
       ...additionalConfigs
     })
     if (res && res.error) return { error: res.error }
     return { success: true }
   } catch (e) {
     return { error: e.message }
   }
 }
 return {
   testName: name,
   test: wrappedTest,
   numUsers,
   useZeroIndexedWallet,
   executeAllBatchSize
 }
}
 
const testRunner = async tests => {
 const failedTests = []
 
 // Run each test
 for (const { testName, test, numUsers, useZeroIndexedWallet, executeAllBatchSize } of tests) {
   const date = new Date().toISOString()
   const fileLoggerName = `${testName}-${date}`
   const removeLogger = addFileLogger(fileLoggerName)
 
   logger.info(`Running test [${testName}]`)
 
   const libsInstances = await generateLibsInstances(numUsers, useZeroIndexedWallet, executeAllBatchSize)
   const executeAll = makeExecuteAll(libsInstances, executeAllBatchSize)
   const executeOne = makeExecuteOne(libsInstances)
 
   const { error } = await test({ executeAll, executeOne })
   if (error) {
     const msg = `Failed test [${testName}] with error [${error}]`
     logger.error(msg)
     failedTests.push(msg)
   }
   removeLogger()
 }
 
 if (failedTests.length > 0) throw new Error(`\n${JSON.stringify(failedTests, null, 2)}`)
}
 
async function generateLibsInstances (numUsers, useZeroIndexedWallet = false, executeAllBatchSize) {
  let libsInstances = []
 
  // Performing certain special actions the 0th indexed wallet (e.g. writing
  // an IPLD blacklist transaction).
  // Here, we init a libs instance with the 0th wallet and set it in index 0
  // of the libs array
  if (useZeroIndexedWallet) {
    const libsWithWalletIndex0 = new LibsWrapper(0)
    libsInstances.push(libsWithWalletIndex0)
    // If offset is 0, incr by 1 to not use wallet 0
    accountOffset = accountOffset === 0 ? accountOffset + 1 : accountOffset
    // Decrement numUsers by 1 as libsWithWallet0 is one of the created users
    numUsers--
  }

  // Create numUsers of libs instances and then asynchronously init them all
  libsInstances = libsInstances.concat(_.range(numUsers).map(i =>
    new LibsWrapper(i + accountOffset)
  ))

  let instancePromiseResults = []
  for (let i = 0; i < libsInstances.length; i += executeAllBatchSize) {
    const libsInstancesSlice = libsInstances.slice(i, i + executeAllBatchSize)

    const instancePromiseResultSlice = await Promise.all(
      libsInstancesSlice.map(async (instance) => {
        await instance.initLibs()
        return instance
      })
    )
    instancePromiseResults = instancePromiseResults.concat(instancePromiseResultSlice)
  }
  return instancePromiseResults
}
 
// Check to see if verbose mode (print out container logs)
const isVerbose = () => {
 const verbose = process.argv[process.argv.length - 1]
 return verbose && verbose.toLowerCase() === 'verbose'
}
 
// TODO: This should go away when we have multiple tests.
async function main () {
 logger.info('🐶 * Woof Woof * Welcome to Mad-Dog 🐶')
 
 logger.info('Ensuring all nodes are healthy..')
 try {
   await Promise.all(
     services.map(s => runSetupCommand(...s, { verbose: true }))
   )
 } catch (e) {
   logger.error('Some or all health checks failed. Please check the necessary protocol logs.\n', e)
   process.exit(1)
 }
 
 const cmd = process.argv[3]
 const verbose = isVerbose()
 
 try {
   switch (cmd) {
     case 'test': {
       const test = makeTest('consistency', coreIntegration, {
         numCreatorNodes: DEFAULT_NUM_CONTENT_NODES,
         numUsers: DEFAULT_NUM_USERS
       })
       await testRunner([test])
       break
     }
     case 'test-snapback': {
       const snapbackNumUsers = 40
       const test = makeTest(
         'snapback',
         snapbackSMParallelSyncTest,
         {
           numUsers: snapbackNumUsers
         }
       )
       await testRunner([test])
       break
     }
     case 'test-ursm': {
       const test = makeTest(
         'userReplicaSetManager',
         userReplicaSetManagerTest,
         {
           numUsers: USER_REPLICA_SET_NUM_USERS
         })
       await testRunner([test])
       break
     }
     case 'test-ursm-sat': {
       const test = makeTest(
         'userReplicaSetBlockSaturationTest',
         userReplicaSetBlockSaturationTest,
         {
           numUsers: 1
         })
       await testRunner([test])
       break
     }
     case 'test-ursm-nodes': {
       const deregisterCNTest = makeTest(
         'snapbackReconfigTestDeregisterCN',
         SnapbackReconfigTests.deregisterCN,
         {
           numUsers: 8,
           numCreatorNodes: 10,
           iterations: 2
         }
       )
 
       const forceCNUnavailabilityTest = makeTest(
         'snapbackReconfigTestForceCNUnavailability',
         SnapbackReconfigTests.forceCNUnavailability,
         {
           numUsers: 8,
           numCreatorNodes: 10,
           iterations: 2
         }
       )
       await testRunner([deregisterCNTest, forceCNUnavailabilityTest])
       break
     }
     case 'test-listencount': {
       const test = makeTest(
         'agreementListenCountsTest',
         agreementListenCountsTest,
         {
           numUsers: 1
         }
       )
       await testRunner([test])
       break
     }
     // NOTE - this test in current form does not seem to work if DEFAULT_NUM_USERS != 2
     case 'test-blacklist': {
       // dynamically create ipld tests
       const blacklistTests = Object.entries(IpldBlacklistTest).map(
         ([testName, testLogic]) =>
           makeTest(testName, testLogic, {
             numCreatorNodes: 1,
             numUsers: DEFAULT_NUM_USERS,
             useZeroIndexedWallet: true
           })
       )
       await testRunner(blacklistTests)
       break
     }
     case 'test-nightly': {
       const coreIntegrationTests = makeTest('consistency', coreIntegration, {
         numCreatorNodes: DEFAULT_NUM_CONTENT_NODES,
         numUsers: DEFAULT_NUM_USERS,
         testDurationSeconds: MAD_DOG_NIGHTLY_DURATION_SECONDS
       })
 
       const snapbackTest = makeTest('snapback', snapbackSMParallelSyncTest, {
         numUsers: SNAPBACK_NUM_USERS
       })
 
       // NOTE - this test in current form does not seem to work if DEFAULT_NUM_USERS != 2
       // dynamically create ipld tests
       const blacklistTests = Object.entries(IpldBlacklistTest).map(
         ([testName, testLogic]) =>
           makeTest(testName, testLogic, {
             numCreatorNodes: 1,
             numUsers: DEFAULT_NUM_USERS,
             useZeroIndexedWallet: true
           })
       )
 
       // User replica set manager tests
       // Enabled in CI only until contract has been deployed
       const ursmTest = makeTest(
         'userReplicaSetManager',
         userReplicaSetManagerTest,
         { numUsers: USER_REPLICA_SET_NUM_USERS }
       )
       const ursmBlockSaturationTest = makeTest(
         'userReplicaSetBlockSaturationTest',
         userReplicaSetBlockSaturationTest,
         {
           numUsers: 1
         })
 
       const agreementListenCountTest = makeTest(
         'agreementListenCountsTest',
         agreementListenCountsTest,
         {
           numUsers: 1
         }
       )
 
       const deregisterCNTest = makeTest(
         'snapbackReconfigTestDeregisterCN',
         SnapbackReconfigTests.deregisterCN,
         {
           numUsers: 2,
           numCreatorNodes: 10,
           iterations: 2
         }
       )
 
       const forceCNUnavailabilityTest = makeTest(
         'snapbackReconfigTestForceCNUnavailability',
         SnapbackReconfigTests.forceCNUnavailability,
         {
           numUsers: 2,
           numCreatorNodes: 10,
           iterations: 2
         }
       )
 
       const tests = [
         coreIntegrationTests,
         snapbackTest,
         ...blacklistTests,
         ursmTest,
         ursmBlockSaturationTest,
         agreementListenCountTest,
         deregisterCNTest,
         forceCNUnavailabilityTest
       ]
 
       await testRunner(tests)
       logger.info('Exiting testrunner')
       break
     }
     default:
       logger.error('Usage: one of either: `test`, `test-snapback`, `test-ursm`, `test-ursm-sat`, `test-ursm-nodes`, `test-listencount`, `test-blacklist`, `test-nightly`.')
   }
   process.exit()
 } catch (e) {
   logger.error('Exiting testrunner with errors')
   if (verbose) {
     logger.info('Displaying container logs..')
     await ContainerLogs.print()
   }
   logger.error(e.message)
   process.exit(1)
 }
}
 
main()
