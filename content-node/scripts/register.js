const ColivingLibs = require("@coliving/libs");
const config = require("../src/config");
const axios = require("axios");
const BN = require("bn.js");

async function main() {
  const ethWeb3 = await ColivingLibs.Utils.configureWeb3(
    config.get("ethProviderUrl"),
    config.get("ethNetworkId"),
    /* requiresAccount */ false,
  );
  
  if (!ethWeb3) {
    throw new Error("Failed to init colivingLibs due to ethWeb3 configuration error");
  }
  
  const colivingLibs = new ColivingLibs({
    ethWeb3Config: ColivingLibs.configEthWeb3(
      config.get("ethTokenAddress"),
      config.get("ethRegistryAddress"),
      ethWeb3,
      config.get("ethOwnerWallet"),
    ),
    isDebug: true,
  });

  await colivingLibs.init();

  // Wait for node to be healthy
  let healthy = false;
  while (!healthy) {
    try {
      const { data } = await axios({
        url: "/health_check",
        baseURL: config.get("creatorNodeEndpoint"),
        method: "get",
        timeout: 1000,
      });

      healthy = data.data.healthy;
    } catch (e) {
    }

    if (!healthy) {
      console.log("waiting for node to be healthy");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  const tx = await colivingLibs.ethContracts.ServiceProviderFactoryClient.register(
    "content-node",
    config.get("creatorNodeEndpoint"),
    new BN("200000000000000000000000"),
  );
}

main()
