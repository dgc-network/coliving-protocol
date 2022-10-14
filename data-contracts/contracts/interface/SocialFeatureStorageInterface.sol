pragma solidity ^0.8.0;

/// @title The interface for contracts to interact with the Coliving Social Feature Storage contract
interface SocialFeatureStorageInterface {
  function addDigitalContentRepost(
    uint _userId,
    uint _digitalContentId) external; 

  function deleteDigitalContentRepost(
    uint _userId,
    uint _digitalContentId) external;

  function userRepostedDigitalContent(
    uint _userId,
    uint _digitalContentId) external view returns (bool reposted);

  function addContentListRepost(
    uint _userId,
    uint _contentListId) external;

  function deleteContentListRepost(
    uint _userId,
    uint _contentListId) external;

  function userRepostedContentList(
    uint _userId,
    uint _contentListId) external view returns (bool reposted);
}
