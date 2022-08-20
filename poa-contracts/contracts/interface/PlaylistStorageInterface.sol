pragma solidity ^0.5.0;


/// @title The interface for contracts to interact with the Coliving PlaylistStorage contract
interface PlaylistStorageInterface {
  function createPlaylist(
    uint _userId,
    bool _isAlbum,
    uint[] calldata _agreementIds) external returns (uint newPlaylistId);

  function addPlaylistAgreement(
    uint _playlistId,
    uint _addedAgreementId) external;

  function deletePlaylistAgreement(
    uint _playlistId,
    uint _deletedAgreementId) external;

  function getPlaylistOwner(uint _playlistId) external view returns (uint playlistOwnerId);

  function isAgreementInPlaylist(
    uint _playlistId,
    uint _agreementId) external view returns (bool agreementInPlaylist);

  function playlistExists(uint _playlistId) external view returns (bool exists);
}

