const os = require('os')
const fs = require('fs')
const SERVICE_COMMANDS_PATH = `${process.env.PROTOCOL_DIR}/service-commands`

require('dotenv').config({
    path: `${SERVICE_COMMANDS_PATH}/.env.dev`
})


const DOT_COLIVING_PATH = `${os.homedir()}/.coliving`

let ethContractsConfig
let dataContractsConfig
if (fs.existsSync(`${DOT_COLIVING_PATH}`)) {
    ethContractsConfig = require(`${DOT_COLIVING_PATH}/eth-config.json`)
    dataContractsConfig = require(`${DOT_COLIVING_PATH}/config.json`)
    solanaConfig = require(`${DOT_COLIVING_PATH}/solana-program-config.json`)
} else {
    ethContractsConfig = {}
    dataContractsConfig = {}
    solanaConfig = {}
}

const config = {
    DOT_COLIVING_PATH,
    SERVICE_COMMANDS_PATH,
    ETH_PROVIDER_ENDPOINT: process.env.ETH_PROVIDER_ENDPOINT,
    ETH_REGISTRY_ADDRESS: process.env.ETH_REGISTRY_ADDRESS || ethContractsConfig.registryAddress,
    ETH_TOKEN_ADDRESS: process.env.ETH_TOKEN_ADDRESS || ethContractsConfig.colivingTokenAddress,
    ETH_OWNER_WALLET: process.env.ETH_OWNER_WALLET || ethContractsConfig.ownerWallet,
    DATA_CONTRACTS_REGISTRY_ADDRESS: process.env.DATA_CONTRACTS_REGISTRY_ADDRESS || dataContractsConfig.registryAddress,
    HEDGEHOG_ENTROPY_KEY: 'hedgehog-entropy-key',
    SEED_CACHE_PATH: `${DOT_COLIVING_PATH}/seed-cache.json`,
    TEMP_TRACK_STORAGE_PATH: `${SERVICE_COMMANDS_PATH}/local-storage/tmp-tracks`,
    TEMP_IMAGE_STORAGE_PATH: `${SERVICE_COMMANDS_PATH}/local-storage/tmp-imgs`,
    CONTENT_NODE_ALLOWLIST:  process.env.CONTENT_NODE_ALLOWLIST
        ? new Set(process.env.CONTENT_NODE_ALLOWLIST.split(','))
        : undefined,
    DATA_CONTRACTS_PROVIDER_ENDPOINTS:  [process.env.DATA_CONTRACTS_PROVIDER_ENDPOINT],
    USER_METADATA_ENDPOINT: process.env.USER_METADATA_ENDPOINT,
    IDENTITY_SERVICE_ENDPOINT:  process.env.IDENTITY_SERVICE_ENDPOINT,
    SOLANA_ENDPOINT: solanaConfig.endpoint,
    SOLANA_MINT_ADDRESS: solanaConfig.splToken,
    SOLANA_TOKEN_ADDRESS: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    SOLANA_CLAIMABLE_TOKEN_PROGRAM_ADDRESS: solanaConfig.claimableTokenAddress,
    SOLANA_REWARDS_MANAGER_PROGRAM_ID: solanaConfig.rewardsManagerAddress,
    SOLANA_REWARDS_MANAGER_PROGRAM_PDA: solanaConfig.rewardsManagerAccount,
    SOLANA_REWARDS_MANAGER_TOKEN_PDA: solanaConfig.rewardsManagerTokenAccount,
    SOLANA_FEE_PAYER_SECRET_KEYS: solanaConfig.feePayerWallets ? solanaConfig.feePayerWallets.map(wallet => Uint8Array.from(wallet.privateKey)) : undefined
}

module.exports = config