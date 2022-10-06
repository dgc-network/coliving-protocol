pragma solidity ^0.8.0;

/// @title The interface for contracts to interact with the Coliving Social Feature Storage contract
interface SocialFeatureStorageInterface {
  function addAgreementRepost(
    uint _userId,
    uint _agreementId) external; 

  function deleteAgreementRepost(
    uint _userId,
    uint _agreementId) external;

  function userRepostedAgreement(
    uint _userId,
    uint _agreementId) external view returns (bool reposted);

  function addContentListRepost(
    uint _userId,
    uint _content_listId) external;

  function deleteContentListRepost(
    uint _userId,
    uint _content_listId) external;

  function userRepostedContentList(
    uint _userId,
    uint _content_listId) external view returns (bool reposted);
}
