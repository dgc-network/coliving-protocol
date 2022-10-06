/**
 * Coliving Smart Contracts truffle configuration
 * @authors Hareesh Nagaraj, Sid Sethi, Roneil Rumburg
 * @version 0.0.1
 */

// Import babel for ES6 support
require('babel-register')({
  presets: [
    ['env', {
      'targets': {
        'node': '8.0'
      }
    }]
  ]
})

require('babel-polyfill')
const HDWalletProvider = require('@truffle/hdwallet-provider');
/*
const getEnv = env => {
  const value = process.env[env]
  if (typeof value === 'undefined') {
    console.error(`${env} has not been set.`)
  }
  return value
}
let ENABLE_OPTIMIZER = true
if (getEnv('ENABLE_OPTIMIZER') === 'false') ENABLE_OPTIMIZER = false

// Values must be set in calling environment
// Consult @hareeshnagaraj for details
const privateKey = getEnv('ETH_WALLET_PRIVATE_KEY')
const liveNetwork = getEnv('ETH_LIVE_NETWORK')
const liveNetworkId = getEnv('ETH_LIVE_NETWORK_ID')

const solc = {
  // 0.5.17 is latest 0.5.x version
  // cannot use 0.6.x due to openzeppelin dependency, which are only 0.5.x compatible
  //version: '^0.5.17',
  //version: '^0.8.0',
  version: 'pragma',
  //version: 'native',
  parser: 'solcjs', // Leverages solc-js purely for speedy parsing
  settings: {
    evmVersion: 'istanbul', // istanbul is latest stable, and default setting
  },
}

if (ENABLE_OPTIMIZER) {
  solc.settings.optimizer = {
    enabled: true,
    runs: 200, // 200 is default value
    details: {
      orderLiterals: true,
      deduplicate: true,
      cse: true,
      constantOptimizer: true,
      yul: false, // disabled as Yul optimizer is still experimental in 0.5.x
    },
  }
}
*/
module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*' // Match any network id
    },
    predeploy: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*', // Match any network id
      verify: {
        apiUrl: 'http://data-blockscout:4000/api',
        apiKey: 'NONE',
        explorerUrl: 'http://data-blockscout:4000/address',
      },
    },
    test_local: {
      host: '127.0.0.1',
      port: 8555,
      network_id: '*' // Match any network id
    },
    coliving_private: {
      host: '127.0.0.1',
      port: 8000,
      network_id: 1353,
      gasPrice: 1000000000
    },
    data_mainnet: {
      host: 'localhost',
      port: 8545,
      network_id: '99',
      gas: 8000000,
      gasPrice: 1000000000,
      skipDryRun: true
    },
    data_sokol: {
      provider: function () {
        return new HDWalletProvider(
          [
            // Private keys in array format here
          ],
          "https://sokol.data.network",
          0,
          2
        )
      },
      network_id: '77',
      gas: 8000000,
      gasPrice: 1000000000,
      skipDryRun: true
    }
  },
  mocha: {
    enableTimeouts: false
  },
  plugins: ['truffle-plugin-verify'],
  compilers: {
    solc: {
      version: "^0.8.0"
    }
  }
}
