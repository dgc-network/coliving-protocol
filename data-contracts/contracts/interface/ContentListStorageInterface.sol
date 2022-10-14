pragma solidity ^0.8.0;

/// @title The interface for contracts to interact with the Coliving ContentListStorage contract
interface ContentListStorageInterface {
  function createContentList(
    uint _userId,
    bool _isAlbum,
    uint[] calldata _digitalContentIds) external returns (uint newContentListId);

  function addContentListDigitalContent(
    uint _contentListId,
    uint _addedDigitalContentId) external;

  function deleteContentListDigitalContent(
    uint _contentListId,
    uint _deletedDigitalContentId) external;

  function getContentListOwner(uint _contentListId) external view returns (uint contentListOwnerId);

  function isDigitalContentInContentList(
    uint _contentListId,
    uint _digitalContentId) external view returns (bool digitalContentInContentList);

  function contentListExists(uint _contentListId) external view returns (bool exists);
}

