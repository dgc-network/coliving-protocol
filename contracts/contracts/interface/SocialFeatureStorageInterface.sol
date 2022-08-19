pragma solidity ^0.5.0;


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

  function addPlaylistRepost(
    uint _userId,
    uint _playlistId) external;

  function deletePlaylistRepost(
    uint _userId,
    uint _playlistId) external;

  function userRepostedPlaylist(
    uint _userId,
    uint _playlistId) external view returns (bool reposted);
}
