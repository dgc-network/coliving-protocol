pragma solidity ^0.8.0;

import "../registry/RegistryContract.sol";
import "../interface/RegistryInterface.sol";

/// @title The persistent storage for Coliving DigitalContents
contract DigitalContentStorage is RegistryContract {

    bytes32 constant CALLER_REGISTRY_KEY = "DigitalContentFactory";

    //RegistryInterface registry = RegistryInterface(0);
    address _registry;
    RegistryInterface registry = RegistryInterface(_registry);

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

    function getDigitalContent(uint _digitalContentId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (
        uint digitalContentOwnerId,
        bytes32 multihashDigest,
        uint8 multihashHashFn,
        uint8 multihashSize
    )
    {
        Multihash memory digitalContentMultihash = digitalContentMetadataMultihashes[_digitalContentId];
        return (
            digitalContentOwnerIds[_digitalContentId],
            digitalContentMultihash.digest,
            digitalContentMultihash.hashFn,
            digitalContentMultihash.size
        );
    }

    function addDigitalContent(
        uint _digitalContentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize
    ) external onlyRegistrant(CALLER_REGISTRY_KEY) returns (uint newDigitalContentId)
    {
        digitalContentOwnerIds[digitalContentId] = _digitalContentOwnerId;
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
        uint _digitalContentId,
        uint _digitalContentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize
    ) external onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool updatePerformed)
    {
        updatePerformed = false;
        if (digitalContentOwnerIds[_digitalContentId] != _digitalContentOwnerId) {
            digitalContentOwnerIds[_digitalContentId] = _digitalContentOwnerId;
        }

        if (digitalContentMetadataMultihashes[_digitalContentId].digest != _multihashDigest) {
            digitalContentMetadataMultihashes[_digitalContentId].digest = _multihashDigest;
            updatePerformed = true;
        }

        if (digitalContentMetadataMultihashes[_digitalContentId].hashFn != _multihashHashFn) {
            digitalContentMetadataMultihashes[_digitalContentId].hashFn = _multihashHashFn;
            updatePerformed = true;
        }

        if (digitalContentMetadataMultihashes[_digitalContentId].size != _multihashSize) {
            digitalContentMetadataMultihashes[_digitalContentId].size = _multihashSize;
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
