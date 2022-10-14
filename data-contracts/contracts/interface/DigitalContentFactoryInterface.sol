pragma solidity ^0.8.0;

/// @title The interface for contracts to interact with the Coliving DigitalContent contract
interface DigitalContentFactoryInterface {
  function callerOwnsDigitalContent(address _caller, uint _digitalContentId) external view;

  function getDigitalContent(uint _id) external view returns (
    uint digitalContentOwnerId,
    bytes32 multihashDigest,
    uint8 multihashHashFn,
    uint8 multihashSize);

  function digitalContentExists(uint _id) external view returns (bool exists);
}
