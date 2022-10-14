pragma solidity ^0.8.0;

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

    //RegistryInterface registry = RegistryInterface(0);
    address _registry;
    RegistryInterface registry = RegistryInterface(_registry);

    /**
     * @dev - Mapping of digital_content repost contents
     * userId -> <digitalContentId -> repostedDigitalContent>
     */
    mapping(uint => mapping(uint => bool)) private userDigitalContentReposts;

    /**
     * @dev - Mapping of contentList repost contents
     * userId -> <contentListId -> repostedContentList>
     */
    mapping(uint => mapping(uint => bool)) private userContentListReposts;

    constructor(address _registryAddress) public {
        require(
            _registryAddress != address(0x00),
            "Requires non-zero _registryAddress");
        registry = RegistryInterface(_registryAddress);
    }

    function addDigitalContentRepost(
        uint _userId,
        uint _digitalContentId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {   
        userDigitalContentReposts[_userId][_digitalContentId] = true;
    }

    function deleteDigitalContentRepost(
        uint _userId,
        uint _digitalContentId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {   
        userDigitalContentReposts[_userId][_digitalContentId] = false;
    }

    function userRepostedDigitalContent(uint _userId, uint _digitalContentId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool)
    {
        return userDigitalContentReposts[_userId][_digitalContentId];
    }

    function addContentListRepost(
        uint _userId,
        uint _contentListId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        userContentListReposts[_userId][_contentListId] = true; 
    }

    function deleteContentListRepost(
        uint _userId,
        uint _contentListId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        userContentListReposts[_userId][_contentListId] = false;
    }

    function userRepostedContentList(uint _userId, uint _contentListId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool)
    {
        return userContentListReposts[_userId][_contentListId];
    }
}
