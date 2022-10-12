pragma solidity ^0.8.0;

import "../registry/RegistryContract.sol";
import "../interface/RegistryInterface.sol";

/// @title The persistent storage for Coliving ContentLists + Albums
contract ContentListStorage is RegistryContract {

    bytes32 constant CALLER_REGISTRY_KEY = "ContentListFactory";

    //RegistryInterface registry = RegistryInterface(0);
    address _registryAddress;
    RegistryInterface registry = RegistryInterface(_registryAddress);

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
        uint _content_listOwnerId,
        bool _isAlbum,
        uint[] calldata _digital_contentIds
    ) external onlyRegistrant(CALLER_REGISTRY_KEY) returns (uint newContentListId)
    {
        newContentListId = contentListId;
        contentListId += 1;

        // Number of digitalContents in contentList
        uint contentListLength = _digital_contentIds.length;

        require(contentListId != newContentListId, "expected incremented contentListId");

        // Update contentList owner
        contentListOwner[newContentListId] = _content_listOwnerId;

        // Update additional on-chain fields
        isAlbum[newContentListId] = _isAlbum;

        // Populate the contentList content mapping
        for (uint i = 0; i < contentListLength; i++) {
            uint currentDigitalContentId = _digital_contentIds[i];
            contentListContents[newContentListId][currentDigitalContentId] += 1;
        }

        return newContentListId;
    }

    function addContentListDigitalContent(
        uint _content_listId,
        uint _addedDigitalContentId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        contentListContents[_content_listId][_addedDigitalContentId] += 1;
    }

    function deleteContentListDigitalContent(
        uint _content_listId,
        uint _deletedDigitalContentId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        require(
            contentListContents[_content_listId][_deletedDigitalContentId] > 0,
            "Valid digital_content in contentList required for delete"
        );
        contentListContents[_content_listId][_deletedDigitalContentId] -= 1;
    }

    function getContentListOwner(uint _content_listId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (uint)
    {
        return contentListOwner[_content_listId];
    }

    function isDigitalContentInContentList(
        uint _content_listId,
        uint _digital_contentId
    ) external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool)
    {
        return contentListContents[_content_listId][_digital_contentId] > 0;
    }

    function contentListExists(uint _content_listId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool exists)
    {
        require(_content_listId > 0, "Invalid contentList id");
        // If the incremented contentList ID is less than the argument,
        // the contentList ID has not yet been assigned
        return _content_listId < contentListId;
    }
}
