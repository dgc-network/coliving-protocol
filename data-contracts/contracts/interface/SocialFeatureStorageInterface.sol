pragma solidity ^0.8.0;

/// @title The interface for contracts to interact with the Coliving Social Feature Storage contract
interface SocialFeatureStorageInterface {
  function addDigitalContentRepost(
    uint _userId,
    uint _digital_contentId) external; 

  function deleteDigitalContentRepost(
    uint _userId,
    uint _digital_contentId) external;

  function userRepostedDigitalContent(
    uint _userId,
    uint _digital_contentId) external view returns (bool reposted);

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
