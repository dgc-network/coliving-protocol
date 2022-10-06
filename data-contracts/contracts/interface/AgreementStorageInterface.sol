//pragma solidity ^0.5.0;
pragma solidity ^0.8.0;

/// @title The interface for contracts to interact with the Coliving AgreementStorage contract
interface AgreementStorageInterface {
  function getAgreement(uint _agreementId) external view returns (
    uint agreementOwnerId,
    bytes32 multihashDigest,
    uint8 multihashHashFn,
    uint8 multihashSize);

  function addAgreement(
    uint _agreementOwnerId,
    bytes32 _multihashDigest,
    uint8 _multihashHashFn,
    uint8 _multihashSize) external returns (uint newAgreementId);

  function updateAgreement(
    uint _agreementId,
    uint _agreementOwnerId,
    bytes32 _multihashDigest,
    uint8 _multihashHashFn,
    uint8 _multihashSize) external returns (bool updatePerformed);

  function agreementExists(uint _id) external view returns (bool exists);

}
