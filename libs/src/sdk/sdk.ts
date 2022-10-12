import {
  DiscoveryNode,
  DiscoveryNodeConfig
} from '../services/discoveryNode'
import { EthContracts, EthContractsConfig } from '../services/ethContracts'
import { EthWeb3Config, EthWeb3Manager } from '../services/ethWeb3Manager'
import { IdentityService } from '../services/identity'
import { UserStateManager } from '../userStateManager'
import { Oauth } from './oauth'
import { DigitalContentsApi } from './api/digitalContentsApi'
import { ResolveApi } from './api/resolveApi'
import {
  Configuration,
  ContentListsApi,
  UsersApi,
  TipsApi,
  querystring
} from './api/generated/default'
import {
  ContentListsApi as ContentListsApiFull,
  ReactionsApi as ReactionsApiFull,
  SearchApi as SearchApiFull,
  DigitalContentsApi as DigitalContentsApiFull,
  UsersApi as UsersApiFull,
  TipsApi as TipsApiFull
} from './api/generated/full'

import {
  CLAIM_DISTRIBUTION_CONTRACT_ADDRESS,
  ETH_OWNER_WALLET,
  ETH_PROVIDER_URLS,
  ETH_REGISTRY_ADDRESS,
  ETH_TOKEN_ADDRESS,
  IDENTITY_SERVICE_ENDPOINT,
  WORMHOLE_ADDRESS
} from './constants'
import { getPlatformLocalStorage, LocalStorage } from '../utils/localStorage'

type Web3Config = {
  providers: string[]
}

type SdkConfig = {
  /**
   * Your app name
   */
  appName: string
  /**
   * Configuration for the DiscoveryNode client
   */
  discoveryNodeConfig?: DiscoveryNodeConfig
  /**
   * Configuration for the Ethereum contracts client
   */
  ethContractsConfig?: EthContractsConfig
  /**
   * Configuration for the Ethereum Web3 client
   */
  ethWeb3Config?: EthWeb3Config
  /**
   * Configuration for the IdentityService client
   */
  identityServiceConfig?: IdentityService
  /**
   * Optional custom local storage
   */
  localStorage?: LocalStorage
  /**
   * Configuration for Web3
   */
  web3Config?: Web3Config
}

/**
 * The Coliving SDK
 */
export const sdk = (config: SdkConfig) => {
  const { appName } = config

  // Initialize services
  const { discoveryNode } = initializeServices(config)

  // Initialize APIs
  const apis = initializeApis({ appName, discoveryNode })

  // Initialize OAuth
  const oauth =
    typeof window !== 'undefined'
      ? new Oauth({ discoveryNode, appName })
      : undefined

  return {
    oauth,
    ...apis
  }
}

const initializeServices = (config: SdkConfig) => {
  const {
    discoveryNodeConfig,
    ethContractsConfig,
    ethWeb3Config,
    identityServiceConfig,
    localStorage = getPlatformLocalStorage()
  } = config

  const userStateManager = new UserStateManager({ localStorage })

  const identityService = new IdentityService({
    identityServiceEndpoint: IDENTITY_SERVICE_ENDPOINT,
    ...identityServiceConfig
  })

  const ethWeb3Manager = new EthWeb3Manager({
    identityService,
    web3Config: {
      ownerWallet: ETH_OWNER_WALLET,
      ...ethWeb3Config,
      providers: formatProviders(ethWeb3Config?.providers ?? ETH_PROVIDER_URLS)
    }
  })

  const ethContracts = new EthContracts({
    ethWeb3Manager,
    tokenContractAddress: ETH_TOKEN_ADDRESS,
    registryAddress: ETH_REGISTRY_ADDRESS,
    claimDistributionContractAddress: CLAIM_DISTRIBUTION_CONTRACT_ADDRESS,
    wormholeContractAddress: WORMHOLE_ADDRESS,
    ...ethContractsConfig
  })

  const discoveryNode = new DiscoveryNode({
    ethContracts,
    userStateManager,
    localStorage,
    ...discoveryNodeConfig
  })

  return { discoveryNode }
}

const initializeApis = ({
  appName,
  discoveryNode
}: {
  appName: string
  discoveryNode: DiscoveryNode
}) => {
  const initializationPromise = discoveryNode.init()

  const generatedApiClientConfig = new Configuration({
    fetchApi: async (url: string) => {
      // Ensure discovery node is initialized
      await initializationPromise

      // Append the appName to the query params
      const urlWithAppName =
        url +
        (url.includes('?') ? '&' : '?') +
        querystring({ app_name: appName })

      return await discoveryNode._makeRequest(
        {
          endpoint: urlWithAppName
        },
        undefined,
        undefined,
        // Throw errors instead of returning null
        true
      )
    }
  })

  const digitalContents = new DigitalContentsApi(generatedApiClientConfig, discoveryNode)
  const users = new UsersApi(generatedApiClientConfig)
  const contentLists = new ContentListsApi(generatedApiClientConfig)
  const tips = new TipsApi(generatedApiClientConfig)
  const { resolve } = new ResolveApi(generatedApiClientConfig)

  const full = {
    digitalContents: new DigitalContentsApiFull(generatedApiClientConfig as any),
    users: new UsersApiFull(generatedApiClientConfig as any),
    search: new SearchApiFull(generatedApiClientConfig as any),
    contentLists: new ContentListsApiFull(generatedApiClientConfig as any),
    reactions: new ReactionsApiFull(generatedApiClientConfig as any),
    tips: new TipsApiFull(generatedApiClientConfig as any)
  }

  return {
    digitalContents,
    users,
    contentLists,
    tips,
    resolve,
    full
  }
}

const formatProviders = (providers: string | string[]) => {
  if (typeof providers === 'string') {
    return providers.split(',')
  } else if (Array.isArray(providers)) {
    return providers
  } else {
    throw new Error('Providers must be of type string, Array, or Web3 instance')
  }
}
