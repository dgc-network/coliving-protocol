const _lib = require('../utils/lib');

const migrationOutput = require('../migrations/migration-output.json');

const AudiusToken = artifacts.require('AudiusToken');
const Registry = artifacts.require('Registry');
const Governance = artifacts.require('Governance');

const GovernanceKey = web3.utils.utf8ToHex('Governance');
const ServiceTypeManagerProxyKey = web3.utils.utf8ToHex('ServiceTypeManagerProxy');
const ContentNodeServiceType = web3.utils.utf8ToHex('content-node');
const DiscoveryNodeServiceType = web3.utils.utf8ToHex('discovery-node');

async function main() {
  const colivingToken = await AudiusToken.at(migrationOutput.tokenAddress);
  const registry = await Registry.at(migrationOutput.registryAddress);
  const governance = await Governance.at(await registry.getContract(GovernanceKey));

  // Distribute tokens to all accounts
  const accounts = await web3.eth.getAccounts();

  const decimals = await colivingToken.decimals();
  const amount = new web3.utils.BN(2000000).mul(new web3.utils.BN(10).pow(decimals))

  await Promise.all(accounts.map(async (account) => {
    const balance = await colivingToken.balanceOf(account);
    if (balance.lt(amount)) {
      await colivingToken.transfer(account, amount.sub(balance), {
        from: migrationOutput.proxyDeployerAddress
      });
    }
  }));

  // Add service types
  await _lib.addServiceType(
    ContentNodeServiceType,
    new web3.utils.BN(200000).mul(new web3.utils.BN(10).pow(decimals)).toString(),
    new web3.utils.BN(10000000).mul(new web3.utils.BN(10).pow(decimals)).toString(),
    governance,
    migrationOutput.proxyDeployerAddress,
    ServiceTypeManagerProxyKey,
  );

  await _lib.addServiceType(
    DiscoveryNodeServiceType,
    new web3.utils.BN(200000).mul(new web3.utils.BN(10).pow(decimals)).toString(),
    new web3.utils.BN(7000000).mul(new web3.utils.BN(10).pow(decimals)).toString(),
    governance,
    migrationOutput.proxyDeployerAddress,
    ServiceTypeManagerProxyKey,
  );

  // Set service versions
  await _lib.setServiceVersion(
    ContentNodeServiceType,
    web3.utils.utf8ToHex(process.env.CONTENT_NODE_VERSION),
    governance,
    migrationOutput.proxyDeployerAddress,
    ServiceTypeManagerProxyKey,
  );

  await _lib.setServiceVersion(
    DiscoveryNodeServiceType,
    web3.utils.utf8ToHex(process.env.DISCOVERY_NODE_VERSION),
    governance,
    migrationOutput.proxyDeployerAddress,
    ServiceTypeManagerProxyKey,
  );
}

module.exports = (callback) => {
  main()
    .then(callback)
    .catch(callback);
}
