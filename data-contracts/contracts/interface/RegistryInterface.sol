pragma solidity ^0.8.0;

/// @title The interface for contracts to interact with the Coliving Registry contract
interface RegistryInterface {
  function getContract(bytes32 _name) external view returns (address);
  function getContract(bytes32 _name, uint _version) external view returns (address);
  function getContractVersionCount(bytes32 _name) external view returns (uint);
}
