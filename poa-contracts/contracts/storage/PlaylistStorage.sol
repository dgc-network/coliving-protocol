pragma solidity ^0.5.0;

import "../registry/RegistryContract.sol";
import "../interface/RegistryInterface.sol";


/// @title The persistent storage for Coliving ContentLists + Albums
contract ContentListStorage is RegistryContract {

    bytes32 constant CALLER_REGISTRY_KEY = "ContentListFactory";

    RegistryInterface registry = RegistryInterface(0);

    /** @dev - Uniquely assigned content listId, incremented for each new content list/album */
    uint content listId = 1;

    /** @dev - Owner indication */
    mapping(uint => uint) public content listOwner;

    /** @dev - Album/content list distinction */
    mapping(uint => bool) private isAlbum;

    /** @dev - Mapping of content list contents
    *   content listId -> <agreementId -> agreementCountInContentList>
    */
    mapping(uint => mapping(uint => uint)) private content listContents;

    constructor(address _registryAddress) public {
        require(
            _registryAddress != address(0x00),
            "Requires non-zero _registryAddress");
        registry = RegistryInterface(_registryAddress);
    }

    function createContentList(
        uint _content listOwnerId,
        bool _isAlbum,
        uint[] calldata _agreementIds
    ) external onlyRegistrant(CALLER_REGISTRY_KEY) returns (uint newContentListId)
    {
        newContentListId = content listId;
        content listId += 1;

        // Number of agreements in content list
        uint content listLength = _agreementIds.length;

        require(content listId != newContentListId, "expected incremented content listId");

        // Update content list owner
        content listOwner[newContentListId] = _content listOwnerId;

        // Update additional on-chain fields
        isAlbum[newContentListId] = _isAlbum;

        // Populate the content list content mapping
        for (uint i = 0; i < content listLength; i++) {
            uint currentAgreementId = _agreementIds[i];
            content listContents[newContentListId][currentAgreementId] += 1;
        }

        return newContentListId;
    }

    function addContentListAgreement(
        uint _content listId,
        uint _addedAgreementId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        content listContents[_content listId][_addedAgreementId] += 1;
    }

    function deleteContentListAgreement(
        uint _content listId,
        uint _deletedAgreementId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        require(
            content listContents[_content listId][_deletedAgreementId] > 0,
            "Valid agreement in content list required for delete"
        );
        content listContents[_content listId][_deletedAgreementId] -= 1;
    }

    function getContentListOwner(uint _content listId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (uint)
    {
        return content listOwner[_content listId];
    }

    function isAgreementInContentList(
        uint _content listId,
        uint _agreementId
    ) external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool)
    {
        return content listContents[_content listId][_agreementId] > 0;
    }

    function content listExists(uint _content listId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool exists)
    {
        require(_content listId > 0, "Invalid content list id");
        // If the incremented content list ID is less than the argument,
        // the content list ID has not yet been assigned
        return _content listId < content listId;
    }
}
