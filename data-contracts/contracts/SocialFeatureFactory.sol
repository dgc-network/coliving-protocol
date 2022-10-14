pragma solidity ^0.8.0;

import "./interface/RegistryInterface.sol";
import "./registry/RegistryContract.sol";
import "./interface/UserFactoryInterface.sol";
import "./interface/DigitalContentFactoryInterface.sol";
import "./interface/ContentListFactoryInterface.sol";
import "./interface/SocialFeatureStorageInterface.sol";
import "./SigningLogic.sol";

/** @title Logic contract for all Coliving social features including
* addDigitalContentRepost, deleteDigitalContentRepost, addUserFollow, deleteUserFollow */
contract SocialFeatureFactory is RegistryContract, SigningLogic {

    //RegistryInterface registry = RegistryInterface(0);
    address _registry;
    RegistryInterface registry = RegistryInterface(_registry);
    bytes32 socialFeatureStorageRegistryKey;
    bytes32 userFactoryRegistryKey;
    bytes32 digitalContentFactoryRegistryKey;
    bytes32 contentListFactoryRegistryKey;

    event DigitalContentRepostAdded(uint _userId, uint _digitalContentId);
    event DigitalContentRepostDeleted(uint _userId, uint _digitalContentId);
    event ContentListRepostAdded(uint _userId, uint _contentListId);
    event ContentListRepostDeleted(uint _userId, uint _contentListId);
    event UserFollowAdded(uint _followerUserId, uint _followeeUserId);
    event UserFollowDeleted(uint _followerUserId, uint _followeeUserId);

    /* EIP-712 */
    bytes32 constant DIGITAL_CONTENT_REPOST_REQUEST_TYPEHASH = keccak256(
        "AddDigitalContentRepostRequest(uint userId,uint digitalContentId,bytes32 nonce)"
    );
    bytes32 constant CONTENT_LIST_REPOST_REQUEST_TYPEHASH = keccak256(
        "AddContentListRepostRequest(uint userId,uint contentListId,bytes32 nonce)"
    );
    bytes32 constant DELETE_DIGITAL_CONTENT_REPOST_REQUEST_TYPEHASH = keccak256(
        "DeleteDigitalContentRepostRequest(uint userId,uint digitalContentId,bytes32 nonce)"
    );   
    bytes32 constant USER_FOLLOW_REQUEST_TYPEHASH = keccak256(
        "UserFollowRequest(uint followerUserId,uint followeeUserId,bytes32 nonce)"
    );
    bytes32 constant DELETE_USER_FOLLOW_REQUEST_TYPEHASH = keccak256(
        "DeleteUserFollowRequest(uint followerUserId,uint followeeUserId,bytes32 nonce)"
    );
    bytes32 constant DELETE_CONTENT_LIST_REPOST_REQUEST_TYPEHASH = keccak256(
        "DeleteContentListRepostRequest(uint userId,uint contentListId,bytes32 nonce)"
    );

    /** @notice Sets registry address, and registryKeys for userFactory and digitalContentFactory */
    constructor(
        address _registryAddress,
        bytes32 _socialFeatureStorageRegistryKey,
        bytes32 _userFactoryRegistryKey,
        bytes32 _digitalContentFactoryRegistryKey,
        bytes32 _contentListFactoryRegistryKey,
        uint _networkId
    ) SigningLogic("Social Feature Factory", "1", _networkId)
    {
        require(
            _registryAddress != address(0x00) &&
            _socialFeatureStorageRegistryKey.length != 0 &&
            _userFactoryRegistryKey.length != 0 &&
            _digitalContentFactoryRegistryKey.length != 0 &&
            _contentListFactoryRegistryKey.length != 0,
            "requires non-zero _registryAddress and non-empty registry key strings"
        );
        registry = RegistryInterface(_registryAddress);
        socialFeatureStorageRegistryKey = _socialFeatureStorageRegistryKey;
        userFactoryRegistryKey = _userFactoryRegistryKey;
        digitalContentFactoryRegistryKey = _digitalContentFactoryRegistryKey;
        contentListFactoryRegistryKey = _contentListFactoryRegistryKey;
    }

    /**
    * Request that a repost be created for the given digitalContentId and userId on behalf of the
    * given user address
    */
    function addDigitalContentRepost(
        uint _userId,
        uint _digitalContentId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateDigitalContentRepostRequestSchemaHash(
            _userId, _digitalContentId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool digitalContentExists = DigitalContentFactoryInterface(
            registry.getContract(digitalContentFactoryRegistryKey)
        ).digitalContentExists(_digitalContentId);
        require(digitalContentExists == true, "must provide valid digital_content ID");

        bool digitalContentRepostExists = SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).userRepostedDigitalContent(_userId, _digitalContentId);
        require(digitalContentRepostExists == false, "digital_content repost already exists");

        SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).addDigitalContentRepost(_userId, _digitalContentId);

        emit DigitalContentRepostAdded(_userId, _digitalContentId);
    }

    function addContentListRepost(
        uint _userId,
        uint _contentListId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external 
    {
        bytes32 signatureDigest = generateContentListRepostRequestSchemaHash(
            _userId, _contentListId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool contentListExists = ContentListFactoryInterface(
            registry.getContract(contentListFactoryRegistryKey)
        ).contentListExists(_contentListId);
        require(contentListExists == true, "must provide valid contentList ID");

        bool contentListRepostExists = SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).userRepostedContentList(_userId, _contentListId);
        require(contentListRepostExists == false, "contentList repost already exists");

        SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).addContentListRepost(_userId, _contentListId);

        emit ContentListRepostAdded(_userId, _contentListId);
    }

    function deleteDigitalContentRepost(
        uint _userId,
        uint _digitalContentId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateDeleteDigitalContentRepostRequestSchemaHash(
            _userId, _digitalContentId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool digitalContentExists = DigitalContentFactoryInterface(
            registry.getContract(digitalContentFactoryRegistryKey)
        ).digitalContentExists(_digitalContentId);
        require(digitalContentExists == true, "must provide valid digital_content ID");

        bool digitalContentRepostExists = SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).userRepostedDigitalContent(_userId, _digitalContentId);
        require(digitalContentRepostExists == true, "digital_content repost does not exist"); 

        SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).deleteDigitalContentRepost(_userId, _digitalContentId);

        emit DigitalContentRepostDeleted(_userId, _digitalContentId);
    }

    function deleteContentListRepost(
        uint _userId,
        uint _contentListId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateDeleteContentListRepostReqeustSchemaHash(
            _userId, _contentListId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool contentListExists = ContentListFactoryInterface(
            registry.getContract(contentListFactoryRegistryKey)
        ).contentListExists(_contentListId);
        require(contentListExists == true, "must provide valid contentList ID");

        bool contentListRepostExists = SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).userRepostedContentList(_userId, _contentListId);
        require(contentListRepostExists == true, "contentList repost does not exist"); 

        SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).deleteContentListRepost(_userId, _contentListId);

        emit ContentListRepostDeleted(_userId, _contentListId);
    }

    function addUserFollow(
        uint _followerUserId,
        uint _followeeUserId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateUserFollowRequestSchemaHash(
            _followerUserId, _followeeUserId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _followerUserId);  // will revert if false

        require(_followerUserId != _followeeUserId, "userIDs cannot be the same");

        bool followeeUserExists = UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).userExists(_followeeUserId);

        require(followeeUserExists == true, "must provide valid userID");

        // TODO - after storage is implemented, return False if UserFollow does not exist
        emit UserFollowAdded(_followerUserId, _followeeUserId);
        return true;
    }

    function deleteUserFollow(
        uint _followerUserId,
        uint _followeeUserId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDeleteUserFollowRequestSchemaHash(
            _followerUserId, _followeeUserId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _followerUserId);  // will revert if false

        require(_followerUserId != _followeeUserId, "userIDs cannot be the same");

        bool userExists = UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).userExists(_followeeUserId);

        require(userExists == true, "must provide valid userID");

        // TODO - after storage is implemented, return False if UserFollow does not exist
        emit UserFollowDeleted(_followerUserId, _followeeUserId);
        return true;
    }

    function userRepostedDigitalContent(
        uint _userId,
        uint _digitalContentId
    ) external view returns (bool)
    {
        return SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).userRepostedDigitalContent(_userId, _digitalContentId);
    }

    function userRepostedContentList(
        uint _userId,
        uint _contentListId
    ) external view returns (bool)
    {
        return SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).userRepostedContentList(_userId, _contentListId);
    }

    function generateDigitalContentRepostRequestSchemaHash(
        uint _userId,
        uint _digitalContentId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DIGITAL_CONTENT_REPOST_REQUEST_TYPEHASH,
                    _userId,
                    _digitalContentId,
                    _nonce
                )
            )
        );
    }

    function generateContentListRepostRequestSchemaHash(
        uint _userId,
        uint _contentListId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    CONTENT_LIST_REPOST_REQUEST_TYPEHASH,
                    _userId,
                    _contentListId,
                    _nonce
                )
            )
        );
    }

    function generateDeleteDigitalContentRepostRequestSchemaHash(
        uint _userId,
        uint _digitalContentId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_DIGITAL_CONTENT_REPOST_REQUEST_TYPEHASH,
                    _userId,
                    _digitalContentId,
                    _nonce
                )
            )
        );
    }

    function generateDeleteContentListRepostReqeustSchemaHash(
        uint _userId,
        uint _contentListId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_CONTENT_LIST_REPOST_REQUEST_TYPEHASH,
                    _userId,
                    _contentListId,
                    _nonce
                )
            )
        );
    }

    function generateUserFollowRequestSchemaHash(
        uint _followerUserId,
        uint _followeeUserId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    USER_FOLLOW_REQUEST_TYPEHASH,
                    _followerUserId,
                    _followeeUserId,
                    _nonce
                )
            )
        );
    }

    function generateDeleteUserFollowRequestSchemaHash(
        uint _followerUserId,
        uint _followeeUserId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_USER_FOLLOW_REQUEST_TYPEHASH,
                    _followerUserId,
                    _followeeUserId,
                    _nonce
                )
            )
        );
    }
}
