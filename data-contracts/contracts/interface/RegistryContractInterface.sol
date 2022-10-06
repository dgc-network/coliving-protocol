pragma solidity ^0.8.0;

interface RegistryContractInterface {
  function setRegistry(address _registryAddress) external;
  function kill() external;
}