pragma solidity ^0.8.0;

import "../registry/RegistryContract.sol";
import "../interface/RegistryInterface.sol";

/// @title The persistent storage for Coliving ContentLists + Albums
contract ContentListStorage is RegistryContract {

    bytes32 constant CALLER_REGISTRY_KEY = "ContentListFactory";

    //RegistryInterface registry = RegistryInterface(0);
    address _registry;
    RegistryInterface registry = RegistryInterface(_registry);

    /** @dev - Uniquely assigned contentListId, incremented for each new contentList/album */
    uint contentListId = 1;

    /** @dev - Owner indication */
    mapping(uint => uint) public contentListOwner;

    /** @dev - Album/contentList distinction */
    mapping(uint => bool) private isAlbum;

    /** @dev - Mapping of contentList contents
    *   contentListId -> <digitalContentId -> digitalContentCountInContentList>
    */
    mapping(uint => mapping(uint => uint)) private contentListContents;

    constructor(address _registryAddress) public {
        require(
            _registryAddress != address(0x00),
            "Requires non-zero _registryAddress");
        registry = RegistryInterface(_registryAddress);
    }

    function createContentList(
        uint _contentListOwnerId,
        bool _isAlbum,
        uint[] calldata _digitalContentIds
    ) external onlyRegistrant(CALLER_REGISTRY_KEY) returns (uint newContentListId)
    {
        newContentListId = contentListId;
        contentListId += 1;

        // Number of digitalContents in contentList
        uint contentListLength = _digitalContentIds.length;

        require(contentListId != newContentListId, "expected incremented contentListId");

        // Update contentList owner
        contentListOwner[newContentListId] = _contentListOwnerId;

        // Update additional on-chain fields
        isAlbum[newContentListId] = _isAlbum;

        // Populate the contentList content mapping
        for (uint i = 0; i < contentListLength; i++) {
            uint currentDigitalContentId = _digitalContentIds[i];
            contentListContents[newContentListId][currentDigitalContentId] += 1;
        }

        return newContentListId;
    }

    function addContentListDigitalContent(
        uint _contentListId,
        uint _addedDigitalContentId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        contentListContents[_contentListId][_addedDigitalContentId] += 1;
    }

    function deleteContentListDigitalContent(
        uint _contentListId,
        uint _deletedDigitalContentId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        require(
            contentListContents[_contentListId][_deletedDigitalContentId] > 0,
            "Valid digital_content in contentList required for delete"
        );
        contentListContents[_contentListId][_deletedDigitalContentId] -= 1;
    }

    function getContentListOwner(uint _contentListId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (uint)
    {
        return contentListOwner[_contentListId];
    }

    function isDigitalContentInContentList(
        uint _contentListId,
        uint _digitalContentId
    ) external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool)
    {
        return contentListContents[_contentListId][_digitalContentId] > 0;
    }

    function contentListExists(uint _contentListId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool exists)
    {
        require(_contentListId > 0, "Invalid contentList id");
        // If the incremented contentList ID is less than the argument,
        // the contentList ID has not yet been assigned
        return _contentListId < contentListId;
    }
}
