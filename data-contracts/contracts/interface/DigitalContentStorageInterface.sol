pragma solidity ^0.8.0;

/// @title The interface for contracts to interact with the Coliving DigitalContentStorage contract
interface DigitalContentStorageInterface {
  function getDigitalContent(uint _digital_contentId) external view returns (
    uint digitalContentOwnerId,
    bytes32 multihashDigest,
    uint8 multihashHashFn,
    uint8 multihashSize);

  function addDigitalContent(
    uint _digital_contentOwnerId,
    bytes32 _multihashDigest,
    uint8 _multihashHashFn,
    uint8 _multihashSize) external returns (uint newDigitalContentId);

  function updateDigitalContent(
    uint _digital_contentId,
    uint _digital_contentOwnerId,
    bytes32 _multihashDigest,
    uint8 _multihashHashFn,
    uint8 _multihashSize) external returns (bool updatePerformed);

  function digitalContentExists(uint _id) external view returns (bool exists);

}
