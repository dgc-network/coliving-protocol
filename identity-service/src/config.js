const convict = require('convict')
const fs = require('fs')

// custom array parsing for arrays passed in via string env vars
convict.addFormat({
  name: 'string-array',
  validate: function (val) {
    return Array.isArray(val)
  },
  coerce: function (val) {
    if (!val || val === '') return {}
    return JSON.parse(val)
  }
})

// Define a schema
const config = convict({
  dbUrl: {
    doc: 'Database URL connection string',
    format: String,
    env: 'dbUrl',
    default: null
  },
  redisHost: {
    doc: 'Redis host name',
    format: String,
    env: 'redisHost',
    default: null
  },
  redisPort: {
    doc: 'Redis port',
    format: 'port',
    env: 'redisPort',
    default: null
  },
  web3Provider: {
    doc: 'web3 provider url',
    format: String,
    env: 'web3Provider',
    default: null
  },
  secondaryWeb3Provider: {
    doc: 'secondary web3 provider url',
    format: String,
    env: 'secondaryWeb3Provider',
    default: null
  },
  port: {
    doc: 'Port to run service on',
    format: 'port',
    env: 'port',
    default: null
  },
  logLevel: {
    doc: 'Log level',
    format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
    env: 'logLevel',
    default: 'info'
  },
  tikTokAPIKey: {
    doc: 'TikTok API key',
    format: String,
    env: 'tikTokAPIKey',
    default: null
  },
  tikTokAPISecret: {
    doc: 'TikTok API Secret',
    format: String,
    env: 'tikTokAPISecret',
    default: null
  },
  tikTokAuthOrigin: {
    doc: 'The CORS allowed origin set on the /tikTok/access_token route',
    format: String,
    env: 'tikTokAuthOrigin',
    default: null
  },
  twitterAPIKey: {
    doc: 'Twitter API key',
    format: String,
    env: 'twitterAPIKey',
    default: null
  },
  twitterAPISecret: {
    doc: 'Twitter API Secret',
    format: String,
    env: 'twitterAPISecret',
    default: null
  },
  instagramAPIKey: {
    doc: 'Instagram API Key',
    format: String,
    env: 'instagramAPIKey',
    default: null
  },
  instagramAPISecret: {
    doc: 'Instagram API Secret',
    format: String,
    env: 'instagramAPISecret',
    default: null
  },
  instagramRedirectUrl: {
    doc: 'Instagram API Redirect url',
    format: String,
    env: 'instagramRedirectUrl',
    default: null
  },
  instagramProfileUrl: {
    doc: 'Instagram profile url',
    format: String,
    env: 'instagramProfileUrl',
    default: 'https://www.instagram.com/%USERNAME%/channel/?__a=1'
  },
  relayerPrivateKey: {
    doc: 'L2 Relayer(used to make relay transactions) private key. The source of the funds when funding wallet.',
    format: String,
    env: 'relayerPrivateKey',
    default: null,
    sensitive: true
  },
  relayerPublicKey: {
    doc: 'L2 Relayer(used to make relay transactions) public key. The source of the funds when funding wallet.',
    format: String,
    env: 'relayerPublicKey',
    default: null
  },
  relayerWallets: {
    doc: 'L2 Relayer wallet objects to send transactions. Stringified array like[{ publicKey, privateKey}, ...]',
    format: 'string-array',
    env: 'relayerWallets',
    default: null
  },
  ethFunderAddress: {
    doc: 'L1 Relayer Address. The source of the funds when funding wallets. (Only used in balance_check and eth_balance_check to check if enough funds exist)',
    format: String,
    env: 'ethFunderAddress',
    default: null
  },
  ethRelayerWallets: {
    doc: 'L1 Relayer wallet objects to send transactions. Stringified array like[{ publicKey, privateKey}, ...]',
    format: 'string-array',
    env: 'ethRelayerWallets',
    default: null
  },
  userVerifierPrivateKey: {
    doc: 'User verifier(used to write users to chain as isVerified) private key',
    format: String,
    env: 'userVerifierPrivateKey',
    default: null,
    sensitive: true
  },
  userVerifierPublicKey: {
    doc: 'User verifier(used to write users to chain as isVerified) public key',
    format: String,
    env: 'userVerifierPublicKey',
    default: null
  },
  blacklisterPrivateKey: {
    doc: 'Blacklister(used to write multihashes as blacklisted on chain) private key',
    format: String,
    env: 'blacklisterPrivateKey',
    default: null,
    sensitive: true
  },
  blacklisterPublicKey: {
    doc: 'Blacklister(used to write multihashes as blacklisted on chain) public key',
    format: String,
    env: 'blacklisterPublicKey',
    default: null
  },
  rateLimitingReqLimit: {
    doc: 'Total request per hour rate limit',
    format: 'nat',
    env: 'rateLimitingReqLimit',
    default: null
  },
  rateLimitingAuthLimit: {
    doc: 'Auth requests per hour rate limit',
    format: 'nat',
    env: 'rateLimitingAuthLimit',
    default: null
  },
  rateLimitingTwitterLimit: {
    doc: 'Twitter requests per hour rate limit',
    format: 'nat',
    env: 'rateLimitingTwitterLimit',
    default: null
  },
  rateLimitingTikTokLimit: {
    doc: 'TikTok requests per hour rate limit',
    format: 'nat',
    env: 'rateLimitingTikTokLimit',
    default: null
  },
  rateLimitingListensPerAgreementPerHour: {
    doc: 'Listens per digital_content per user per Hour',
    format: 'nat',
    env: 'rateLimitingListensPerAgreementPerHour',
    default: null
  },
  rateLimitingListensPerIPAgreementPerHour: {
    doc: 'Listens per digital_content per IP per Hour',
    format: 'nat',
    env: 'rateLimitingListensPerIPAgreementPerHour',
    default: null
  },
  rateLimitingListensPerAgreementPerDay: {
    doc: 'Listens per digital_content per user per Day',
    format: 'nat',
    env: 'rateLimitingListensPerAgreementPerDay',
    default: null
  },
  rateLimitingListensPerIPAgreementPerDay: {
    doc: 'Listens per digital_content per IP per Day',
    format: 'nat',
    env: 'rateLimitingListensPerIPAgreementPerDay',
    default: null
  },
  rateLimitingListensPerIPPerHour: {
    doc: 'Listens per IP per Hour',
    format: 'nat',
    env: 'rateLimitingListensPerIPPerHour',
    default: null
  },
  rateLimitingListensPerIPPerDay: {
    doc: 'Listens per IP per Day',
    format: 'nat',
    env: 'rateLimitingListensPerIPPerDay',
    default: null
  },
  rateLimitingListensPerIPPerWeek: {
    doc: 'Listens per IP per Week',
    format: 'nat',
    env: 'rateLimitingListensPerIPPerWeek',
    default: null
  },
  rateLimitingEthRelaysPerIPPerDay: {
    doc: 'Eth relay operations per IP per day',
    format: 'nat',
    env: 'rateLimitingEthRelaysPerIPPerDay',
    default: 50
  },
  rateLimitingEthRelaysPerWalletPerDay: {
    doc: 'Listens per digital_content per IP per Day',
    format: 'nat',
    env: 'rateLimitingEthRelaysPerWalletPerDay',
    default: 10
  },
  rateLimitingListensPerAgreementPerWeek: {
    doc: 'Listens per digital_content per user per Week',
    format: 'nat',
    env: 'rateLimitingListensPerAgreementPerWeek',
    default: null
  },
  rateLimitingListensPerIPAgreementPerWeek: {
    doc: 'Listens per digital_content per IP per Week',
    format: 'nat',
    env: 'rateLimitingListensPerIPAgreementPerWeek',
    default: null
  },
  rateLimitingListensIPWhitelist: {
    doc: 'Regex of IP addresses that should not get rate limited',
    format: String,
    env: 'rateLimitingListensIPWhitelist',
    default: null
  },
  endpointRateLimits: {
    doc: `A serialized objects of rate limits with the form {
      <req.path>: {
        <req.method>:
          [
            {
              expiry: <seconds>,
              max: <count>
            },
            ...
          ],
          ...
        }
      }
    `,
    format: String,
    env: 'endpointRateLimits',
    default: '{}'
  },
  minimumBalance: {
    doc: 'Minimum token balance below which /balance_check fails',
    format: Number,
    env: 'minimumBalance',
    default: null
  },
  minimumRelayerBalance: {
    doc: 'Minimum token balance for relayer below which /balance_check fails',
    format: Number,
    env: 'minimumRelayerBalance',
    default: null
  },
  ethMinimumBalance: {
    doc: 'Minimum ETH balance below which /eth_balance_check fails',
    format: Number,
    env: 'ethMinimumBalance',
    default: 0.5
  },
  ethMinimumFunderBalance: {
    doc: 'Minimum eth balance for funder below which /eth_balance_check fails',
    format: Number,
    env: 'ethMinimumFunderBalance',
    default: 0.5
  },
  solMinimumBalance: {
    doc: 'Minimum SOL balance below which /sol_balance_check fails',
    format: Number,
    env: 'solMinimumBalance',
    default: 1000000000
  },
  mailgunApiKey: {
    doc: 'Mailgun API key used to send emails',
    format: String,
    env: 'mailgunApiKey',
    default: ''
  },
  // loaded through contract-config.json, if an env variable declared, env var takes precendence
  registryAddress: {
    doc: 'Registry address of contracts deployed on web3Provider',
    format: String,
    default: null,
    env: 'registryAddress'
  },
  colivingNotificationUrl: {
    doc: 'Url of coliving notifications',
    format: String,
    default: null,
    env: 'colivingNotificationUrl'
  },
  notificationStartBlock: {
    doc: 'First block to start notification indexing from',
    format: Number,
    default: 0,
    env: 'notificationStartBlock'
  },
  solanaNotificationStartSlot: {
    doc: 'First slot to start solana notification indexing from',
    format: Number,
    default: 0,
    env: 'solanaNotificationStartSlot'
  },
  ethTokenAddress: {
    doc: 'ethTokenAddress',
    format: String,
    default: null,
    env: 'ethTokenAddress'
  },
  ethRegistryAddress: {
    doc: 'ethRegistryAddress',
    format: String,
    default: null,
    env: 'ethRegistryAddress'
  },
  ethProviderUrl: {
    doc: 'ethProviderUrl',
    format: String,
    default: null,
    env: 'ethProviderUrl'
  },
  ethOwnerWallet: {
    doc: 'ethOwnerWallet',
    format: String,
    default: null,
    env: 'ethOwnerWallet'
  },
  isTestRun: {
    doc: 'Sets some configs and excludes some processes if this is a test run',
    format: Boolean,
    default: false,
    env: 'isTestRun'
  },
  awsAccessKeyId: {
    doc: 'AWS access key with SNS permissions',
    format: String,
    default: null,
    env: 'awsAccessKeyId'
  },
  awsSecretAccessKey: {
    doc: 'AWS access key secret with SNS permissions',
    format: String,
    default: null,
    env: 'awsSecretAccessKey'
  },
  awsSNSiOSARN: {
    doc: 'AWS ARN for iOS in SNS',
    format: String,
    default: null,
    env: 'awsSNSiOSARN'
  },
  awsSNSAndroidARN: {
    doc: 'AWS ARN for Android in SNS',
    format: String,
    default: null,
    env: 'awsSNSAndroidARN'
  },
  minGasPrice: {
    doc: 'minimum gas price; 10 GWei, 10 * DATA default gas price',
    format: 'nat',
    default: 10 * Math.pow(10, 9),
    env: 'minGasPrice'
  },
  highGasPrice: {
    doc: 'max gas price; 25 GWei, 2.5 * minGasPrice',
    format: 'nat',
    default: 25 * Math.pow(10, 9),
    env: 'highGasPrice'
  },
  // ganache gas price is extremely high, so we hardcode a lower value (0x09184e72a0 from docs here)
  ganacheGasPrice: {
    doc: 'ganache gas price',
    format: 'nat',
    default: 39062500000,
    env: 'ganacheGasPrice'
  },
  // 1011968 is used by default; 0xf7100 in hex
  defaultGasLimit: {
    doc: 'default gas limit',
    format: String,
    default: '0xf7100',
    env: 'defaultGasLimit'
  },
  browserPushGCMAPIKey: {
    doc: 'Google Cloud Messaging Browser Push Key',
    format: String,
    default: '',
    env: 'browserPushGCMAPIKey'
  },
  browserPushVapidPublicKey: {
    doc: 'Vapid Public Key for browser push notification',
    format: String,
    default: '',
    env: 'browserPushVapidPublicKey'
  },
  browserPushVapidPrivateKey: {
    doc: 'Vapid Private Key for browser push notifications',
    format: String,
    default: '',
    env: 'browserPushVapidPrivateKey'
  },
  apnKeyId: {
    doc: 'APN Key ID for safari browser push notifications',
    format: String,
    default: '',
    env: 'apnKeyId'
  },
  apnTeamId: {
    doc: 'APN Team ID for safari browser push notifications',
    format: String,
    default: '',
    env: 'apnTeamId'
  },
  apnAuthKey: {
    doc: 'APN Auth Key, read from a string into a file',
    format: String,
    default: '',
    env: 'apnAuthKey'
  },
  environment: {
    doc: 'Determines running on development, staging, or production',
    format: String,
    default: 'development',
    env: 'environment'
  },
  pgConnectionPoolMin: {
    doc: 'The max count for the pool of connections',
    format: 'nat',
    default: 5,
    env: 'pgConnectionPoolMin'
  },
  pgConnectionPoolMax: {
    doc: 'The minimum count for the pool of connections',
    format: 'nat',
    default: 50,
    env: 'pgConnectionPoolMax'
  },
  pgConnectionPoolAcquireTimeout: {
    doc:
      'The maximum time (ms) the pool will try to get the connection before throwing an error',
    format: 'nat',
    default: 60000,
    env: 'pgConnectionPoolAcquireTimeout'
  },
  pgConnectionPoolIdleTimeout: {
    doc:
      'The maximum time (ms) that a connection can be idle before being released',
    format: 'nat',
    default: 10000,
    env: 'pgConnectionPoolIdleTimeout'
  },
  setTimeout: {
    doc: `
      Sets the timeout value (in ms) for sockets
      https://nodejs.org/dist/latest-v6.x/docs/api/http.html#http_server_settimeout_msecs_callback
    `,
    format: 'nat',
    env: 'setTimeout',
    default: 10 * 60 * 1000 // 10 minutes
  },
  timeout: {
    doc: `
      Sets the timeout value (in ms) for socket inactivity
      https://nodejs.org/dist/latest-v6.x/docs/api/http.html#http_server_timeout
    `,
    format: 'nat',
    env: 'timeout',
    default: 10 * 60 * 1000 // 10 minutes
  },
  keepAliveTimeout: {
    doc: `
      Server keep alive timeout
      https://nodejs.org/dist/latest-v6.x/docs/api/http.html#http_server_keepalivetimeout
    `,
    format: 'nat',
    env: 'keepAliveTimeout',
    default: 5000 // node.js default value
  },
  headersTimeout: {
    doc: `
      Server headers timeout
      https://nodejs.org/dist/latest-v6.x/docs/api/http.html#http_server_headerstimeout
    `,
    format: 'nat',
    env: 'headersTimeout',
    default: 60 * 1000 // 60s - node.js default value
  },
  defiPulseApiKey: {
    doc: 'API Key used to query eth gas station info',
    format: String,
    env: 'defiPulseApiKey',
    default: ''
  },
  ethRelayerProdGasTier: {
    doc: 'One of averageGweiHex/fastGweiHex/fastestGweiHex',
    format: String,
    env: 'ethRelayerProdGasTier',
    default: 'fastestGweiHex'
  },
  scoreSecret: {
    doc: 'The secret necessary to view user captcha and cognito flow scores',
    format: String,
    env: 'scoreSecret',
    default: 'score_secret'
  },
  recaptchaServiceKey: {
    doc: 'The service key for Google recaptcha v3 API',
    format: String,
    env: 'recaptchaServiceKey',
    default: ''
  },
  hCaptchaSecret: {
    doc: 'The secret for hCaptcha account verification',
    format: String,
    env: 'hCaptchaSecret',
    default: ''
  },
  ipdataAPIKey: {
    doc: 'API Key for ipdata',
    format: String,
    env: 'ipdataAPIKey',
    default: ''
  },
  cognitoAPISecret: {
    doc: 'API Secret for Cognito',
    format: String,
    env: 'cognitoAPISecret',
    default: ''
  },
  cognitoAPIKey: {
    doc: 'API Key for Cognito',
    format: String,
    env: 'cognitoAPIKey',
    default: ''
  },
  cognitoBaseUrl: {
    doc: 'Base URL for Cognito API',
    format: String,
    env: 'cognitoBaseUrl',
    default: ''
  },
  cognitoTemplateId: {
    doc: 'Template for using Cognito Flow API',
    format: String,
    env: 'cognitoTemplateId',
    default: ''
  },
  solanaEndpoint: {
    doc: 'The Solana RPC endpoint to make requests against',
    format: String,
    env: 'solanaEndpoint',
    default: null
  },
  solanaAgreementListenCountAddress: {
    doc: 'solanaAgreementListenCountAddress',
    format: String,
    default: '',
    env: 'solanaAgreementListenCountAddress'
  },
  solanaColivingEthRegistryAddress: {
    doc: 'solanaColivingEthRegistryAddress',
    format: String,
    default: '',
    env: 'solanaColivingEthRegistryAddress'
  },
  solanaValidSigner: {
    doc: 'solanaValidSigner',
    format: String,
    default: '',
    env: 'solanaValidSigner'
  },
  solanaFeePayerWallets: {
    doc: 'solanaFeePayerWallets - Stringified array like[{ privateKey: [] },...]',
    format: 'string-array',
    default: [],
    env: 'solanaFeePayerWallets'
  },
  solanaSignerPrivateKey: {
    doc: 'solanaSignerPrivateKey',
    format: String,
    default: '',
    env: 'solanaSignerPrivateKey'
  },
  solanaTxCommitmentLevel: {
    doc: 'solanaTxCommitmentLevel',
    format: String,
    default: 'processed',
    env: 'solanaTxCommitmentLevel'
  },
  solanaMintAddress: {
    doc: 'The address of our SPL token',
    format: String,
    default: '',
    env: 'solanaMintAddress'
  },
  solanaClaimableTokenProgramAddress: {
    doc: 'The address of our Claimable Token program',
    format: String,
    default: '',
    env: 'solanaClaimableTokenProgramAddress'
  },
  solanaRewardsManagerProgramId: {
    doc: 'The address of our Rewards Manager program',
    format: String,
    default: '',
    env: 'solanaRewardsManagerProgramId'
  },
  solanaRewardsManagerProgramPDA: {
    doc: 'The PDA of this Rewards Manager deployment',
    format: String,
    default: '',
    env: 'solanaRewardsManagerProgramPDA'
  },
  solanaRewardsManagerTokenPDA: {
    doc: 'The PDA for the Rewards Manager token account',
    format: String,
    default: '',
    env: 'solanaRewardsManagerTokenPDA'
  },
  solanaConfirmationTimeout: {
    doc: 'The timeout used to send solana transactions through solanaWeb3 connection in ms',
    format: Number,
    default: '60000',
    env: 'solanaConfirmationTimeout'
  },
  solanaColivingAnchorDataProgramId: {
    doc: 'The address of the anchor coliving data program',
    format: String,
    default: '',
    env: 'solanaColivingAnchorDataProgramId'
  },
  rewardsQuorumSize: {
    doc: 'How many Discovery Nodes constitute a quorum for disbursing a reward',
    format: Number,
    default: '2',
    env: 'rewardsQuorumSize'
  },
  aaoEndpoint: {
    doc: 'AAO Endpoint for fetching attestations',
    format: String,
    default: 'http://anti-abuse-oracle_anti_abuse_oracle_1:8000',
    env: 'aaoEndpoint'
  },
  aaoAddress: {
    doc: 'AAO eth address',
    format: String,
    default: '',
    env: 'aaoAddress'
  },
  sentryDSN: {
    doc: 'Sentry DSN key',
    format: String,
    env: 'sentryDSN',
    default: ''
  },
  ethGasMultiplier: {
    doc: 'Constant value to multiply the configured FAST gas price by - in order to optimize tx success',
    format: Number,
    env: 'ethGasMultiplier',
    default: 1.2
  },
  optimizelySdkKey: {
    doc: 'Optimizely SDK key to use to fetch remote configuration',
    format: String,
    env: 'optimizelySdkKey',
    default: 'MX4fYBgANQetvmBXGpuxzF'
  },
  discoveryNodeWhitelist: {
    doc: 'Whitelisted discovery nodes to select from (comma-separated)',
    format: String,
    env: 'discoveryNodeWhitelist',
    default: ''
  },
  clusterForkProcessCount: {
    doc: 'The number of express server processes to initialize in the this app "cluster"',
    format: Number,
    env: 'clusterForkProcessCount',
    default: 1
  },
  minSolanaNotificationSlot: {
    doc: 'The slot number to start indexing if no slots defined',
    format: Number,
    env: 'minSolanaNotificationSlot',
    default: 105400000
  },
  successAudioReporterSlackUrl: {
    doc: 'The slack url to post messages for success in digitalcoin / rewards events',
    format: String,
    env: 'successAudioReporterSlackUrl',
    default: ''
  },
  errorAudioReporterSlackUrl: {
    doc: 'The slack url to post messages for errors in digitalcoin / rewards events',
    format: String,
    env: 'errorAudioReporterSlackUrl',
    default: ''
  },
  errorWormholeReporterSlackUrl: {
    doc: 'The slack url to post messages for errors in wormhole transfers',
    format: String,
    env: 'errorWormholeReporterSlackUrl',
    default: ''
  },
  verifiedUserReporterSlackUrl: {
    doc: 'The slack url to post messages for new verified users',
    format: String,
    env: 'verifiedUserReporterSlackUrl',
    default: ''
  },
  wormholeRPCHosts: {
    doc: 'Wormhole RPC Host',
    format: String,
    env: 'wormholeRPCHosts',
    default: ''
  },
  solBridgeAddress: {
    doc: 'Sol bridge address for wormhole',
    format: String,
    env: 'solBridgeAddress',
    default: ''
  },
  solTokenBridgeAddress: {
    doc: 'Sol token bridge address for wormhole',
    format: String,
    env: 'solTokenBridgeAddress',
    default: ''
  },
  ethBridgeAddress: {
    doc: 'Eth bridge address for wormhole',
    format: String,
    env: 'ethBridgeAddress',
    default: ''
  },
  ethTokenBridgeAddress: {
    doc: 'Eth token bridge address for wormhole',
    format: String,
    env: 'ethTokenBridgeAddress',
    default: ''
  },
  websiteHost: {
    doc: 'Coliving website host',
    format: String,
    env: 'websiteHost',
    default: 'https://coliving.lol'
  },
  amplitudeAPIKey: {
    doc: 'Amplitude API key',
    format: String,
    env: 'amplitudeAPIKey',
    default: ''
  },
  cognitoIdentityHashSalt: {
    doc: 'Hash salt',
    format: String,
    env: 'cognitoIdentityHashSalt',
    default: ''
  },
  cognitoRetrySecret: {
    doc: 'The secret necessary to request a retry for the cognito flow',
    format: String,
    env: 'cognitoRetrySecret',
    default: ''
  }
})

