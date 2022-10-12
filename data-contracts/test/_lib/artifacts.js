/* global artifacts */

/**
 * Contains all the contracts referenced in Coliving unit tests
 */

// Registry contract
export const Registry = artifacts.require('./contract/Registry')

// Storage contracts
export const UserStorage = artifacts.require('./contract/storage/UserStorage')
export const DigitalContentStorage = artifacts.require('./contract/storage/DigitalContentStorage')
export const DiscoveryNodeStorage = artifacts.require('./contract/storage/DiscoveryNodeStorage')
export const ContentListStorage = artifacts.require('./contract/storage/ContentListStorage')
export const SocialFeatureStorage = artifacts.require('./contract/storage/SocialFeatureStorage')

// Factory contracts
export const UserFactory = artifacts.require('./contract/UserFactory')
export const DigitalContentFactory = artifacts.require('./contract/DigitalContentFactory')
export const DiscoveryNodeFactory = artifacts.require('./contract/DiscoveryNodeFactory')
export const SocialFeatureFactory = artifacts.require('./contract/SocialFeatureFactory')
export const ContentListFactory = artifacts.require('./contract/ContentListFactory')
export const UserLibraryFactory = artifacts.require('./contract/UserLibraryFactory')
export const UserReplicaSetManager = artifacts.require('./contract/UserReplicaSetManager')
export const EntityManager = artifacts.require('./contract/EntityManager')

// Proxy contracts
export const AdminUpgradeabilityProxy = artifacts.require('./contracts/AdminUpgradeabilityProxy')

// Test contract artifacts
export const TestStorage = artifacts.require('./contract/storage/test/TestStorage')
export const TestContract = artifacts.require('./contract/test/TestContract')
export const TestContractWithStorage = artifacts.require('./contract/test/TestContractWithStorage')
export const TestUserReplicaSetManager = artifacts.require('./contract/test/TestUserReplicaSetManager')
