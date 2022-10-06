pragma solidity ^0.8.0;

interface TestContractWithStorageInterface {
  function getData(bytes32 _key) external view returns (bytes32 val);
}