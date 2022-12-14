import type { Comstock } from '../services/comstock'
import type { ContentNode } from '../services/contentNode'
import type { ColivingContracts } from '../services/dataContracts'
import type { DiscoveryNode } from '../services/discoveryNode'
import type { EthContracts } from '../services/ethContracts'
import type { EthWeb3Manager } from '../services/ethWeb3Manager'
import type { Hedgehog } from '../services/hedgehog'
import type { Hedgehog as HedgehogBase } from '@audius/hedgehog'
import type { IdentityService } from '../services/identity'
//import type { SolanaColivingData } from '../services/solanaColivingData'
//import type { SolanaWeb3Manager } from '../services/solana'
import type { Web3Manager } from '../services/web3Manager'
import type { UserStateManager } from '../userStateManager'
import type { Captcha } from '../utils'
import type { Wormhole } from '../services/wormhole'

export const Services = Object.freeze({
  IDENTITY_SERVICE: 'Identity Service',
  HEDGEHOG: 'Hedgehog',
  DISCOVERY_PROVIDER: 'Discovery Node',
  CONTENT_NODE: 'Creator Node',
  COMSTOCK: 'Comstock',
  SOLANA_WEB3_MANAGER: 'Solana Web3 Manager'
})

export type BaseConstructorArgs = [
  UserStateManager,
  IdentityService,
  Hedgehog,
  DiscoveryNode,
  Web3Manager,
  ColivingContracts,
  EthWeb3Manager,
  EthContracts,
  //SolanaWeb3Manager,
  //SolanaColivingData,
  Wormhole,
  ContentNode,
  Comstock,
  Captcha,
  boolean,
  any
]

export class Base {
  userStateManager: UserStateManager
  identityService: IdentityService
  hedgehog: HedgehogBase
  discoveryNode: DiscoveryNode
  web3Manager: Web3Manager
  contracts: ColivingContracts
  ethWeb3Manager: EthWeb3Manager
  ethContracts: EthContracts
  //solanaWeb3Manager: SolanaWeb3Manager
  //anchorColivingData: SolanaColivingData
  wormholeClient: Wormhole
  contentNode: ContentNode
  comstock: Comstock
  captcha: Captcha
  isServer: boolean
  logger: any = console

  _serviceMapping: { [service: string]: any }

  constructor(
    userStateManager: UserStateManager,
    identityService: IdentityService,
    hedgehog: Hedgehog,
    discoveryNode: DiscoveryNode,
    web3Manager: Web3Manager,
    contracts: ColivingContracts,
    ethWeb3Manager: EthWeb3Manager,
    ethContracts: EthContracts,
    //solanaWeb3Manager: SolanaWeb3Manager,
    //anchorColivingData: SolanaColivingData,
    wormholeClient: Wormhole,
    contentNode: ContentNode,
    comstock: Comstock,
    captcha: Captcha,
    isServer: boolean,
    logger: any = console
  ) {
    this.userStateManager = userStateManager
    this.identityService = identityService
    this.hedgehog = hedgehog as unknown as HedgehogBase
    this.discoveryNode = discoveryNode
    this.web3Manager = web3Manager
    this.contracts = contracts
    this.ethWeb3Manager = ethWeb3Manager
    this.ethContracts = ethContracts
    //this.solanaWeb3Manager = solanaWeb3Manager
    //this.anchorColivingData = anchorColivingData
    this.wormholeClient = wormholeClient
    this.contentNode = contentNode
    this.comstock = comstock
    this.captcha = captcha
    this.isServer = isServer
    this.logger = logger

    this._serviceMapping = {
      [Services.IDENTITY_SERVICE]: this.identityService,
      [Services.HEDGEHOG]: this.hedgehog,
      [Services.DISCOVERY_PROVIDER]: this.discoveryNode,
      [Services.CONTENT_NODE]: this.contentNode,
      [Services.COMSTOCK]: this.comstock,
      //[Services.SOLANA_WEB3_MANAGER]: this.solanaWeb3Manager
    }
  }

  REQUIRES(...services: string[]) {
    services.forEach((s) => {
      if (!this._serviceMapping[s]) return Base._missingService(...services)
    })
  }

  IS_OBJECT(o: any) {
    if (typeof o !== 'object') return Base._invalidType('object')
  }

  OBJECT_HAS_PROPS(o: any, props: string[], requiredProps: string[]) {
    const missingProps: string[] = []
    props.forEach((prop) => {
      if (!Object.prototype.hasOwnProperty.call(o, prop))
        missingProps.push(prop)
    })
    if (missingProps.length > 0) return Base._missingProps(missingProps)

    const missingRequiredProps: string[] = []
    requiredProps.forEach((prop) => {
      if (!Object.prototype.hasOwnProperty.call(o, prop) || o[prop] === '')
        missingRequiredProps.push(prop)
    })
    if (missingRequiredProps.length > 0)
      return Base._missingPropValues(missingRequiredProps)
  }

  FILE_IS_VALID(file: any) {
    if (this.isServer) {
      if (
        !file ||
        typeof file !== 'object' ||
        typeof file.pipe !== 'function' ||
        !file.readable
      ) {
        return Base._invalidFile()
      }
    } else {
      if (!file || typeof file !== 'object') {
        return Base._missingFile()
      }
    }
  }

  /* ------- PRIVATE  ------- */

  static _missingService(...serviceNames: string[]) {
    throw new Error(
      `Requires the following services: ${serviceNames.join(', ')}`
    )
  }

  static _invalidType(type: string) {
    throw new Error(`Argument must be of type ${type}`)
  }

  static _missingProps(props: string[]) {
    throw new Error(`Missing props ${props.join(', ')}`)
  }

  static _missingPropValues(props: string[]) {
    throw new Error(`Missing field values ${props.join(', ')}`)
  }

  static _invalidFile() {
    throw new Error('Expected file as readable stream')
  }

  static _missingFile() {
    throw new Error('Missing or malformed file')
  }
}
