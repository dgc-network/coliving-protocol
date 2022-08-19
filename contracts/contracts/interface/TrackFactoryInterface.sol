pragma solidity ^0.5.0;


/// @title The interface for contracts to interact with the Coliving Agreement contract
interface AgreementFactoryInterface {
  function callerOwnsAgreement(address _caller, uint _agreementId) external view;

  function getAgreement(uint _id) external view returns (
    uint agreementOwnerId,
    bytes32 multihashDigest,
    uint8 multihashHashFn,
    uint8 multihashSize);

  function agreementExists(uint _id) external view returns (bool exists);
}
