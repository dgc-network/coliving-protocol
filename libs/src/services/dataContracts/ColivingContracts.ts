import { Utils, Logger } from '../../utils'

// load classes wrapping contracts
import { RegistryClient } from './registryClient'
import { UserFactoryClient } from './userFactoryClient'
import { DigitalContentFactoryClient } from './digitalContentFactoryClient'
import { SocialFeatureFactoryClient } from './socialFeatureFactoryClient'
import { ContentListFactoryClient } from './contentListFactoryClient'
import { UserLibraryFactoryClient } from './userLibraryFactoryClient'
import { IPLDBlacklistFactoryClient } from './ipldBlacklistFactoryClient'
import { UserReplicaSetManagerClient } from './userReplicaSetManagerClient'
import type { Web3Manager } from '../web3Manager'
import type { ContractClient } from '../contracts/contractClient'

// Make sure the json file exists before importing because it could silently fail
// import data contract ABI's
const RegistryABI = Utils.importDataContractABI('Registry.json').abi
const UserFactoryABI = Utils.importDataContractABI('UserFactory.json').abi
const DigitalContentFactoryABI = Utils.importDataContractABI('DigitalContentFactory.json').abi
const SocialFeatureFactoryABI = Utils.importDataContractABI(
  'SocialFeatureFactory.json'
).abi
const ContentListFactoryABI = Utils.importDataContractABI(
  'ContentListFactory.json'
).abi
const UserLibraryFactoryABI = Utils.importDataContractABI(
  'UserLibraryFactory.json'
).abi
const IPLDBlacklistFactoryABI = Utils.importDataContractABI(
  'IPLDBlacklistFactory.json'
).abi
const UserReplicaSetManagerABI = Utils.importDataContractABI(
  'UserReplicaSetManager.json'
).abi

// define contract registry keys
const UserFactoryRegistryKey = 'UserFactory'
const DigitalContentFactoryRegistryKey = 'DigitalContentFactory'
const SocialFeatureFactoryRegistryKey = 'SocialFeatureFactory'
const ContentListFactoryRegistryKey = 'ContentListFactory'
const UserLibraryFactoryRegistryKey = 'UserLibraryFactory'
const IPLDBlacklistFactoryRegistryKey = 'IPLDBlacklistFactory'
const UserReplicaSetManagerRegistryKey = 'UserReplicaSetManager'

export class ColivingContracts {
  web3Manager: Web3Manager
  registryAddress: string
  isServer: boolean
  logger: Logger
  RegistryClient: RegistryClient
  UserFactoryClient: UserFactoryClient
  DigitalContentFactoryClient: DigitalContentFactoryClient
  SocialFeatureFactoryClient: SocialFeatureFactoryClient
  ContentListFactoryClient: ContentListFactoryClient
  UserLibraryFactoryClient: UserLibraryFactoryClient
  IPLDBlacklistFactoryClient: IPLDBlacklistFactoryClient
  contractClients: ContractClient[]
  UserReplicaSetManagerClient: UserReplicaSetManagerClient | undefined | null
  contracts: Record<string, string> | undefined
  contractAddresses: Record<string, string> | undefined

