pragma solidity ^0.5.0;

import "./registry/RegistryContract.sol";
import "./interface/RegistryInterface.sol";
import "./interface/ContentListStorageInterface.sol";
import "./interface/UserFactoryInterface.sol";
import "./interface/AgreementFactoryInterface.sol";
import "./SigningLogic.sol";


/** @title Contract responsible for managing contentList business logic */
contract ContentListFactory is RegistryContract, SigningLogic {

    uint constant AGREEMENT_LIMIT = 200;

    RegistryInterface registry = RegistryInterface(0);
    bytes32 contentListStorageRegistryKey;
    bytes32 userFactoryRegistryKey;
    bytes32 agreementFactoryRegistryKey;

    event ContentListCreated(
        uint _contentListId,
        uint _contentListOwnerId,
        bool _isPrivate,
        bool _isAlbum,
        uint[] _agreementIds
    );

    event ContentListDeleted(uint _contentListId);

    event ContentListAgreementAdded(
        uint _contentListId,
        uint _addedAgreementId
    );

    event ContentListAgreementDeleted(
        uint _contentListId,
        uint _deletedAgreementId,
        uint _deletedAgreementTimestamp
    );

    event ContentListAgreementsOrdered(
        uint _contentListId,
        uint[] _orderedAgreementIds
    );

    event ContentListNameUpdated(
        uint _contentListId,
        string _updatedContentListName
    );

    event ContentListPrivacyUpdated(
        uint _contentListId,
        bool _updatedIsPrivate
    );

    event ContentListCoverPhotoUpdated(
        uint _contentListId,
        bytes32 _contentListImageMultihashDigest
    );

    event ContentListDescriptionUpdated(
        uint _contentListId,
        string _contentListDescription
    );

    event ContentListUPCUpdated(
        uint _contentListId,
        bytes32 _contentListUPC
    );

    bytes32 constant CREATE_CONTENT_LIST_TYPEHASH = keccak256(
        "CreateContentListRequest(uint contentListOwnerId,string contentListName,bool isPrivate,bool isAlbum,bytes32 agreementIdsHash,bytes32 nonce)"
    );

    bytes32 constant DELETE_CONTENT_LIST_TYPEHASH = keccak256(
        "DeleteContentListRequest(uint contentListId,bytes32 nonce)"
    );

    bytes32 constant ADD_CONTENT_LIST_AGREEMENT_TYPEHASH = keccak256(
        "AddContentListAgreementRequest(uint contentListId,uint addedAgreementId,bytes32 nonce)"
    );

    bytes32 constant DELETE_CONTENT_LIST_AGREEMENT_TYPEHASH = keccak256(
        "DeleteContentListAgreementRequest(uint contentListId,uint deletedAgreementId,uint deletedAgreementTimestamp,bytes32 nonce)"
    );

    bytes32 constant ORDER_CONTENT_LIST_AGREEMENTS_TYPEHASH = keccak256(
        "OrderContentListAgreementsRequest(uint contentListId,bytes32 agreementIdsHash,bytes32 nonce)"
    );

    bytes32 constant UPDATE_CONTENT_LIST_NAME_TYPEHASH = keccak256(
        "UpdateContentListNameRequest(uint contentListId,string updatedContentListName,bytes32 nonce)"
    );

    bytes32 constant UPDATE_CONTENT_LIST_PRIVACY_TYPEHASH = keccak256(
        "UpdateContentListPrivacyRequest(uint contentListId,bool updatedContentListPrivacy,bytes32 nonce)"
    );

    bytes32 constant UPDATE_CONTENT_LIST_COVER_PHOTO_TYPEHASH = keccak256(
        "UpdateContentListCoverPhotoRequest(uint contentListId,bytes32 contentListImageMultihashDigest,bytes32 nonce)"
    );

    bytes32 constant UPDATE_CONTENT_LIST_DESCRIPTION_TYPEHASH = keccak256(
        "UpdateContentListDescriptionRequest(uint contentListId,string contentListDescription,bytes32 nonce)"
    );

    bytes32 constant UPDATE_CONTENT_LIST_UPC_TYPEHASH = keccak256(
        "UpdateContentListUPCRequest(uint contentListId,bytes32 contentListUPC,bytes32 nonce)"
    );

    /** @notice Sets registry address and user factory and contentList storage keys */
    constructor(address _registryAddress,
        bytes32 _contentListStorageRegistryKey,
        bytes32 _userFactoryRegistryKey,
        bytes32 _agreementFactoryRegistryKey,
        uint _networkId
    ) SigningLogic("ContentList Factory", "1", _networkId)
    public {
        require(
            _registryAddress != address(0x00) &&
            _contentListStorageRegistryKey.length != 0 &&
            _userFactoryRegistryKey.length != 0 &&
            _agreementFactoryRegistryKey != 0,
            "requires non-zero registryAddress, non-empty _contentListStorageRegistryKey, non-empty _agreementFactoryRegistryKey"
        );
        registry = RegistryInterface(_registryAddress);
        contentListStorageRegistryKey = _contentListStorageRegistryKey;
        userFactoryRegistryKey = _userFactoryRegistryKey;
        agreementFactoryRegistryKey = _agreementFactoryRegistryKey;
    }

    /*
    Create a new contentList, storing the contents / owner / isAlbum fields in storage.
    These fields are stored since they will be used to determine payments for reposts and
    other contentList/album related actions.
    Every other field, ie. isPrivate, contentList name, etc. are indexed through events only
    */
    function createContentList(
        uint _contentListOwnerId,
        string calldata _contentListName,
        bool _isPrivate,
        bool _isAlbum,
        uint[] calldata _agreementIds,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (uint newContentListId)
    {
        require(
            _agreementIds.length < AGREEMENT_LIMIT,
            "Maximum of 200 agreements in a contentList currently supported"
        );

        bytes32 signatureDigest = generateCreateContentListRequestSchemaHash(
            _contentListOwnerId,
            _contentListName,
            _isPrivate,
            _isAlbum,
            _agreementIds,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _contentListOwnerId); // will revert if false

        /* Validate that each agreement exists before creating the contentList */
        for (uint i = 0; i < _agreementIds.length; i++) {
            bool agreementExists = AgreementFactoryInterface(
                registry.getContract(agreementFactoryRegistryKey)
            ).agreementExists(_agreementIds[i]);
            require(agreementExists, "Expected valid agreement id");
        }

        uint contentListId = ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).createContentList(_contentListOwnerId, _isAlbum, _agreementIds);

        emit ContentListCreated(
            contentListId,
            _contentListOwnerId,
            _isPrivate,
            _isAlbum,
            _agreementIds
        );

        // Emit second event with contentList name
        emit ContentListNameUpdated(contentListId, _contentListName);

        return contentListId;
    }

    /**
    * @notice deletes existing contentList given its ID
    * @notice does not delete contentList from storage by design
    * @param _contentListId - id of contentList to delete
    */
    function deleteContentList(
        uint _contentListId,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDeleteContentListSchemaHash(_contentListId, _nonce);
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _contentListId);   // will revert if false

        emit ContentListDeleted(_contentListId);
        return true;
    }

    function addContentListAgreement(
        uint _contentListId,
        uint _addedAgreementId,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateAddContentListAgreementSchemaHash(
            _contentListId,
            _addedAgreementId,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _contentListId);   // will revert if false

        bool agreementExists = AgreementFactoryInterface(
            registry.getContract(agreementFactoryRegistryKey)
        ).agreementExists(_addedAgreementId);
        require(agreementExists, "Expected valid agreement id");

        ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).addContentListAgreement(_contentListId, _addedAgreementId);

        emit ContentListAgreementAdded(_contentListId, _addedAgreementId);
    }

    /* delete agreement from contentList */
    function deleteContentListAgreement(
        uint _contentListId,
        uint _deletedAgreementId,
        uint _deletedAgreementTimestamp,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateDeleteContentListAgreementSchemaHash(
            _contentListId,
            _deletedAgreementId,
            _deletedAgreementTimestamp,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _contentListId);   // will revert if false

        bool isValidAgreement = this.isAgreementInContentList(_contentListId, _deletedAgreementId);
        require(isValidAgreement == true, "Expect valid agreement for delete operation");

        ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).deleteContentListAgreement(_contentListId, _deletedAgreementId);

        emit ContentListAgreementDeleted(_contentListId, _deletedAgreementId, _deletedAgreementTimestamp);
    }

    /* order contentList agreements */
    function orderContentListAgreements(
        uint _contentListId,
        uint[] calldata _agreementIds,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        require(
            _agreementIds.length < AGREEMENT_LIMIT,
            "Maximum of 200 agreements in a contentList currently supported"
        );

        bytes32 signatureDigest = generateOrderContentListAgreementsRequestSchemaHash(
            _contentListId,
            _agreementIds,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _contentListId);   // will revert if false

        /* Validate that each agreement exists in the contentList */
        for (uint i = 0; i < _agreementIds.length; i++) {
            bool isValidAgreement = this.isAgreementInContentList(_contentListId, _agreementIds[i]);
            require(isValidAgreement, "Expected valid contentList agreement id");
        }

        emit ContentListAgreementsOrdered(_contentListId, _agreementIds);
    }

    function updateContentListName(
        uint _contentListId,
        string calldata _updatedContentListName,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 _signatureDigest = generateUpdateContentListNameRequestSchemaHash(
            _contentListId,
            _updatedContentListName,
            _nonce
        );
        address signer = recoverSigner(_signatureDigest, _subjectSig);
        burnSignatureDigest(_signatureDigest, signer);
        this.callerOwnsContentList(signer, _contentListId);   // will revert if false

        emit ContentListNameUpdated(_contentListId, _updatedContentListName);
    }

    function updateContentListPrivacy(
        uint _contentListId,
        bool _updatedContentListPrivacy,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdateContentListPrivacyRequestSchemaHash(
            _contentListId,
            _updatedContentListPrivacy,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _contentListId);   // will revert if false

        emit ContentListPrivacyUpdated(_contentListId, _updatedContentListPrivacy);
    }

    /* update contentList cover photo */
    function updateContentListCoverPhoto(
        uint _contentListId,
        bytes32 _contentListImageMultihashDigest,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdateContentListCoverPhotoSchemaHash(
            _contentListId,
            _contentListImageMultihashDigest,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _contentListId);   // will revert if false

        emit ContentListCoverPhotoUpdated(_contentListId, _contentListImageMultihashDigest);
    }

    function updateContentListDescription(
        uint _contentListId,
        string calldata _contentListDescription,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdateContentListDescriptionSchemaHash(
            _contentListId,
            _contentListDescription,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _contentListId);   // will revert if false

        emit ContentListDescriptionUpdated(_contentListId, _contentListDescription);
    }

    function updateContentListUPC(
        uint _contentListId,
        bytes32 _updatedContentListUPC,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdateContentListUPCSchemaHash(
            _contentListId,
            _updatedContentListUPC,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _contentListId);   // will revert if false

        emit ContentListUPCUpdated(_contentListId, _updatedContentListUPC);
    }

    function contentListExists(uint _contentListId)
    external view returns (bool exists)
    {
        return ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).contentListExists(_contentListId);
    }

    function isAgreementInContentList(
        uint _contentListId,
        uint _agreementId
    ) external view returns (bool)
    {
        return ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).isAgreementInContentList(_contentListId, _agreementId);
    }

    /** @notice ensures that calling address owns contentList; reverts if not */
    function callerOwnsContentList(
        address _caller,
        uint _contentListId
    ) external view
    {
        // get user id of contentList owner
        uint contentListOwnerId = ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).getContentListOwner(_contentListId);

        // confirm caller owns contentList owner
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(_caller, contentListOwnerId);
    }

    /** REQUEST SCHEMA HASH GENERATORS */
    function generateCreateContentListRequestSchemaHash(
        uint _contentListOwnerId,
        string memory _contentListName,
        bool _isPrivate,
        bool _isAlbum,
        uint[] memory _agreementIds,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    CREATE_CONTENT_LIST_TYPEHASH,
                    _contentListOwnerId,
                    keccak256(bytes(_contentListName)),
                    _isPrivate,
                    _isAlbum,
                    keccak256(abi.encode(_agreementIds)),
                    _nonce
                )
            )
        );
    }

    function generateDeleteContentListSchemaHash(
        uint _contentListId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_CONTENT_LIST_TYPEHASH,
                    _contentListId,
                    _nonce
                )
            )
        );
    }

    function generateAddContentListAgreementSchemaHash(
        uint _contentListId,
        uint _addedAgreementId,
        bytes32 _nonce
    ) internal view returns(bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    ADD_CONTENT_LIST_AGREEMENT_TYPEHASH,
                    _contentListId,
                    _addedAgreementId,
                    _nonce
                )
            )
        );
    }

    function generateDeleteContentListAgreementSchemaHash(
        uint _contentListId,
        uint _deletedAgreementId,
        uint _deletedAgreementTimestamp,
        bytes32 _nonce
    ) internal view returns(bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_CONTENT_LIST_AGREEMENT_TYPEHASH,
                    _contentListId,
                    _deletedAgreementId,
                    _deletedAgreementTimestamp,
                    _nonce
                )
            )
        );
    }

    function generateOrderContentListAgreementsRequestSchemaHash(
        uint _contentListId,
        uint[] memory _agreementIds,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    ORDER_CONTENT_LIST_AGREEMENTS_TYPEHASH,
                    _contentListId,
                    keccak256(abi.encode(_agreementIds)),
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListNameRequestSchemaHash(
        uint _contentListId,
        string memory _updatedContentListName,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_NAME_TYPEHASH,
                    _contentListId,
                    keccak256(bytes(_updatedContentListName)),
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListPrivacyRequestSchemaHash(
        uint _contentListId,
        bool _updatedContentListPrivacy,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_PRIVACY_TYPEHASH,
                    _contentListId,
                    _updatedContentListPrivacy,
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListCoverPhotoSchemaHash(
        uint _contentListId,
        bytes32 _contentListImageMultihashDigest,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_COVER_PHOTO_TYPEHASH,
                    _contentListId,
                    _contentListImageMultihashDigest,
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListDescriptionSchemaHash(
        uint _contentListId,
        string memory _contentListDescription,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_DESCRIPTION_TYPEHASH,
                    _contentListId,
                    keccak256(bytes(_contentListDescription)),
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListUPCSchemaHash(
        uint _contentListId,
        bytes32 _contentListUPC,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_UPC_TYPEHASH,
                    _contentListId,
                    _contentListUPC,
                    _nonce
                )
            )
        );
    }
}
