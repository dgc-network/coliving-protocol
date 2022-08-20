pragma solidity ^0.5.0;

import "./registry/RegistryContract.sol";
import "./interface/RegistryInterface.sol";
import "./interface/ContentListStorageInterface.sol";
import "./interface/UserFactoryInterface.sol";
import "./interface/AgreementFactoryInterface.sol";
import "./SigningLogic.sol";


/** @title Contract responsible for managing content list business logic */
contract ContentListFactory is RegistryContract, SigningLogic {

    uint constant AGREEMENT_LIMIT = 200;

    RegistryInterface registry = RegistryInterface(0);
    bytes32 content listStorageRegistryKey;
    bytes32 userFactoryRegistryKey;
    bytes32 agreementFactoryRegistryKey;

    event ContentListCreated(
        uint _content listId,
        uint _content listOwnerId,
        bool _isPrivate,
        bool _isAlbum,
        uint[] _agreementIds
    );

    event ContentListDeleted(uint _content listId);

    event ContentListAgreementAdded(
        uint _content listId,
        uint _addedAgreementId
    );

    event ContentListAgreementDeleted(
        uint _content listId,
        uint _deletedAgreementId,
        uint _deletedAgreementTimestamp
    );

    event ContentListAgreementsOrdered(
        uint _content listId,
        uint[] _orderedAgreementIds
    );

    event ContentListNameUpdated(
        uint _content listId,
        string _updatedContentListName
    );

    event ContentListPrivacyUpdated(
        uint _content listId,
        bool _updatedIsPrivate
    );

    event ContentListCoverPhotoUpdated(
        uint _content listId,
        bytes32 _content listImageMultihashDigest
    );

    event ContentListDescriptionUpdated(
        uint _content listId,
        string _content listDescription
    );

    event ContentListUPCUpdated(
        uint _content listId,
        bytes32 _content listUPC
    );

    bytes32 constant CREATE_CONTENT_LIST_TYPEHASH = keccak256(
        "CreateContentListRequest(uint content listOwnerId,string content listName,bool isPrivate,bool isAlbum,bytes32 agreementIdsHash,bytes32 nonce)"
    );

    bytes32 constant DELETE_CONTENT_LIST_TYPEHASH = keccak256(
        "DeleteContentListRequest(uint content listId,bytes32 nonce)"
    );

    bytes32 constant ADD_CONTENT_LIST_AGREEMENT_TYPEHASH = keccak256(
        "AddContentListAgreementRequest(uint content listId,uint addedAgreementId,bytes32 nonce)"
    );

    bytes32 constant DELETE_CONTENT_LIST_AGREEMENT_TYPEHASH = keccak256(
        "DeleteContentListAgreementRequest(uint content listId,uint deletedAgreementId,uint deletedAgreementTimestamp,bytes32 nonce)"
    );

    bytes32 constant ORDER_CONTENT_LIST_AGREEMENTS_TYPEHASH = keccak256(
        "OrderContentListAgreementsRequest(uint content listId,bytes32 agreementIdsHash,bytes32 nonce)"
    );

    bytes32 constant UPDATE_CONTENT_LIST_NAME_TYPEHASH = keccak256(
        "UpdateContentListNameRequest(uint content listId,string updatedContentListName,bytes32 nonce)"
    );

    bytes32 constant UPDATE_CONTENT_LIST_PRIVACY_TYPEHASH = keccak256(
        "UpdateContentListPrivacyRequest(uint content listId,bool updatedContentListPrivacy,bytes32 nonce)"
    );

    bytes32 constant UPDATE_CONTENT_LIST_COVER_PHOTO_TYPEHASH = keccak256(
        "UpdateContentListCoverPhotoRequest(uint content listId,bytes32 content listImageMultihashDigest,bytes32 nonce)"
    );

    bytes32 constant UPDATE_CONTENT_LIST_DESCRIPTION_TYPEHASH = keccak256(
        "UpdateContentListDescriptionRequest(uint content listId,string content listDescription,bytes32 nonce)"
    );

    bytes32 constant UPDATE_CONTENT_LIST_UPC_TYPEHASH = keccak256(
        "UpdateContentListUPCRequest(uint content listId,bytes32 content listUPC,bytes32 nonce)"
    );

    /** @notice Sets registry address and user factory and content list storage keys */
    constructor(address _registryAddress,
        bytes32 _content listStorageRegistryKey,
        bytes32 _userFactoryRegistryKey,
        bytes32 _agreementFactoryRegistryKey,
        uint _networkId
    ) SigningLogic("ContentList Factory", "1", _networkId)
    public {
        require(
            _registryAddress != address(0x00) &&
            _content listStorageRegistryKey.length != 0 &&
            _userFactoryRegistryKey.length != 0 &&
            _agreementFactoryRegistryKey != 0,
            "requires non-zero registryAddress, non-empty _content listStorageRegistryKey, non-empty _agreementFactoryRegistryKey"
        );
        registry = RegistryInterface(_registryAddress);
        content listStorageRegistryKey = _content listStorageRegistryKey;
        userFactoryRegistryKey = _userFactoryRegistryKey;
        agreementFactoryRegistryKey = _agreementFactoryRegistryKey;
    }

    /*
    Create a new content list, storing the contents / owner / isAlbum fields in storage.
    These fields are stored since they will be used to determine payments for reposts and
    other content list/album related actions.
    Every other field, ie. isPrivate, content list name, etc. are indexed through events only
    */
    function createContentList(
        uint _content listOwnerId,
        string calldata _content listName,
        bool _isPrivate,
        bool _isAlbum,
        uint[] calldata _agreementIds,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (uint newContentListId)
    {
        require(
            _agreementIds.length < AGREEMENT_LIMIT,
            "Maximum of 200 agreements in a content list currently supported"
        );

        bytes32 signatureDigest = generateCreateContentListRequestSchemaHash(
            _content listOwnerId,
            _content listName,
            _isPrivate,
            _isAlbum,
            _agreementIds,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _content listOwnerId); // will revert if false

        /* Validate that each agreement exists before creating the content list */
        for (uint i = 0; i < _agreementIds.length; i++) {
            bool agreementExists = AgreementFactoryInterface(
                registry.getContract(agreementFactoryRegistryKey)
            ).agreementExists(_agreementIds[i]);
            require(agreementExists, "Expected valid agreement id");
        }

        uint content listId = ContentListStorageInterface(
            registry.getContract(content listStorageRegistryKey)
        ).createContentList(_content listOwnerId, _isAlbum, _agreementIds);

        emit ContentListCreated(
            content listId,
            _content listOwnerId,
            _isPrivate,
            _isAlbum,
            _agreementIds
        );

        // Emit second event with content list name
        emit ContentListNameUpdated(content listId, _content listName);

        return content listId;
    }

    /**
    * @notice deletes existing content list given its ID
    * @notice does not delete content list from storage by design
    * @param _content listId - id of content list to delete
    */
    function deleteContentList(
        uint _content listId,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDeleteContentListSchemaHash(_content listId, _nonce);
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content listId);   // will revert if false

        emit ContentListDeleted(_content listId);
        return true;
    }

    function addContentListAgreement(
        uint _content listId,
        uint _addedAgreementId,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateAddContentListAgreementSchemaHash(
            _content listId,
            _addedAgreementId,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content listId);   // will revert if false

        bool agreementExists = AgreementFactoryInterface(
            registry.getContract(agreementFactoryRegistryKey)
        ).agreementExists(_addedAgreementId);
        require(agreementExists, "Expected valid agreement id");

        ContentListStorageInterface(
            registry.getContract(content listStorageRegistryKey)
        ).addContentListAgreement(_content listId, _addedAgreementId);

        emit ContentListAgreementAdded(_content listId, _addedAgreementId);
    }

    /* delete agreement from content list */
    function deleteContentListAgreement(
        uint _content listId,
        uint _deletedAgreementId,
        uint _deletedAgreementTimestamp,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateDeleteContentListAgreementSchemaHash(
            _content listId,
            _deletedAgreementId,
            _deletedAgreementTimestamp,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content listId);   // will revert if false

        bool isValidAgreement = this.isAgreementInContentList(_content listId, _deletedAgreementId);
        require(isValidAgreement == true, "Expect valid agreement for delete operation");

        ContentListStorageInterface(
            registry.getContract(content listStorageRegistryKey)
        ).deleteContentListAgreement(_content listId, _deletedAgreementId);

        emit ContentListAgreementDeleted(_content listId, _deletedAgreementId, _deletedAgreementTimestamp);
    }

    /* order content list agreements */
    function orderContentListAgreements(
        uint _content listId,
        uint[] calldata _agreementIds,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        require(
            _agreementIds.length < AGREEMENT_LIMIT,
            "Maximum of 200 agreements in a content list currently supported"
        );

        bytes32 signatureDigest = generateOrderContentListAgreementsRequestSchemaHash(
            _content listId,
            _agreementIds,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content listId);   // will revert if false

        /* Validate that each agreement exists in the content list */
        for (uint i = 0; i < _agreementIds.length; i++) {
            bool isValidAgreement = this.isAgreementInContentList(_content listId, _agreementIds[i]);
            require(isValidAgreement, "Expected valid content list agreement id");
        }

        emit ContentListAgreementsOrdered(_content listId, _agreementIds);
    }

    function updateContentListName(
        uint _content listId,
        string calldata _updatedContentListName,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 _signatureDigest = generateUpdateContentListNameRequestSchemaHash(
            _content listId,
            _updatedContentListName,
            _nonce
        );
        address signer = recoverSigner(_signatureDigest, _subjectSig);
        burnSignatureDigest(_signatureDigest, signer);
        this.callerOwnsContentList(signer, _content listId);   // will revert if false

        emit ContentListNameUpdated(_content listId, _updatedContentListName);
    }

    function updateContentListPrivacy(
        uint _content listId,
        bool _updatedContentListPrivacy,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdateContentListPrivacyRequestSchemaHash(
            _content listId,
            _updatedContentListPrivacy,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content listId);   // will revert if false

        emit ContentListPrivacyUpdated(_content listId, _updatedContentListPrivacy);
    }

    /* update content list cover photo */
    function updateContentListCoverPhoto(
        uint _content listId,
        bytes32 _content listImageMultihashDigest,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdateContentListCoverPhotoSchemaHash(
            _content listId,
            _content listImageMultihashDigest,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content listId);   // will revert if false

        emit ContentListCoverPhotoUpdated(_content listId, _content listImageMultihashDigest);
    }

    function updateContentListDescription(
        uint _content listId,
        string calldata _content listDescription,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdateContentListDescriptionSchemaHash(
            _content listId,
            _content listDescription,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content listId);   // will revert if false

        emit ContentListDescriptionUpdated(_content listId, _content listDescription);
    }

    function updateContentListUPC(
        uint _content listId,
        bytes32 _updatedContentListUPC,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdateContentListUPCSchemaHash(
            _content listId,
            _updatedContentListUPC,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _content listId);   // will revert if false

        emit ContentListUPCUpdated(_content listId, _updatedContentListUPC);
    }

    function content listExists(uint _content listId)
    external view returns (bool exists)
    {
        return ContentListStorageInterface(
            registry.getContract(content listStorageRegistryKey)
        ).content listExists(_content listId);
    }

    function isAgreementInContentList(
        uint _content listId,
        uint _agreementId
    ) external view returns (bool)
    {
        return ContentListStorageInterface(
            registry.getContract(content listStorageRegistryKey)
        ).isAgreementInContentList(_content listId, _agreementId);
    }

    /** @notice ensures that calling address owns content list; reverts if not */
    function callerOwnsContentList(
        address _caller,
        uint _content listId
    ) external view
    {
        // get user id of content list owner
        uint content listOwnerId = ContentListStorageInterface(
            registry.getContract(content listStorageRegistryKey)
        ).getContentListOwner(_content listId);

        // confirm caller owns content list owner
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(_caller, content listOwnerId);
    }

    /** REQUEST SCHEMA HASH GENERATORS */
    function generateCreateContentListRequestSchemaHash(
        uint _content listOwnerId,
        string memory _content listName,
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
                    _content listOwnerId,
                    keccak256(bytes(_content listName)),
                    _isPrivate,
                    _isAlbum,
                    keccak256(abi.encode(_agreementIds)),
                    _nonce
                )
            )
        );
    }

    function generateDeleteContentListSchemaHash(
        uint _content listId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_CONTENT_LIST_TYPEHASH,
                    _content listId,
                    _nonce
                )
            )
        );
    }

    function generateAddContentListAgreementSchemaHash(
        uint _content listId,
        uint _addedAgreementId,
        bytes32 _nonce
    ) internal view returns(bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    ADD_CONTENT_LIST_AGREEMENT_TYPEHASH,
                    _content listId,
                    _addedAgreementId,
                    _nonce
                )
            )
        );
    }

    function generateDeleteContentListAgreementSchemaHash(
        uint _content listId,
        uint _deletedAgreementId,
        uint _deletedAgreementTimestamp,
        bytes32 _nonce
    ) internal view returns(bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_CONTENT_LIST_AGREEMENT_TYPEHASH,
                    _content listId,
                    _deletedAgreementId,
                    _deletedAgreementTimestamp,
                    _nonce
                )
            )
        );
    }

    function generateOrderContentListAgreementsRequestSchemaHash(
        uint _content listId,
        uint[] memory _agreementIds,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    ORDER_CONTENT_LIST_AGREEMENTS_TYPEHASH,
                    _content listId,
                    keccak256(abi.encode(_agreementIds)),
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListNameRequestSchemaHash(
        uint _content listId,
        string memory _updatedContentListName,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_NAME_TYPEHASH,
                    _content listId,
                    keccak256(bytes(_updatedContentListName)),
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListPrivacyRequestSchemaHash(
        uint _content listId,
        bool _updatedContentListPrivacy,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_PRIVACY_TYPEHASH,
                    _content listId,
                    _updatedContentListPrivacy,
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListCoverPhotoSchemaHash(
        uint _content listId,
        bytes32 _content listImageMultihashDigest,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_COVER_PHOTO_TYPEHASH,
                    _content listId,
                    _content listImageMultihashDigest,
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListDescriptionSchemaHash(
        uint _content listId,
        string memory _content listDescription,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_DESCRIPTION_TYPEHASH,
                    _content listId,
                    keccak256(bytes(_content listDescription)),
                    _nonce
                )
            )
        );
    }

    function generateUpdateContentListUPCSchemaHash(
        uint _content listId,
        bytes32 _content listUPC,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_CONTENT_LIST_UPC_TYPEHASH,
                    _content listId,
                    _content listUPC,
                    _nonce
                )
            )
        );
    }
}
