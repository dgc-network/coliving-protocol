pragma solidity ^0.5.0;

import "../registry/RegistryContract.sol";
import "../interface/RegistryInterface.sol";


/**
 * @title The persistent storage for Coliving social features
 *
 * @notice Repost actions are stored on-chain as they will involve payment,
 * while follow actions will not.
 */
contract SocialFeatureStorage is RegistryContract {

    bytes32 constant CALLER_REGISTRY_KEY = "SocialFeatureFactory";

    RegistryInterface registry = RegistryInterface(0);

    /**
     * @dev - Mapping of agreement repost contents
     * userId -> <agreementId -> repostedAgreement>
     */
    mapping(uint => mapping(uint => bool)) private userAgreementReposts;

    /**
     * @dev - Mapping of playlist repost contents
     * userId -> <playlistId -> repostedPlaylist>
     */
    mapping(uint => mapping(uint => bool)) private userPlaylistReposts;

    constructor(address _registryAddress) public {
        require(
            _registryAddress != address(0x00),
            "Requires non-zero _registryAddress");
        registry = RegistryInterface(_registryAddress);
    }

    function addAgreementRepost(
        uint _userId,
        uint _agreementId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {   
        userAgreementReposts[_userId][_agreementId] = true;
    }

    function deleteAgreementRepost(
        uint _userId,
        uint _agreementId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {   
        userAgreementReposts[_userId][_agreementId] = false;
    }

    function userRepostedAgreement(uint _userId, uint _agreementId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool)
    {
        return userAgreementReposts[_userId][_agreementId];
    }

    function addPlaylistRepost(
        uint _userId,
        uint _playlistId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        userPlaylistReposts[_userId][_playlistId] = true; 
    }

    function deletePlaylistRepost(
        uint _userId,
        uint _playlistId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        userPlaylistReposts[_userId][_playlistId] = false;
    }

    function userRepostedPlaylist(uint _userId, uint _playlistId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool)
    {
        return userPlaylistReposts[_userId][_playlistId];
    }
}
