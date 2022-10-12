pragma solidity ^0.8.0;

import "../registry/RegistryContract.sol";
import "../interface/RegistryInterface.sol";

/// @title The persistent storage for Coliving Agreements
contract AgreementStorage is RegistryContract {

    bytes32 constant CALLER_REGISTRY_KEY = "AgreementFactory";

    //RegistryInterface registry = RegistryInterface(0);
    address _registryAddress;
    RegistryInterface registry = RegistryInterface(_registryAddress);

    /** @dev - Uniquely assigned agreementId, incremented for each new assignment */
    uint agreementId = 1;
    /** @dev - DigitalContent userIds, key = agreementId */
    mapping(uint => uint) private agreementOwnerIds;
    /** @dev - DigitalContent ipfsKeys, key = agreementId */
    mapping(uint => Multihash) private agreementMetadataMultihashes;

    constructor(address _registryAddress) public {
        require(
            _registryAddress != address(0x00),
            "Requires non-zero _registryAddress");
        registry = RegistryInterface(_registryAddress);
    }

    function getAgreement(uint _digital_contentId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (
        uint agreementOwnerId,
        bytes32 multihashDigest,
        uint8 multihashHashFn,
        uint8 multihashSize
    )
    {
        Multihash memory agreementMultihash = agreementMetadataMultihashes[_digital_contentId];
        return (
            agreementOwnerIds[_digital_contentId],
            agreementMultihash.digest,
            agreementMultihash.hashFn,
            agreementMultihash.size
        );
    }

    function addAgreement(
        uint _digital_contentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize
    ) external onlyRegistrant(CALLER_REGISTRY_KEY) returns (uint newAgreementId)
    {
        agreementOwnerIds[agreementId] = _digital_contentOwnerId;
        agreementMetadataMultihashes[agreementId] = Multihash({
            digest: _multihashDigest,
            hashFn: _multihashHashFn,
            size: _multihashSize
        });

        newAgreementId = agreementId;
        agreementId += 1;
        require(agreementId != newAgreementId, "expected incremented agreementId");

        return newAgreementId;
    }

    function updateAgreement(
        uint _digital_contentId,
        uint _digital_contentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize
    ) external onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool updatePerformed)
    {
        updatePerformed = false;
        if (agreementOwnerIds[_digital_contentId] != _digital_contentOwnerId) {
            agreementOwnerIds[_digital_contentId] = _digital_contentOwnerId;
        }

        if (agreementMetadataMultihashes[_digital_contentId].digest != _multihashDigest) {
            agreementMetadataMultihashes[_digital_contentId].digest = _multihashDigest;
            updatePerformed = true;
        }

        if (agreementMetadataMultihashes[_digital_contentId].hashFn != _multihashHashFn) {
            agreementMetadataMultihashes[_digital_contentId].hashFn = _multihashHashFn;
            updatePerformed = true;
        }

        if (agreementMetadataMultihashes[_digital_contentId].size != _multihashSize) {
            agreementMetadataMultihashes[_digital_contentId].size = _multihashSize;
            updatePerformed = true;
        }

        return updatePerformed;
    }

    function agreementExists(uint _id) external view onlyRegistrant(CALLER_REGISTRY_KEY)
    returns (bool exists)
    {
        require(_id > 0, "invalid digital_content ID");
        return (agreementOwnerIds[_id] != 0 && agreementMetadataMultihashes[_id].digest != "");
    }

}
