pragma solidity ^0.5.0;


/// @title The interface for contracts to interact with the Coliving ContentListStorage contract
interface ContentListStorageInterface {
  function createContentList(
    uint _userId,
    bool _isAlbum,
    uint[] calldata _agreementIds) external returns (uint newContentListId);

  function addContentListAgreement(
    uint _content_listId,
    uint _addedAgreementId) external;

  function deleteContentListAgreement(
    uint _content_listId,
    uint _deletedAgreementId) external;

  function getContentListOwner(uint _content_listId) external view returns (uint contentListOwnerId);

  function isAgreementInContentList(
    uint _content_listId,
    uint _agreementId) external view returns (bool agreementInContentList);

  function contentListExists(uint _content_listId) external view returns (bool exists);
}
