const contractConfig = require('../contract-config.js')

const Registry = artifacts.require('Registry')

const UserStorage = artifacts.require('UserStorage')
const DigitalContentStorage = artifacts.require('DigitalContentStorage')
const DiscoveryNodeStorage = artifacts.require('DiscoveryNodeStorage')
const ContentListStorage = artifacts.require('ContentListStorage')
const SocialFeatureStorage = artifacts.require('SocialFeatureStorage')

const UserFactory = artifacts.require('UserFactory')
const DigitalContentFactory = artifacts.require('DigitalContentFactory')
const DiscoveryNodeFactory = artifacts.require('DiscoveryNodeFactory')
const SocialFeatureFactory = artifacts.require('SocialFeatureFactory')
const ContentListFactory = artifacts.require('ContentListFactory')
const UserLibraryFactory = artifacts.require('UserLibraryFactory')
const IPLDBlacklistFactory = artifacts.require('IPLDBlacklistFactory')

const userStorageKey = web3.utils.utf8ToHex('UserStorage')
const userFactoryKey = web3.utils.utf8ToHex('UserFactory')
const digitalContentStorageKey = web3.utils.utf8ToHex('DigitalContentStorage')
const digitalContentFactoryKey = web3.utils.utf8ToHex('DigitalContentFactory')
const discoveryNodeStorageKey = web3.utils.utf8ToHex('DiscoveryNodeStorage')
const discoveryNodeFactoryKey = web3.utils.utf8ToHex('DiscoveryNodeFactory')
const contentListStorageKey = web3.utils.utf8ToHex('ContentListStorage')
const contentListFactoryKey = web3.utils.utf8ToHex('ContentListFactory')
const socialFeatureFactoryKey = web3.utils.utf8ToHex('SocialFeatureFactory')
const socialFeatureStorageKey = web3.utils.utf8ToHex('SocialFeatureStorage')
const ipldBlacklistFactorykey = web3.utils.utf8ToHex('IPLDBlacklistFactory')
const userLibraryFactoryKey = web3.utils.utf8ToHex('UserLibraryFactory')

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    let registry = await Registry.deployed()

    const network_id = Registry.network_id
    const config = contractConfig[network]

    await deployer.deploy(UserStorage, Registry.address)
    await registry.addContract(userStorageKey, UserStorage.address)

    await deployer.deploy(DigitalContentStorage, Registry.address)
    await registry.addContract(digitalContentStorageKey, DigitalContentStorage.address)

    const verifierAddress = await config.verifierAddress || accounts[0]
    // this is the blacklist's veriferAddress
    const blacklisterAddress = config.blacklisterAddress || accounts[0]

    await deployer.deploy(UserFactory, Registry.address, userStorageKey, network_id, verifierAddress)
    await registry.addContract(userFactoryKey, UserFactory.address)

    await deployer.deploy(DigitalContentFactory, Registry.address, digitalContentStorageKey, userFactoryKey, network_id)
    await registry.addContract(digitalContentFactoryKey, DigitalContentFactory.address)

    await deployer.deploy(DiscoveryNodeStorage, Registry.address)
    await registry.addContract(discoveryNodeStorageKey, DiscoveryNodeStorage.address)

    await deployer.deploy(DiscoveryNodeFactory, Registry.address, discoveryNodeStorageKey)
    await registry.addContract(discoveryNodeFactoryKey, DiscoveryNodeFactory.address)

    await deployer.deploy(ContentListStorage, Registry.address)
    await registry.addContract(contentListStorageKey, ContentListStorage.address)
    await deployer.deploy(ContentListFactory, Registry.address, contentListStorageKey, userFactoryKey, digitalContentFactoryKey, network_id)
    await registry.addContract(contentListFactoryKey, ContentListFactory.address)

    await deployer.deploy(SocialFeatureStorage, Registry.address)
    await registry.addContract(socialFeatureStorageKey, SocialFeatureStorage.address)
    await deployer.deploy(SocialFeatureFactory, Registry.address, socialFeatureStorageKey, userFactoryKey, digitalContentFactoryKey, contentListFactoryKey, network_id)
    await registry.addContract(socialFeatureFactoryKey, SocialFeatureFactory.address)

    await deployer.deploy(UserLibraryFactory, Registry.address, userFactoryKey, digitalContentFactoryKey, contentListFactoryKey, network_id)
    await registry.addContract(userLibraryFactoryKey, UserLibraryFactory.address)

    await deployer.deploy(IPLDBlacklistFactory, Registry.address, network_id, blacklisterAddress)
    await registry.addContract(ipldBlacklistFactorykey, IPLDBlacklistFactory.address)
    
  })
}
