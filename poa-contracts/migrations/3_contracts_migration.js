const contractConfig = require('../contract-config.js')

const Registry = artifacts.require('Registry')

const UserStorage = artifacts.require('UserStorage')
const AgreementStorage = artifacts.require('AgreementStorage')
const DiscoveryProviderStorage = artifacts.require('DiscoveryProviderStorage')
const ContentListStorage = artifacts.require('ContentListStorage')
const SocialFeatureStorage = artifacts.require('SocialFeatureStorage')

const UserFactory = artifacts.require('UserFactory')
const AgreementFactory = artifacts.require('AgreementFactory')
const DiscoveryProviderFactory = artifacts.require('DiscoveryProviderFactory')
const SocialFeatureFactory = artifacts.require('SocialFeatureFactory')
const ContentListFactory = artifacts.require('ContentListFactory')
const UserLibraryFactory = artifacts.require('UserLibraryFactory')
const IPLDBlacklistFactory = artifacts.require('IPLDBlacklistFactory')

const userStorageKey = web3.utils.utf8ToHex('UserStorage')
const userFactoryKey = web3.utils.utf8ToHex('UserFactory')
const agreementStorageKey = web3.utils.utf8ToHex('AgreementStorage')
const agreementFactoryKey = web3.utils.utf8ToHex('AgreementFactory')
const discoveryProviderStorageKey = web3.utils.utf8ToHex('DiscoveryProviderStorage')
const discoveryProviderFactoryKey = web3.utils.utf8ToHex('DiscoveryProviderFactory')
const content listStorageKey = web3.utils.utf8ToHex('ContentListStorage')
const content listFactoryKey = web3.utils.utf8ToHex('ContentListFactory')
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

    await deployer.deploy(AgreementStorage, Registry.address)
    await registry.addContract(agreementStorageKey, AgreementStorage.address)

    const verifierAddress = config.verifierAddress || accounts[0]
    // this is the blacklist's veriferAddress
    const blacklisterAddress = config.blacklisterAddress || accounts[0]

    await deployer.deploy(UserFactory, Registry.address, userStorageKey, network_id, verifierAddress)
    await registry.addContract(userFactoryKey, UserFactory.address)

    await deployer.deploy(AgreementFactory, Registry.address, agreementStorageKey, userFactoryKey, network_id)
    await registry.addContract(agreementFactoryKey, AgreementFactory.address)

    await deployer.deploy(DiscoveryProviderStorage, Registry.address)
    await registry.addContract(discoveryProviderStorageKey, DiscoveryProviderStorage.address)

    await deployer.deploy(DiscoveryProviderFactory, Registry.address, discoveryProviderStorageKey)
    await registry.addContract(discoveryProviderFactoryKey, DiscoveryProviderFactory.address)

    await deployer.deploy(ContentListStorage, Registry.address)
    await registry.addContract(content listStorageKey, ContentListStorage.address)
    await deployer.deploy(ContentListFactory, Registry.address, content listStorageKey, userFactoryKey, agreementFactoryKey, network_id)
    await registry.addContract(content listFactoryKey, ContentListFactory.address)

    await deployer.deploy(SocialFeatureStorage, Registry.address)
    await registry.addContract(socialFeatureStorageKey, SocialFeatureStorage.address)
    await deployer.deploy(SocialFeatureFactory, Registry.address, socialFeatureStorageKey, userFactoryKey, agreementFactoryKey, content listFactoryKey, network_id)
    await registry.addContract(socialFeatureFactoryKey, SocialFeatureFactory.address)

    await deployer.deploy(UserLibraryFactory, Registry.address, userFactoryKey, agreementFactoryKey, content listFactoryKey, network_id)
    await registry.addContract(userLibraryFactoryKey, UserLibraryFactory.address)

    await deployer.deploy(IPLDBlacklistFactory, Registry.address, network_id, blacklisterAddress)
    await registry.addContract(ipldBlacklistFactorykey, IPLDBlacklistFactory.address)
  })
}
