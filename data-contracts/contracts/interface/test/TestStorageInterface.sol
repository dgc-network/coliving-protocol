pragma solidity ^0.8.0;

interface TestStorageInterface {
  function getData(bytes32 _key) external view returns (bytes32 val);
  function addData(bytes32 _key, bytes32 _val) external;
}
