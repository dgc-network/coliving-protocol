pragma solidity ^0.8.0;

import "./registry/RegistryContract.sol";
import "./interface/RegistryInterface.sol";
import "./interface/ContentListStorageInterface.sol";
import "./interface/UserFactoryInterface.sol";
import "./interface/DigitalContentFactoryInterface.sol";
import "./SigningLogic.sol";


/** @title Contract responsible for managing contentList business logic */
contract ContentListFactory is RegistryContract, SigningLogic {

    uint constant DIGITAL_CONTENT_LIMIT = 200;

    //RegistryInterface registry = RegistryInterface(0);
    address _registry;
    RegistryInterface registry = RegistryInterface(_registry);
    bytes32 contentListStorageRegistryKey;
    bytes32 userFactoryRegistryKey;
    bytes32 digitalContentFactoryRegistryKey;

    event ContentListCreated(
        uint _contentListId,
        uint _contentListOwnerId,
        bool _isPrivate,
        bool _isAlbum,
        uint[] _digitalContentIds
    );

    event ContentListDeleted(uint _contentListId);

    event ContentListDigitalContentAdded(
        uint _contentListId,
        uint _addedDigitalContentId
    );

    event ContentListDigitalContentDeleted(
        uint _contentListId,
        uint _deletedDigitalContentId,
        uint _deletedDigitalContentTimestamp
    );

    event ContentListDigitalContentsOrdered(
        uint _contentListId,
        uint[] _orderedDigitalContentIds
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
        "CreateContentListRequest(uint contentListOwnerId,string contentListName,bool isPrivate,bool isAlbum,bytes32 digitalContentIdsHash,bytes32 nonce)"
    );

    bytes32 constant DELETE_CONTENT_LIST_TYPEHASH = keccak256(
        "DeleteContentListRequest(uint contentListId,bytes32 nonce)"
    );

    bytes32 constant ADD_CONTENT_LIST_DIGITAL_CONTENT_TYPEHASH = keccak256(
        "AddContentListDigitalContentRequest(uint contentListId,uint addedDigitalContentId,bytes32 nonce)"
    );

    bytes32 constant DELETE_CONTENT_LIST_DIGITAL_CONTENT_TYPEHASH = keccak256(
        "DeleteContentListDigitalContentRequest(uint contentListId,uint deletedDigitalContentId,uint deletedDigitalContentTimestamp,bytes32 nonce)"
    );

    bytes32 constant ORDER_CONTENT_LIST_DIGITAL_CONTENTS_TYPEHASH = keccak256(
        "OrderContentListDigitalContentsRequest(uint contentListId,bytes32 digitalContentIdsHash,bytes32 nonce)"
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
    constructor(
        address _registryAddress,
        bytes32 _contentListStorageRegistryKey,
        bytes32 _userFactoryRegistryKey,
        bytes32 _digitalContentFactoryRegistryKey,
        uint _networkId
    ) SigningLogic("ContentList Factory", "1", _networkId)
    {
        require(
            _registryAddress != address(0x00) &&
            _contentListStorageRegistryKey.length != 0 &&
            _userFactoryRegistryKey.length != 0 &&
            _digitalContentFactoryRegistryKey != 0,
            "requires non-zero registryAddress, non-empty _contentListStorageRegistryKey, non-empty _digitalContentFactoryRegistryKey"
        );
        registry = RegistryInterface(_registryAddress);
        contentListStorageRegistryKey = _contentListStorageRegistryKey;
        userFactoryRegistryKey = _userFactoryRegistryKey;
        digitalContentFactoryRegistryKey = _digitalContentFactoryRegistryKey;
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
        uint[] calldata _digitalContentIds,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (uint newContentListId)
    {
        require(
            _digitalContentIds.length < DIGITAL_CONTENT_LIMIT,
            "Maximum of 200 digitalContents in a contentList currently supported"
        );

        bytes32 signatureDigest = generateCreateContentListRequestSchemaHash(
            _contentListOwnerId,
            _contentListName,
            _isPrivate,
            _isAlbum,
            _digitalContentIds,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _contentListOwnerId); // will revert if false

        /* Validate that each digital_content exists before creating the contentList */
        for (uint i = 0; i < _digitalContentIds.length; i++) {
            bool digitalContentExists = DigitalContentFactoryInterface(
                registry.getContract(digitalContentFactoryRegistryKey)
            ).digitalContentExists(_digitalContentIds[i]);
            require(digitalContentExists, "Expected valid digital_content id");
        }

        uint contentListId = ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).createContentList(_contentListOwnerId, _isAlbum, _digitalContentIds);

        emit ContentListCreated(
            contentListId,
            _contentListOwnerId,
            _isPrivate,
            _isAlbum,
            _digitalContentIds
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

    function addContentListDigitalContent(
        uint _contentListId,
        uint _addedDigitalContentId,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateAddContentListDigitalContentSchemaHash(
            _contentListId,
            _addedDigitalContentId,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _contentListId);   // will revert if false

        bool digitalContentExists = DigitalContentFactoryInterface(
            registry.getContract(digitalContentFactoryRegistryKey)
        ).digitalContentExists(_addedDigitalContentId);
        require(digitalContentExists, "Expected valid digital_content id");

        ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).addContentListDigitalContent(_contentListId, _addedDigitalContentId);

        emit ContentListDigitalContentAdded(_contentListId, _addedDigitalContentId);
    }

    /* delete digital content from contentList */
    function deleteContentListDigitalContent(
        uint _contentListId,
        uint _deletedDigitalContentId,
        uint _deletedDigitalContentTimestamp,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateDeleteContentListDigitalContentSchemaHash(
            _contentListId,
            _deletedDigitalContentId,
            _deletedDigitalContentTimestamp,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _contentListId);   // will revert if false

        bool isValidDigitalContent = this.isDigitalContentInContentList(_contentListId, _deletedDigitalContentId);
        require(isValidDigitalContent == true, "Expect valid digital_content for delete operation");

        ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).deleteContentListDigitalContent(_contentListId, _deletedDigitalContentId);

        emit ContentListDigitalContentDeleted(_contentListId, _deletedDigitalContentId, _deletedDigitalContentTimestamp);
    }

    /* order contentList digitalContents */
    function orderContentListDigitalContents(
        uint _contentListId,
        uint[] calldata _digitalContentIds,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        require(
            _digitalContentIds.length < DIGITAL_CONTENT_LIMIT,
            "Maximum of 200 digitalContents in a contentList currently supported"
        );

        bytes32 signatureDigest = generateOrderContentListDigitalContentsRequestSchemaHash(
            _contentListId,
            _digitalContentIds,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsContentList(signer, _contentListId);   // will revert if false

        /* Validate that each digital_content exists in the contentList */
        for (uint i = 0; i < _digitalContentIds.length; i++) {
            bool isValidDigitalContent = this.isDigitalContentInContentList(_contentListId, _digitalContentIds[i]);
            require(isValidDigitalContent, "Expected valid contentList digital_content id");
        }

        emit ContentListDigitalContentsOrdered(_contentListId, _digitalContentIds);
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

    function isDigitalContentInContentList(
        uint _contentListId,
        uint _digitalContentId
    ) external view returns (bool)
    {
        return ContentListStorageInterface(
            registry.getContract(contentListStorageRegistryKey)
        ).isDigitalContentInContentList(_contentListId, _digitalContentId);
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
        uint[] memory _digitalContentIds,
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
                    keccak256(abi.encode(_digitalContentIds)),
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

    function generateAddContentListDigitalContentSchemaHash(
        uint _contentListId,
        uint _addedDigitalContentId,
        bytes32 _nonce
    ) internal view returns(bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    ADD_CONTENT_LIST_DIGITAL_CONTENT_TYPEHASH,
                    _contentListId,
                    _addedDigitalContentId,
                    _nonce
                )
            )
        );
    }

    function generateDeleteContentListDigitalContentSchemaHash(
        uint _contentListId,
        uint _deletedDigitalContentId,
        uint _deletedDigitalContentTimestamp,
        bytes32 _nonce
    ) internal view returns(bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_CONTENT_LIST_DIGITAL_CONTENT_TYPEHASH,
                    _contentListId,
                    _deletedDigitalContentId,
                    _deletedDigitalContentTimestamp,
                    _nonce
                )
            )
        );
    }

    function generateOrderContentListDigitalContentsRequestSchemaHash(
        uint _contentListId,
        uint[] memory _digitalContentIds,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    ORDER_CONTENT_LIST_DIGITAL_CONTENTS_TYPEHASH,
                    _contentListId,
                    keccak256(abi.encode(_digitalContentIds)),
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
