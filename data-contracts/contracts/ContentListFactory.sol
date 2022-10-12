pragma solidity ^0.8.0;

import "./registry/RegistryContract.sol";
import "./interface/RegistryInterface.sol";
import "./interface/ContentListStorageInterface.sol";
import "./interface/UserFactoryInterface.sol";
import "./interface/AgreementFactoryInterface.sol";
import "./SigningLogic.sol";


/** @title Contract responsible for managing contentList business logic */
contract ContentListFactory is RegistryContract, SigningLogic {

    uint constant AGREEMENT_LIMIT = 200;

    //RegistryInterface registry = RegistryInterface(0);
    address _registryAddress;
    RegistryInterface registry = RegistryInterface(_registryAddress);
    bytes32 contentListStorageRegistryKey;
    bytes32 userFactoryRegistryKey;
    bytes32 agreementFactoryRegistryKey;

    event ContentListCreated(
        uint _content_listId,
        uint _content_listOwnerId,
        bool _isPrivate,
        bool _isAlbum,
        uint[] _digital_contentIds
    );

    event ContentListDeleted(uint _content_listId);

    event ContentListAgreementAdded(
        uint _content_listId,
        uint _addedAgreementId
    );

    event ContentListAgreementDeleted(
        uint _content_listId,
        uint _deletedAgreementId,
        uint _deletedAgreementTimestamp
    );

    event ContentListAgreementsOrdered(
        uint _content_listId,
        uint[] _orderedAgreementIds
    );

    event ContentListNameUpdated(
        uint _content_listId,
        string _updatedContentListName
    );

    event ContentListPrivacyUpdated(
        uint _content_listId,
        bool _updatedIsPrivate
    );

    event ContentListCoverPhotoUpdated(
        uint _content_listId,
        bytes32 _content_listImageMultihashDigest
    );

    event ContentListDescriptionUpdated(
        uint _content_listId,
        string _content_listDescription
    );

    event ContentListUPCUpdated(
        uint _content_listId,
        bytes32 _content_listUPC
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
        bytes32 _content_listStorageRegistryKey,
        bytes32 _userFactoryRegistryKey,
        bytes32 _digital_contentFactoryRegistryKey,
        uint _networkId
    ) SigningLogic("ContentList Factory", "1", _networkId)
    public {
        require(
            _registryAddress != address(0x00) &&
            _content_listStorageRegistryKey.length != 0 &&
            _userFactoryRegistryKey.length != 0 &&
            _digital_contentFactoryRegistryKey != 0,
            "requires non-zero registryAddress, non-empty _content_listStorageRegistryKey, non-empty _digital_contentFactoryRegistryKey"
        );
        registry = RegistryInterface(_registryAddress);
        contentListStorageRegistryKey = _content_listStorageRegistryKey;
        userFactoryRegistryKey = _userFactoryRegistryKey;
        agreementFactoryRegistryKey = _digital_contentFactoryRegistryKey;
    }

    /*
    Create a new contentList, storing the contents / owner / isAlbum fields in storage.
    These fields are stored since they will be used to determine payments for reposts and
    other contentList/album related actions.
    Every other field, ie. isPrivate, contentList name, etc. are indexed through events only
    */
    function createContentList(
        uint _content_listOwnerId,
        string calldata _content_listName,
        bool _isPrivate,
        bool _isAlbum,
        uint[] calldata _digital_contentIds,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (uint newContentListId)
    {
        require(
            _digital_contentIds.length < AGREEMENT_LIMIT,
            "Maximum of 200 agreements in a contentList currently supported"
        );

        bytes32 signatureDigest = generateCreateContentListRequestSchemaHash(
            _content_listOwnerId,
            _content_listName,
            _isPrivate,
            _isAlbum,
            _digital_contentIds,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _content_listOwnerId); // will revert if false

        /* Validate that each digital_content exists before creating the contentList */
        for (uint i = 0; i < _digital_contentIds.length; i++) {
            bool agreementExists = AgreementFactoryInterface(
                registry.getContract(agreementFactoryRegistryKey)
            ).agreementExists(_digital_contentIds[i]);
            require(agreementExists, "Expected valid digital_content id");
        }

        uint contentListId = ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).createContentList(_content_listOwnerId, _isAlbum, _digital_contentIds);

        emit ContentListCreated(
            contentListId,
            _content_listOwnerId,
            _isPrivate,
            _isAlbum,
            _digital_contentIds
        );

        // Emit second event with contentList name
        emit ContentListNameUpdated(contentListId, _content_listName);

        return contentListId;
    }

    /**
    * @notice deletes existing contentList given its ID
    * @notice does not delete contentList from storage by design
    * @param _content_listId - id of contentList to delete
    */
    function deleteContentList(
        uint _content_listId,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDeleteContentListSchemaHash(_content_listId, _nonce);
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content_listId);   // will revert if false

        emit ContentListDeleted(_content_listId);
        return true;
    }

    function addContentListAgreement(
        uint _content_listId,
        uint _addedAgreementId,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateAddContentListAgreementSchemaHash(
            _content_listId,
            _addedAgreementId,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content_listId);   // will revert if false

        bool agreementExists = AgreementFactoryInterface(
            registry.getContract(agreementFactoryRegistryKey)
        ).agreementExists(_addedAgreementId);
        require(agreementExists, "Expected valid digital_content id");

        ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).addContentListAgreement(_content_listId, _addedAgreementId);

        emit ContentListAgreementAdded(_content_listId, _addedAgreementId);
    }

    /* delete digital_content from contentList */
    function deleteContentListAgreement(
        uint _content_listId,
        uint _deletedAgreementId,
        uint _deletedAgreementTimestamp,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateDeleteContentListAgreementSchemaHash(
            _content_listId,
            _deletedAgreementId,
            _deletedAgreementTimestamp,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content_listId);   // will revert if false

        bool isValidAgreement = this.isAgreementInContentList(_content_listId, _deletedAgreementId);
        require(isValidAgreement == true, "Expect valid digital_content for delete operation");

        ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).deleteContentListAgreement(_content_listId, _deletedAgreementId);

        emit ContentListAgreementDeleted(_content_listId, _deletedAgreementId, _deletedAgreementTimestamp);
    }

    /* order contentList agreements */
    function orderContentListAgreements(
        uint _content_listId,
        uint[] calldata _digital_contentIds,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        require(
            _digital_contentIds.length < AGREEMENT_LIMIT,
            "Maximum of 200 agreements in a contentList currently supported"
        );

        bytes32 signatureDigest = generateOrderContentListAgreementsRequestSchemaHash(
            _content_listId,
            _digital_contentIds,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content_listId);   // will revert if false

        /* Validate that each digital_content exists in the contentList */
        for (uint i = 0; i < _digital_contentIds.length; i++) {
            bool isValidAgreement = this.isAgreementInContentList(_content_listId, _digital_contentIds[i]);
            require(isValidAgreement, "Expected valid contentList digital_content id");
        }

        emit ContentListAgreementsOrdered(_content_listId, _digital_contentIds);
    }

    function updateContentListName(
        uint _content_listId,
        string calldata _updatedContentListName,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 _signatureDigest = generateUpdateContentListNameRequestSchemaHash(
            _content_listId,
            _updatedContentListName,
            _nonce
        );
        address signer = recoverSigner(_signatureDigest, _subjectSig);
        burnSignatureDigest(_signatureDigest, signer);
        this.callerOwnsContentList(signer, _content_listId);   // will revert if false

        emit ContentListNameUpdated(_content_listId, _updatedContentListName);
    }

    function updateContentListPrivacy(
        uint _content_listId,
        bool _updatedContentListPrivacy,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdateContentListPrivacyRequestSchemaHash(
            _content_listId,
            _updatedContentListPrivacy,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content_listId);   // will revert if false

        emit ContentListPrivacyUpdated(_content_listId, _updatedContentListPrivacy);
    }

    /* update contentList cover photo */
    function updateContentListCoverPhoto(
        uint _content_listId,
        bytes32 _content_listImageMultihashDigest,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdateContentListCoverPhotoSchemaHash(
            _content_listId,
            _content_listImageMultihashDigest,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content_listId);   // will revert if false

        emit ContentListCoverPhotoUpdated(_content_listId, _content_listImageMultihashDigest);
    }

    function updateContentListDescription(
        uint _content_listId,
        string calldata _content_listDescription,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdateContentListDescriptionSchemaHash(
            _content_listId,
            _content_listDescription,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content_listId);   // will revert if false

        emit ContentListDescriptionUpdated(_content_listId, _content_listDescription);
    }

    function updateContentListUPC(
        uint _content_listId,
        bytes32 _updatedContentListUPC,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdateContentListUPCSchemaHash(
            _content_listId,
            _updatedContentListUPC,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content_listId);   // will revert if false

        emit ContentListUPCUpdated(_content_listId, _updatedContentListUPC);
    }

    function contentListExists(uint _content_listId)
    external view returns (bool exists)
    {
        return ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).contentListExists(_content_listId);
    }

    function isAgreementInContentList(
        uint _content_listId,
        uint _digital_contentId
    ) external view returns (bool)
    {
        return ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).isAgreementInContentList(_content_listId, _digital_contentId);
    }

    /** @notice ensures that calling address owns contentList; reverts if not */
    function callerOwnsContentList(
        address _caller,
        uint _content_listId
    ) external view
    {
        // get user id of contentList owner
        uint contentListOwnerId = ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).getContentListOwner(_content_listId);

        // confirm caller owns contentList owner
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(_caller, contentListOwnerId);
    }

    /** REQUEST SCHEMA HASH GENERATORS */
    function generateCreateContentListRequestSchemaHash(
        uint _content_listOwnerId,
        string memory _content_listName,
        bool _isPrivate,
        bool _isAlbum,
        uint[] memory _digital_contentIds,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    CREATE_CONTENT_LIST_TYPEHASH,
                    _content_listOwnerId,
                    keccak256(bytes(_content_listName)),
                    _isPrivate,
                    _isAlbum,
                    keccak256(abi.encode(_digital_contentIds)),
                    _nonce
                )
            )
        );
    }

    function generateDeleteContentListSchemaHash(
        uint _content_listId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_CONTENT_LIST_TYPEHASH,
                    _content_listId,
                    _nonce
                )
            )
        );
    }

    function generateAddContentListAgreementSchemaHash(
        uint _content_listId,
        uint _addedAgreementId,
        bytes32 _nonce
    ) internal view returns(bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    ADD_CONTENT_LIST_AGREEMENT_TYPEHASH,
                    _content_listId,
                    _addedAgreementId,
                    _nonce
                )
            )
        );
    }

    function generateDeleteContentListAgreementSchemaHash(
        uint _content_listId,
        uint _deletedAgreementId,
        uint _deletedAgreementTimestamp,
        bytes32 _nonce
    ) internal view returns(bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_CONTENT_LIST_AGREEMENT_TYPEHASH,
                    _content_listId,
                    _deletedAgreementId,
                    _deletedAgreementTimestamp,
                    _nonce
                )
            )
        );
    }

    function generateOrderContentListAgreementsRequestSchemaHash(
        uint _content_listId,
        uint[] memory _digital_contentIds,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    ORDER_CONTENT_LIST_AGREEMENTS_TYPEHASH,
                    _content_listId,
                    keccak256(abi.encode(_digital_contentIds)),
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListNameRequestSchemaHash(
        uint _content_listId,
        string memory _updatedContentListName,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_NAME_TYPEHASH,
                    _content_listId,
                    keccak256(bytes(_updatedContentListName)),
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListPrivacyRequestSchemaHash(
        uint _content_listId,
        bool _updatedContentListPrivacy,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_PRIVACY_TYPEHASH,
                    _content_listId,
                    _updatedContentListPrivacy,
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListCoverPhotoSchemaHash(
        uint _content_listId,
        bytes32 _content_listImageMultihashDigest,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_COVER_PHOTO_TYPEHASH,
                    _content_listId,
                    _content_listImageMultihashDigest,
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListDescriptionSchemaHash(
        uint _content_listId,
        string memory _content_listDescription,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_DESCRIPTION_TYPEHASH,
                    _content_listId,
                    keccak256(bytes(_content_listDescription)),
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListUPCSchemaHash(
        uint _content_listId,
        bytes32 _content_listUPC,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_UPC_TYPEHASH,
                    _content_listId,
                    _content_listUPC,
                    _nonce
                )
            )
        );
    }
}
