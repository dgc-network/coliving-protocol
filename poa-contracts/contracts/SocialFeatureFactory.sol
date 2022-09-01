//pragma solidity ^0.5.0;
pragma solidity ^0.6.1;

import "./interface/RegistryInterface.sol";
import "./registry/RegistryContract.sol";
import "./interface/UserFactoryInterface.sol";
import "./interface/AgreementFactoryInterface.sol";
import "./interface/ContentListFactoryInterface.sol";
import "./interface/SocialFeatureStorageInterface.sol";
import "./SigningLogic.sol";


/** @title Logic contract for all Coliving social features including
* addAgreementRepost, deleteAgreementRepost, addUserFollow, deleteUserFollow */
contract SocialFeatureFactory is RegistryContract, SigningLogic {

    RegistryInterface registry = RegistryInterface(0);
    bytes32 socialFeatureStorageRegistryKey;
    bytes32 userFactoryRegistryKey;
    bytes32 agreementFactoryRegistryKey;
    bytes32 contentListFactoryRegistryKey;

    event AgreementRepostAdded(uint _userId, uint _agreementId);
    event AgreementRepostDeleted(uint _userId, uint _agreementId);
    event ContentListRepostAdded(uint _userId, uint _content_listId);
    event ContentListRepostDeleted(uint _userId, uint _content_listId);
    event UserFollowAdded(uint _followerUserId, uint _followeeUserId);
    event UserFollowDeleted(uint _followerUserId, uint _followeeUserId);

    /* EIP-712 */
    bytes32 constant AGREEMENT_REPOST_REQUEST_TYPEHASH = keccak256(
        "AddAgreementRepostRequest(uint userId,uint agreementId,bytes32 nonce)"
    );
    bytes32 constant CONTENT_LIST_REPOST_REQUEST_TYPEHASH = keccak256(
        "AddContentListRepostRequest(uint userId,uint contentListId,bytes32 nonce)"
    );
    bytes32 constant DELETE_AGREEMENT_REPOST_REQUEST_TYPEHASH = keccak256(
        "DeleteAgreementRepostRequest(uint userId,uint agreementId,bytes32 nonce)"
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

    /** @notice Sets registry address, and registryKeys for userFactory and agreementFactory */
    constructor(
        address _registryAddress,
        bytes32 _socialFeatureStorageRegistryKey,
        bytes32 _userFactoryRegistryKey,
        bytes32 _agreementFactoryRegistryKey,
        bytes32 _content_listFactoryRegistryKey,
        uint _networkId
    ) SigningLogic("Social Feature Factory", "1", _networkId) public
    {
        require(
            _registryAddress != address(0x00) &&
            _socialFeatureStorageRegistryKey.length != 0 &&
            _userFactoryRegistryKey.length != 0 &&
            _agreementFactoryRegistryKey.length != 0 &&
            _content_listFactoryRegistryKey.length != 0,
            "requires non-zero _registryAddress and non-empty registry key strings"
        );
        registry = RegistryInterface(_registryAddress);
        socialFeatureStorageRegistryKey = _socialFeatureStorageRegistryKey;
        userFactoryRegistryKey = _userFactoryRegistryKey;
        agreementFactoryRegistryKey = _agreementFactoryRegistryKey;
        contentListFactoryRegistryKey = _content_listFactoryRegistryKey;
    }

    /**
    * Request that a repost be created for the given agreementId and userId on behalf of the
    * given user address
    */
    function addAgreementRepost(
        uint _userId,
        uint _agreementId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateAgreementRepostRequestSchemaHash(
            _userId, _agreementId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool agreementExists = AgreementFactoryInterface(
            registry.getContract(agreementFactoryRegistryKey)
        ).agreementExists(_agreementId);
        require(agreementExists == true, "must provide valid agreement ID");

        bool agreementRepostExists = SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).userRepostedAgreement(_userId, _agreementId);
        require(agreementRepostExists == false, "agreement repost already exists");

        SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).addAgreementRepost(_userId, _agreementId);

        emit AgreementRepostAdded(_userId, _agreementId);
    }

    function addContentListRepost(
        uint _userId,
        uint _content_listId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external 
    {
        bytes32 signatureDigest = generateContentListRepostRequestSchemaHash(
            _userId, _content_listId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool contentListExists = ContentListFactoryInterface(
            registry.getContract(contentListFactoryRegistryKey)
        ).contentListExists(_content_listId);
        require(contentListExists == true, "must provide valid contentList ID");

        bool contentListRepostExists = SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).userRepostedContentList(_userId, _content_listId);
        require(contentListRepostExists == false, "contentList repost already exists");

        SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).addContentListRepost(_userId, _content_listId);

        emit ContentListRepostAdded(_userId, _content_listId);
    }

    function deleteAgreementRepost(
        uint _userId,
        uint _agreementId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateDeleteAgreementRepostRequestSchemaHash(
            _userId, _agreementId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool agreementExists = AgreementFactoryInterface(
            registry.getContract(agreementFactoryRegistryKey)
        ).agreementExists(_agreementId);
        require(agreementExists == true, "must provide valid agreement ID");

        bool agreementRepostExists = SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).userRepostedAgreement(_userId, _agreementId);
        require(agreementRepostExists == true, "agreement repost does not exist"); 

        SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).deleteAgreementRepost(_userId, _agreementId);

        emit AgreementRepostDeleted(_userId, _agreementId);
    }

    function deleteContentListRepost(
        uint _userId,
        uint _content_listId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateDeleteContentListRepostReqeustSchemaHash(
            _userId, _content_listId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool contentListExists = ContentListFactoryInterface(
            registry.getContract(contentListFactoryRegistryKey)
        ).contentListExists(_content_listId);
        require(contentListExists == true, "must provide valid contentList ID");

        bool contentListRepostExists = SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).userRepostedContentList(_userId, _content_listId);
        require(contentListRepostExists == true, "contentList repost does not exist"); 

        SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).deleteContentListRepost(_userId, _content_listId);

        emit ContentListRepostDeleted(_userId, _content_listId);
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

    function userRepostedAgreement(
        uint _userId,
        uint _agreementId
    ) external view returns (bool)
    {
        return SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).userRepostedAgreement(_userId, _agreementId);
    }

    function userRepostedContentList(
        uint _userId,
        uint _content_listId
    ) external view returns (bool)
    {
        return SocialFeatureStorageInterface(
            registry.getContract(socialFeatureStorageRegistryKey)
        ).userRepostedContentList(_userId, _content_listId);
    }

    function generateAgreementRepostRequestSchemaHash(
        uint _userId,
        uint _agreementId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    AGREEMENT_REPOST_REQUEST_TYPEHASH,
                    _userId,
                    _agreementId,
                    _nonce
                )
            )
        );
    }

    function generateContentListRepostRequestSchemaHash(
        uint _userId,
        uint _content_listId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    CONTENT_LIST_REPOST_REQUEST_TYPEHASH,
                    _userId,
                    _content_listId,
                    _nonce
                )
            )
        );
    }

    function generateDeleteAgreementRepostRequestSchemaHash(
        uint _userId,
        uint _agreementId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_AGREEMENT_REPOST_REQUEST_TYPEHASH,
                    _userId,
                    _agreementId,
                    _nonce
                )
            )
        );
    }

    function generateDeleteContentListRepostReqeustSchemaHash(
        uint _userId,
        uint _content_listId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_CONTENT_LIST_REPOST_REQUEST_TYPEHASH,
                    _userId,
                    _content_listId,
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
