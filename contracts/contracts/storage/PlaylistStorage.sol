pragma solidity ^0.5.0;

import "../registry/RegistryContract.sol";
import "../interface/RegistryInterface.sol";


/// @title The persistent storage for Coliving Playlists + Albums
contract PlaylistStorage is RegistryContract {

    bytes32 constant CALLER_REGISTRY_KEY = "PlaylistFactory";

    RegistryInterface registry = RegistryInterface(0);

    /** @dev - Uniquely assigned playlistId, incremented for each new playlist/album */
    uint playlistId = 1;

    /** @dev - Owner indication */
    mapping(uint => uint) public playlistOwner;

    /** @dev - Album/playlist distinction */
    mapping(uint => bool) private isAlbum;

    /** @dev - Mapping of playlist contents
    *   playlistId -> <agreementId -> agreementCountInPlaylist>
    */
    mapping(uint => mapping(uint => uint)) private playlistContents;

    constructor(address _registryAddress) public {
        require(
            _registryAddress != address(0x00),
            "Requires non-zero _registryAddress");
        registry = RegistryInterface(_registryAddress);
    }

    function createPlaylist(
        uint _playlistOwnerId,
        bool _isAlbum,
        uint[] calldata _agreementIds
    ) external onlyRegistrant(CALLER_REGISTRY_KEY) returns (uint newPlaylistId)
    {
        newPlaylistId = playlistId;
        playlistId += 1;

        // Number of agreements in playlist
        uint playlistLength = _agreementIds.length;

        require(playlistId != newPlaylistId, "expected incremented playlistId");

        // Update playlist owner
        playlistOwner[newPlaylistId] = _playlistOwnerId;

        // Update additional on-chain fields
        isAlbum[newPlaylistId] = _isAlbum;

        // Populate the playlist content mapping
        for (uint i = 0; i < playlistLength; i++) {
            uint currentAgreementId = _agreementIds[i];
            playlistContents[newPlaylistId][currentAgreementId] += 1;
        }

        return newPlaylistId;
    }

    function addPlaylistAgreement(
        uint _playlistId,
        uint _addedAgreementId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        playlistContents[_playlistId][_addedAgreementId] += 1;
    }

    function deletePlaylistAgreement(
        uint _playlistId,
        uint _deletedAgreementId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        require(
            playlistContents[_playlistId][_deletedAgreementId] > 0,
            "Valid agreement in playlist required for delete"
        );
        playlistContents[_playlistId][_deletedAgreementId] -= 1;
    }

    function getPlaylistOwner(uint _playlistId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (uint)
    {
        return playlistOwner[_playlistId];
    }

    function isAgreementInPlaylist(
        uint _playlistId,
        uint _agreementId
    ) external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool)
    {
        return playlistContents[_playlistId][_agreementId] > 0;
    }

    function playlistExists(uint _playlistId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool exists)
    {
        require(_playlistId > 0, "Invalid playlist id");
        // If the incremented playlist ID is less than the argument,
        // the playlist ID has not yet been assigned
        return _playlistId < playlistId;
    }
}