  constructor(
    web3Manager: Web3Manager,
    registryAddress: string,
    isServer: boolean,
    logger = console
  ) {
    this.web3Manager = web3Manager
    this.registryAddress = registryAddress
    this.isServer = isServer
    this.logger = logger

    this.RegistryClient = new RegistryClient(
      this.web3Manager,
      RegistryABI,
      this.registryAddress
    )
    this.getRegistryAddressForContract =
      this.getRegistryAddressForContract.bind(this)

    this.UserFactoryClient = new UserFactoryClient(
      this.web3Manager,
      UserFactoryABI,
      UserFactoryRegistryKey,
      this.getRegistryAddressForContract,
      this.logger
    )

    this.DigitalContentFactoryClient = new DigitalContentFactoryClient(
      this.web3Manager,
      DigitalContentFactoryABI,
      DigitalContentFactoryRegistryKey,
      this.getRegistryAddressForContract,
      this.logger
    )

    this.SocialFeatureFactoryClient = new SocialFeatureFactoryClient(
      this.web3Manager,
      SocialFeatureFactoryABI,
      SocialFeatureFactoryRegistryKey,
      this.getRegistryAddressForContract,
      this.logger
    )

    this.ContentListFactoryClient = new ContentListFactoryClient(
      this.web3Manager,
      ContentListFactoryABI,
      ContentListFactoryRegistryKey,
      this.getRegistryAddressForContract,
      this.logger
    )

    this.UserLibraryFactoryClient = new UserLibraryFactoryClient(
      this.web3Manager,
      UserLibraryFactoryABI,
      UserLibraryFactoryRegistryKey,
      this.getRegistryAddressForContract,
      this.logger
    )

    this.IPLDBlacklistFactoryClient = new IPLDBlacklistFactoryClient(
      this.web3Manager,
      IPLDBlacklistFactoryABI,
      IPLDBlacklistFactoryRegistryKey,
      this.getRegistryAddressForContract,
      this.logger
    )

    this.contractClients = [
      this.UserFactoryClient,
      this.DigitalContentFactoryClient,
      this.SocialFeatureFactoryClient,
      this.ContentListFactoryClient,
      this.UserLibraryFactoryClient,
      this.IPLDBlacklistFactoryClient
    ]
  }

  async init() {
    if (this.isServer) {
      await Promise.all(
        this.contractClients.map(async (client) => await client.init())
      )
      await this.initUserReplicaSetManagerClient()
    }
  }

  // Special case initialization flow for UserReplicaSetManagerClient backwards compatibility
  // Until the contract is deployed and added to the data contract registry, replica set
  // operations will flow through the existing UserFactory
  async initUserReplicaSetManagerClient() {
    try {
      if (
        this.UserReplicaSetManagerClient &&
        this.UserReplicaSetManagerClient._contractAddress !==
          '0x0000000000000000000000000000000000000000'
      ) {
        return
      }

      this.UserReplicaSetManagerClient = new UserReplicaSetManagerClient(
        this.web3Manager,
        UserReplicaSetManagerABI,
        UserReplicaSetManagerRegistryKey,
        this.getRegistryAddressForContract,
        this.logger
      )
      await this.UserReplicaSetManagerClient.init()
      if (
        this.UserReplicaSetManagerClient._contractAddress ===
        '0x0000000000000000000000000000000000000000'
      ) {
        throw new Error(
          `Failed retrieve address for ${this.UserReplicaSetManagerClient.contractRegistryKey}`
        )
      }
      const seedComplete =
        await this.UserReplicaSetManagerClient.getSeedComplete()
      if (!seedComplete) {
        throw new Error('UserReplicaSetManager pending seed operation')
      }
    } catch (e) {
      // Nullify failed attempt to initialize
      console.log(
        `Failed to initialize UserReplicaSetManagerClient with error ${
          (e as Error).message
        }`
      )
      this.UserReplicaSetManagerClient = null
    }
  }

  /* ------- CONTRACT META-FUNCTIONS ------- */

  /**
   * Retrieves contract address from Registry by key, caching previously retrieved data.
   * Refreshes cache if cached value is empty or zero address.
   * Value is empty during first time call, and zero if call is made before contract is deployed,
   *    since Registry sets default value of all contract keys to zero address if not registered.
   * @param contractName registry key of contract
   */
  async getRegistryAddressForContract(contractName: string) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer#Computed_property_names
    this.contracts = this.contracts ?? { [this.registryAddress]: 'registry' }
    this.contractAddresses = this.contractAddresses ?? {
      registry: this.registryAddress
    }

    if (
      !this.contractAddresses[contractName] ||
      Utils.isZeroAddress(this.contractAddresses[contractName] as string)
    ) {
      const address = (await this.RegistryClient.getContract(
        contractName
      )) as string
      this.contracts[address] = contractName
      this.contractAddresses[contractName] = address
    }
    return this.contractAddresses[contractName] as string
  }

  async getRegistryContractForAddress(address: string) {
    if (!this.contracts) {
      throw new Error('No contracts found. Have you called init() yet?')
    }
    const contractRegistryKey = this.contracts[address]
    if (!contractRegistryKey) {
      throw new Error(
        `No registry contract found for contract address ${address}`
      )
    }
    return contractRegistryKey
  }
}
