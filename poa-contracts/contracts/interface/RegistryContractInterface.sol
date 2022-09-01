//pragma solidity ^0.5.0;
pragma solidity ^0.6.1;


interface RegistryContractInterface {
  function setRegistry(address _registryAddress) external;
  function kill() external;
}