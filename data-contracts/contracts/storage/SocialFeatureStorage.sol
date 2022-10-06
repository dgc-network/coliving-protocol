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
    address _registryAddress;
    RegistryInterface registry = RegistryInterface(_registryAddress);

    /**
     * @dev - Mapping of agreement repost contents
     * userId -> <agreementId -> repostedAgreement>
     */
    mapping(uint => mapping(uint => bool)) private userAgreementReposts;

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

    function addContentListRepost(
        uint _userId,
        uint _content_listId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        userContentListReposts[_userId][_content_listId] = true; 
    }

    function deleteContentListRepost(
        uint _userId,
        uint _content_listId
    ) external onlyRegistrant(CALLER_REGISTRY_KEY)
    {
        userContentListReposts[_userId][_content_listId] = false;
    }

    function userRepostedContentList(uint _userId, uint _content_listId)
    external view onlyRegistrant(CALLER_REGISTRY_KEY) returns (bool)
    {
        return userContentListReposts[_userId][_content_listId];
    }
}
