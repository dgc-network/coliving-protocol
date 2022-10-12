pragma solidity ^0.8.0;

/// @title The interface for contracts to interact with the Coliving ContentListStorage contract
interface ContentListStorageInterface {
  function createContentList(
    uint _userId,
    bool _isAlbum,
    uint[] calldata _digital_contentIds) external returns (uint newContentListId);

  function addContentListDigitalContent(
    uint _content_listId,
    uint _addedDigitalContentId) external;

  function deleteContentListDigitalContent(
    uint _content_listId,
    uint _deletedDigitalContentId) external;

  function getContentListOwner(uint _content_listId) external view returns (uint contentListOwnerId);

  function isDigitalContentInContentList(
    uint _content_listId,
    uint _digital_contentId) external view returns (bool digitalContentInContentList);

  function contentListExists(uint _content_listId) external view returns (bool exists);
}

