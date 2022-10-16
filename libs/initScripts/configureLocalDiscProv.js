const fs = require('fs')
const path = require('path')
const readline = require('readline')
const ethContractsMigrationOutput = require('../../eth-contracts/migrations/migration-output.json')
//const solanaConfig = require('../../solana-programs/solana-program-config.json')

const ETH_CONTRACTS_REGISTRY = 'coliving_eth_contracts_registry'
const SOLANA_DIGITAL_CONTENT_LISTEN_COUNT_ADDRESS = 'coliving_solana_digital_content_listen_count_address'
const SOLANA_ENDPOINT = 'coliving_solana_endpoint'

const SOLANA_SIGNER_GROUP_ADDRESS = 'coliving_solana_signer_group_address'

const SOLANA_USER_BANK_ADDRESS = 'coliving_solana_user_bank_program_address'
const SOLANA_WLIVE_MINT = 'coliving_solana_wei_digitalcoin_mint'

const SOLANA_REWARDS_MANAGER_ADDRESS = 'coliving_solana_rewards_manager_program_address'
const SOLANA_REWARDS_MANAGER_ACCOUNT = 'coliving_solana_rewards_manager_account'

const SOLANA_ANCHOR_PROGRAM_ID = 'coliving_solana_anchor_data_program_id'
const SOLANA_ANCHOR_ADMIN_STORAGE_PUBLIC_KEY = 'coliving_solana_anchor_admin_storage_public_key'

// LOCAL DEVELOPMENT ONLY
// Updates coliving_eth_contracts_registry in discovery node
const configureLocalDiscProv = async () => {
  const ethRegistryAddress = ethContractsMigrationOutput.registryAddress
  const solanaDigitalContentListenCountAddress = solanaConfig.digitalContentListenCountAddress
  const signerGroup = solanaConfig.signerGroup
  const solanaEndpoint = solanaConfig.endpoint
  const wei_digitalcoinMint = solanaConfig.splToken
  const claimableTokenAddress = solanaConfig.claimableTokenAddress
  const rewardsManagerAddress = solanaConfig.rewardsManagerAddress
  const rewardsManagerAccount = solanaConfig.rewardsManagerAccount
  const anchorProgramId = solanaConfig.anchorProgramId
  const anchorAdminStoragePublicKey = solanaConfig.anchorAdminStoragePublicKey
  console.log(`wei_digitalcoinAddress: ${wei_digitalcoinMint}, claimableTokenAddress: ${claimableTokenAddress}, wei_digitalcoinMint=${wei_digitalcoinMint}`)
  const envPath = path.join(process.cwd(), '../../', 'discovery-node/compose/.env')

  await _updateDiscoveryNodeEnvFile(
    envPath,
    envPath,
    ethRegistryAddress,
    solanaDigitalContentListenCountAddress,
    solanaEndpoint,
    signerGroup,
    wei_digitalcoinMint,
    claimableTokenAddress,
    rewardsManagerAddress,
    rewardsManagerAccount,
    anchorProgramId,
    anchorAdminStoragePublicKey,
  )
}

