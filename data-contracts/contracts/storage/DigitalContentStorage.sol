pragma solidity ^0.8.0;

import "../registry/RegistryContract.sol";
import "../interface/RegistryInterface.sol";

/// @title The persistent storage for Coliving DigitalContents
contract DigitalContentStorage is RegistryContract {

    bytes32 constant CALLER_REGISTRY_KEY = "DigitalContentFactory";

    //RegistryInterface registry = RegistryInterface(0);
    address _registryAddress;
    RegistryInterface registry = RegistryInterface(_registryAddress);

    /** @dev - Uniquely assigned digitalContentId, incremented for each new assignment */
    uint digitalContentId = 1;
    /** @dev - DigitalContent userIds, key = digitalContentId */
    mapping(uint => uint) private digitalContentOwnerIds;
    /** @dev - DigitalContent ipfsKeys, key = digitalContentId */
    mapping(uint => Multihash) private digitalContentMetadataMultihashes;

    constructor(address _registryAddress) public {
        require(
            _registryAddress != address(0x00),
            "Requires non-zero _registryAddress");
        registry = RegistryInterface(_registryAddress);
    }

    function getDigitalContent(uint _digital_contentId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (
        uint digitalContentOwnerId,
        bytes32 multihashDigest,
        uint8 multihashHashFn,
        uint8 multihashSize
    )
    {
        Multihash memory digitalContentMultihash = digitalContentMetadataMultihashes[_digital_contentId];
        return (
            digitalContentOwnerIds[_digital_contentId],
            digitalContentMultihash.digest,
            digitalContentMultihash.hashFn,
            digitalContentMultihash.size
        );
    }

    function addDigitalContent(
        uint _digital_contentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize
    ) external onlyRegistrant(CALLER_REGISTRY_KEY) returns (uint newDigitalContentId)
    {
        digitalContentOwnerIds[digitalContentId] = _digital_contentOwnerId;
        digitalContentMetadataMultihashes[digitalContentId] = Multihash({
            digest: _multihashDigest,
            hashFn: _multihashHashFn,
            size: _multihashSize
        });

        newDigitalContentId = digitalContentId;
        digitalContentId += 1;
        require(digitalContentId != newDigitalContentId, "expected incremented digitalContentId");

        return newDigitalContentId;
    }

    function updateDigitalContent(
        uint _digital_contentId,
        uint _digital_contentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize
    ) external onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool updatePerformed)
    {
        updatePerformed = false;
        if (digitalContentOwnerIds[_digital_contentId] != _digital_contentOwnerId) {
            digitalContentOwnerIds[_digital_contentId] = _digital_contentOwnerId;
        }

        if (digitalContentMetadataMultihashes[_digital_contentId].digest != _multihashDigest) {
            digitalContentMetadataMultihashes[_digital_contentId].digest = _multihashDigest;
            updatePerformed = true;
        }

        if (digitalContentMetadataMultihashes[_digital_contentId].hashFn != _multihashHashFn) {
            digitalContentMetadataMultihashes[_digital_contentId].hashFn = _multihashHashFn;
            updatePerformed = true;
        }

        if (digitalContentMetadataMultihashes[_digital_contentId].size != _multihashSize) {
            digitalContentMetadataMultihashes[_digital_contentId].size = _multihashSize;
            updatePerformed = true;
        }

        return updatePerformed;
    }

    function digitalContentExists(uint _id) external view onlyRegistrant(CALLER_REGISTRY_KEY)
    returns (bool exists)
    {
        require(_id > 0, "invalid digital_content ID");
        return (digitalContentOwnerIds[_id] != 0 && digitalContentMetadataMultihashes[_id].digest != "");
    }

}
