//pragma solidity ^0.5.0;
pragma solidity ^0.6.1;


interface TestStorageInterface {
  function getData(bytes32 _key) external view returns (bytes32 val);
  function addData(bytes32 _key, bytes32 _val) external;
}