// Write an update to the local discovery node config .env file
const _updateDiscoveryNodeEnvFile = async (
  readPath,
  writePath,
  ethRegistryAddress,
  solanaDigitalContentListenCountAddress,
  solanaEndpoint,
  signerGroup,
  wei_digitalcoinMint,
  claimableTokenAddress,
  rewardsManagerAddress,
  rewardsManagerAccount,
  anchorProgramId,
  anchorAdminStoragePublicKey,
) => {
  const fileStream = fs.createReadStream(readPath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })
  const output = []
  let ethRegistryAddressFound = false
  let solanaDigitalContentListenCountAddressFound = false
  let solanaEndpointFound = false
  let signerGroupFound = false

  let wei_digitalcoinMintFound = false
  let claimableTokenAddressFound = false
  let rewardsAddressFound = false
  let rewardsAccountFound = false
  let anchorProgramIdFound = false
  let anchorAdminStoragePublicKeyFound = false

  const ethRegistryAddressLine = `${ETH_CONTRACTS_REGISTRY}=${ethRegistryAddress}`
  const solanaDigitalContentListenCountAddressLine = `${SOLANA_DIGITAL_CONTENT_LISTEN_COUNT_ADDRESS}=${solanaDigitalContentListenCountAddress}`
  const solanaEndpointLine = `${SOLANA_ENDPOINT}=${solanaEndpoint}`
  const signerGroupLine = `${SOLANA_SIGNER_GROUP_ADDRESS}=${signerGroup}`
  const wei_digitalcoinMintLine = `${SOLANA_WLIVE_MINT}=${wei_digitalcoinMint}`
  const claimableTokenAddressLine = `${SOLANA_USER_BANK_ADDRESS}=${claimableTokenAddress}`
  const rewardsManagerAddressLine = `${SOLANA_REWARDS_MANAGER_ADDRESS}=${rewardsManagerAddress}`
  const rewardsManagerAccountLine = `${SOLANA_REWARDS_MANAGER_ACCOUNT}=${rewardsManagerAccount}`
  const anchorProgramIdLine = `${SOLANA_ANCHOR_PROGRAM_ID}=${anchorProgramId}`
  const anchorAdminStoragePublicKeyLine = `${SOLANA_ANCHOR_ADMIN_STORAGE_PUBLIC_KEY}=${anchorAdminStoragePublicKey}`

  for await (const line of rl) {
    if (line.includes(ETH_CONTRACTS_REGISTRY)) {
      output.push(ethRegistryAddressLine)
      ethRegistryAddressFound = true
    } else if (line.includes(SOLANA_DIGITAL_CONTENT_LISTEN_COUNT_ADDRESS)) {
      output.push(solanaDigitalContentListenCountAddressLine)
      solanaDigitalContentListenCountAddressFound = true
    } else if (line.includes(SOLANA_ENDPOINT)) {
      output.push(solanaEndpointLine)
      solanaEndpointFound = true
    } else if (line.includes(SOLANA_SIGNER_GROUP_ADDRESS)) {
      output.push(signerGroupLine)
      signerGroupFound = true
    } else if (line.includes(SOLANA_USER_BANK_ADDRESS)) {
      output.push(claimableTokenAddressLine)
      claimableTokenAddressFound = true
    } else if (line.includes(SOLANA_WLIVE_MINT)) {
      output.push(wei_digitalcoinMintLine)
      wei_digitalcoinMintFound = true
    } else if (line.includes(SOLANA_REWARDS_MANAGER_ADDRESS)) {
      output.push(rewardsManagerAddressLine)
      rewardsAddressFound = true
    } else if (line.includes(SOLANA_REWARDS_MANAGER_ACCOUNT)) {
      output.push(rewardsManagerAccountLine)
      rewardsAccountFound = true
    } else if (line.includes(SOLANA_ANCHOR_PROGRAM_ID)) {
      output.push(anchorProgramIdLine)
      anchorProgramIdFound = true
    } else if (line.includes(SOLANA_ANCHOR_ADMIN_STORAGE_PUBLIC_KEY)) {
      output.push(anchorAdminStoragePublicKeyLine)
      anchorAdminStoragePublicKeyFound = true
    } else {
      output.push(line)
    }
  }
  if (!ethRegistryAddressFound) {
    output.push(ethRegistryAddressLine)
  }
  if (!solanaDigitalContentListenCountAddressFound) {
    output.push(solanaDigitalContentListenCountAddressLine)
  }
  if (!solanaEndpointFound) {
    output.push(solanaEndpointLine)
  }
  if (!signerGroupFound) {
    output.push(signerGroupLine)
  }
  if (!wei_digitalcoinMintFound) {
    output.push(wei_digitalcoinMintLine)
  }
  if (!claimableTokenAddressFound) {
    output.push(claimableTokenAddressLine)
  }
  if (!rewardsAddressFound) {
    output.push(rewardsManagerAddressLine)
  }
  if (!rewardsAccountFound) {
    output.push(rewardsManagerAccountLine)
  }
  if (!anchorProgramIdFound) {
    output.push(anchorProgramIdLine)
  }
  if (!anchorAdminStoragePublicKeyFound) {
    output.push(anchorAdminStoragePublicKeyLine)
  }
  fs.writeFileSync(writePath, output.join('\n'))
  console.log(`Updated DISCOVERY PROVIDER ${writePath} ${ETH_CONTRACTS_REGISTRY}=${ethRegistryAddress} ${output}`)
}

configureLocalDiscProv()
