pragma solidity ^0.5.0;


/// @title The interface for contracts to interact with the Coliving ContentListStorage contract
interface ContentListStorageInterface {
  function createContentList(
    uint _userId,
    bool _isAlbum,
    uint[] calldata _agreementIds) external returns (uint newContentListId);

  function addContentListAgreement(
    uint _contentListId,
    uint _addedAgreementId) external;

  function deleteContentListAgreement(
    uint _contentListId,
    uint _deletedAgreementId) external;

  function getContentListOwner(uint _contentListId) external view returns (uint contentListOwnerId);

  function isAgreementInContentList(
    uint _contentListId,
    uint _agreementId) external view returns (bool agreementInContentList);

  function contentListExists(uint _contentListId) external view returns (bool exists);
}