// if you wanted to load a file
// this is lower precendence than env variables, so if registryAddress or ownerWallet env
// variables are defined, they take precendence

// TODO(DM) - remove these defaults
const defaultConfigExists = fs.existsSync('default-config.json')
if (defaultConfigExists) config.loadFile('default-config.json')

if (fs.existsSync('eth-contract-config.json')) {
  let ethContractConfig = require('../eth-contract-config.json')
  config.load({
    ethTokenAddress: ethContractConfig.colivingTokenAddress,
    ethRegistryAddress: ethContractConfig.registryAddress,
    ethOwnerWallet: ethContractConfig.ownerWallet,
    ethWallets: ethContractConfig.allWallets
  })
}

if (fs.existsSync('solana-program-config.json')) {
  let solanaContractConfig = require('../solana-program-config.json')
  config.load({
    solanaAgreementListenCountAddress: solanaContractConfig.agreementListenCountAddress,
    solanaColivingEthRegistryAddress: solanaContractConfig.colivingEthRegistryAddress,
    solanaValidSigner: solanaContractConfig.validSigner,
    solanaFeePayerWallets: solanaContractConfig.feePayerWallets,
    solanaEndpoint: solanaContractConfig.endpoint,
    solanaSignerPrivateKey: solanaContractConfig.signerPrivateKey,

    solanaMintAddress: solanaContractConfig.splToken,
    solanaClaimableTokenProgramAddress: solanaContractConfig.claimableTokenAddress,
    solanaRewardsManagerProgramId: solanaContractConfig.rewardsManagerAddress,
    solanaRewardsManagerProgramPDA: solanaContractConfig.rewardsManagerAccount,
    solanaRewardsManagerTokenPDA: solanaContractConfig.rewardsManagerTokenAccount,

    solanaColivingAnchorDataProgramId: solanaContractConfig.anchorProgramId
  })
}

if (fs.existsSync('aao-config.json')) {
  let aaoConfig = require('../aao-config.json')
  console.log('rewards: ' + JSON.stringify(aaoConfig))
  config.load({
    aaoAddress: aaoConfig[0]
  })
}

// the contract-config.json file is used to load registry address locally
// during development
const contractConfigExists = fs.existsSync('data-contract-config.json')
if (contractConfigExists) config.loadFile('data-contract-config.json')

// Perform validation and error any properties are not present on schema
config.validate()

module.exports = config
