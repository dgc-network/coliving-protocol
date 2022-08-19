pragma solidity ^0.5.0;

import "./registry/RegistryContract.sol";
import "./interface/RegistryInterface.sol";
import "./interface/PlaylistStorageInterface.sol";
import "./interface/UserFactoryInterface.sol";
import "./interface/AgreementFactoryInterface.sol";
import "./SigningLogic.sol";


/** @title Contract responsible for managing playlist business logic */
contract PlaylistFactory is RegistryContract, SigningLogic {

    uint constant AGREEMENT_LIMIT = 200;

    RegistryInterface registry = RegistryInterface(0);
    bytes32 playlistStorageRegistryKey;
    bytes32 userFactoryRegistryKey;
    bytes32 agreementFactoryRegistryKey;

    event PlaylistCreated(
        uint _playlistId,
        uint _playlistOwnerId,
        bool _isPrivate,
        bool _isAlbum,
        uint[] _agreementIds
    );

    event PlaylistDeleted(uint _playlistId);

    event PlaylistAgreementAdded(
        uint _playlistId,
        uint _addedAgreementId
    );

    event PlaylistAgreementDeleted(
        uint _playlistId,
        uint _deletedAgreementId,
        uint _deletedAgreementTimestamp
    );

    event PlaylistAgreementsOrdered(
        uint _playlistId,
        uint[] _orderedAgreementIds
    );

    event PlaylistNameUpdated(
        uint _playlistId,
        string _updatedPlaylistName
    );

    event PlaylistPrivacyUpdated(
        uint _playlistId,
        bool _updatedIsPrivate
    );

    event PlaylistCoverPhotoUpdated(
        uint _playlistId,
        bytes32 _playlistImageMultihashDigest
    );

    event PlaylistDescriptionUpdated(
        uint _playlistId,
        string _playlistDescription
    );

    event PlaylistUPCUpdated(
        uint _playlistId,
        bytes32 _playlistUPC
    );

    bytes32 constant CREATE_PLAYLIST_TYPEHASH = keccak256(
        "CreatePlaylistRequest(uint playlistOwnerId,string playlistName,bool isPrivate,bool isAlbum,bytes32 agreementIdsHash,bytes32 nonce)"
    );

    bytes32 constant DELETE_PLAYLIST_TYPEHASH = keccak256(
        "DeletePlaylistRequest(uint playlistId,bytes32 nonce)"
    );

    bytes32 constant ADD_PLAYLIST_AGREEMENT_TYPEHASH = keccak256(
        "AddPlaylistAgreementRequest(uint playlistId,uint addedAgreementId,bytes32 nonce)"
    );

    bytes32 constant DELETE_PLAYLIST_AGREEMENT_TYPEHASH = keccak256(
        "DeletePlaylistAgreementRequest(uint playlistId,uint deletedAgreementId,uint deletedAgreementTimestamp,bytes32 nonce)"
    );

    bytes32 constant ORDER_PLAYLIST_AGREEMENTS_TYPEHASH = keccak256(
        "OrderPlaylistAgreementsRequest(uint playlistId,bytes32 agreementIdsHash,bytes32 nonce)"
    );

    bytes32 constant UPDATE_PLAYLIST_NAME_TYPEHASH = keccak256(
        "UpdatePlaylistNameRequest(uint playlistId,string updatedPlaylistName,bytes32 nonce)"
    );

    bytes32 constant UPDATE_PLAYLIST_PRIVACY_TYPEHASH = keccak256(
        "UpdatePlaylistPrivacyRequest(uint playlistId,bool updatedPlaylistPrivacy,bytes32 nonce)"
    );

    bytes32 constant UPDATE_PLAYLIST_COVER_PHOTO_TYPEHASH = keccak256(
        "UpdatePlaylistCoverPhotoRequest(uint playlistId,bytes32 playlistImageMultihashDigest,bytes32 nonce)"
    );

    bytes32 constant UPDATE_PLAYLIST_DESCRIPTION_TYPEHASH = keccak256(
        "UpdatePlaylistDescriptionRequest(uint playlistId,string playlistDescription,bytes32 nonce)"
    );

    bytes32 constant UPDATE_PLAYLIST_UPC_TYPEHASH = keccak256(
        "UpdatePlaylistUPCRequest(uint playlistId,bytes32 playlistUPC,bytes32 nonce)"
    );

    /** @notice Sets registry address and user factory and playlist storage keys */
    constructor(address _registryAddress,
        bytes32 _playlistStorageRegistryKey,
        bytes32 _userFactoryRegistryKey,
        bytes32 _agreementFactoryRegistryKey,
        uint _networkId
    ) SigningLogic("Playlist Factory", "1", _networkId)
    public {
        require(
            _registryAddress != address(0x00) &&
            _playlistStorageRegistryKey.length != 0 &&
            _userFactoryRegistryKey.length != 0 &&
            _agreementFactoryRegistryKey != 0,
            "requires non-zero registryAddress, non-empty _playlistStorageRegistryKey, non-empty _agreementFactoryRegistryKey"
        );
        registry = RegistryInterface(_registryAddress);
        playlistStorageRegistryKey = _playlistStorageRegistryKey;
        userFactoryRegistryKey = _userFactoryRegistryKey;
        agreementFactoryRegistryKey = _agreementFactoryRegistryKey;
    }

    /*
    Create a new playlist, storing the contents / owner / isAlbum fields in storage.
    These fields are stored since they will be used to determine payments for reposts and
    other playlist/album related actions.
    Every other field, ie. isPrivate, playlist name, etc. are indexed through events only
    */
    function createPlaylist(
        uint _playlistOwnerId,
        string calldata _playlistName,
        bool _isPrivate,
        bool _isAlbum,
        uint[] calldata _agreementIds,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (uint newPlaylistId)
    {
        require(
            _agreementIds.length < AGREEMENT_LIMIT,
            "Maximum of 200 agreements in a playlist currently supported"
        );

        bytes32 signatureDigest = generateCreatePlaylistRequestSchemaHash(
            _playlistOwnerId,
            _playlistName,
            _isPrivate,
            _isAlbum,
            _agreementIds,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _playlistOwnerId); // will revert if false

        /* Validate that each agreement exists before creating the playlist */
        for (uint i = 0; i < _agreementIds.length; i++) {
            bool agreementExists = AgreementFactoryInterface(
                registry.getContract(agreementFactoryRegistryKey)
            ).agreementExists(_agreementIds[i]);
            require(agreementExists, "Expected valid agreement id");
        }

        uint playlistId = PlaylistStorageInterface(
            registry.getContract(playlistStorageRegistryKey)
        ).createPlaylist(_playlistOwnerId, _isAlbum, _agreementIds);

        emit PlaylistCreated(
            playlistId,
            _playlistOwnerId,
            _isPrivate,
            _isAlbum,
            _agreementIds
        );

        // Emit second event with playlist name
        emit PlaylistNameUpdated(playlistId, _playlistName);

        return playlistId;
    }

    /**
    * @notice deletes existing playlist given its ID
    * @notice does not delete playlist from storage by design
    * @param _playlistId - id of playlist to delete
    */
    function deletePlaylist(
        uint _playlistId,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDeletePlaylistSchemaHash(_playlistId, _nonce);
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsPlaylist(signer, _playlistId);   // will revert if false

        emit PlaylistDeleted(_playlistId);
        return true;
    }

    function addPlaylistAgreement(
        uint _playlistId,
        uint _addedAgreementId,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateAddPlaylistAgreementSchemaHash(
            _playlistId,
            _addedAgreementId,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsPlaylist(signer, _playlistId);   // will revert if false

        bool agreementExists = AgreementFactoryInterface(
            registry.getContract(agreementFactoryRegistryKey)
        ).agreementExists(_addedAgreementId);
        require(agreementExists, "Expected valid agreement id");

        PlaylistStorageInterface(
            registry.getContract(playlistStorageRegistryKey)
        ).addPlaylistAgreement(_playlistId, _addedAgreementId);

        emit PlaylistAgreementAdded(_playlistId, _addedAgreementId);
    }

    /* delete agreement from playlist */
    function deletePlaylistAgreement(
        uint _playlistId,
        uint _deletedAgreementId,
        uint _deletedAgreementTimestamp,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateDeletePlaylistAgreementSchemaHash(
            _playlistId,
            _deletedAgreementId,
            _deletedAgreementTimestamp,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsPlaylist(signer, _playlistId);   // will revert if false

        bool isValidAgreement = this.isAgreementInPlaylist(_playlistId, _deletedAgreementId);
        require(isValidAgreement == true, "Expect valid agreement for delete operation");

        PlaylistStorageInterface(
            registry.getContract(playlistStorageRegistryKey)
        ).deletePlaylistAgreement(_playlistId, _deletedAgreementId);

        emit PlaylistAgreementDeleted(_playlistId, _deletedAgreementId, _deletedAgreementTimestamp);
    }

    /* order playlist agreements */
    function orderPlaylistAgreements(
        uint _playlistId,
        uint[] calldata _agreementIds,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        require(
            _agreementIds.length < AGREEMENT_LIMIT,
            "Maximum of 200 agreements in a playlist currently supported"
        );

        bytes32 signatureDigest = generateOrderPlaylistAgreementsRequestSchemaHash(
            _playlistId,
            _agreementIds,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsPlaylist(signer, _playlistId);   // will revert if false

        /* Validate that each agreement exists in the playlist */
        for (uint i = 0; i < _agreementIds.length; i++) {
            bool isValidAgreement = this.isAgreementInPlaylist(_playlistId, _agreementIds[i]);
            require(isValidAgreement, "Expected valid playlist agreement id");
        }

        emit PlaylistAgreementsOrdered(_playlistId, _agreementIds);
    }

    function updatePlaylistName(
        uint _playlistId,
        string calldata _updatedPlaylistName,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 _signatureDigest = generateUpdatePlaylistNameRequestSchemaHash(
            _playlistId,
            _updatedPlaylistName,
            _nonce
        );
        address signer = recoverSigner(_signatureDigest, _subjectSig);
        burnSignatureDigest(_signatureDigest, signer);
        this.callerOwnsPlaylist(signer, _playlistId);   // will revert if false

        emit PlaylistNameUpdated(_playlistId, _updatedPlaylistName);
    }

    function updatePlaylistPrivacy(
        uint _playlistId,
        bool _updatedPlaylistPrivacy,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdatePlaylistPrivacyRequestSchemaHash(
            _playlistId,
            _updatedPlaylistPrivacy,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsPlaylist(signer, _playlistId);   // will revert if false

        emit PlaylistPrivacyUpdated(_playlistId, _updatedPlaylistPrivacy);
    }

    /* update playlist cover photo */
    function updatePlaylistCoverPhoto(
        uint _playlistId,
        bytes32 _playlistImageMultihashDigest,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdatePlaylistCoverPhotoSchemaHash(
            _playlistId,
            _playlistImageMultihashDigest,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsPlaylist(signer, _playlistId);   // will revert if false

        emit PlaylistCoverPhotoUpdated(_playlistId, _playlistImageMultihashDigest);
    }

    function updatePlaylistDescription(
        uint _playlistId,
        string calldata _playlistDescription,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdatePlaylistDescriptionSchemaHash(
            _playlistId,
            _playlistDescription,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsPlaylist(signer, _playlistId);   // will revert if false

        emit PlaylistDescriptionUpdated(_playlistId, _playlistDescription);
    }

    function updatePlaylistUPC(
        uint _playlistId,
        bytes32 _updatedPlaylistUPC,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external
    {
        bytes32 signatureDigest = generateUpdatePlaylistUPCSchemaHash(
            _playlistId,
            _updatedPlaylistUPC,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsPlaylist(signer, _playlistId);   // will revert if false

        emit PlaylistUPCUpdated(_playlistId, _updatedPlaylistUPC);
    }

    function playlistExists(uint _playlistId)
    external view returns (bool exists)
    {
        return PlaylistStorageInterface(
            registry.getContract(playlistStorageRegistryKey)
        ).playlistExists(_playlistId);
    }

    function isAgreementInPlaylist(
        uint _playlistId,
        uint _agreementId
    ) external view returns (bool)
    {
        return PlaylistStorageInterface(
            registry.getContract(playlistStorageRegistryKey)
        ).isAgreementInPlaylist(_playlistId, _agreementId);
    }

    /** @notice ensures that calling address owns playlist; reverts if not */
    function callerOwnsPlaylist(
        address _caller,
        uint _playlistId
    ) external view
    {
        // get user id of playlist owner
        uint playlistOwnerId = PlaylistStorageInterface(
            registry.getContract(playlistStorageRegistryKey)
        ).getPlaylistOwner(_playlistId);

        // confirm caller owns playlist owner
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(_caller, playlistOwnerId);
    }

    /** REQUEST SCHEMA HASH GENERATORS */
    function generateCreatePlaylistRequestSchemaHash(
        uint _playlistOwnerId,
        string memory _playlistName,
        bool _isPrivate,
        bool _isAlbum,
        uint[] memory _agreementIds,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    CREATE_PLAYLIST_TYPEHASH,
                    _playlistOwnerId,
                    keccak256(bytes(_playlistName)),
                    _isPrivate,
                    _isAlbum,
                    keccak256(abi.encode(_agreementIds)),
                    _nonce
                )
            )
        );
    }

    function generateDeletePlaylistSchemaHash(
        uint _playlistId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_PLAYLIST_TYPEHASH,
                    _playlistId,
                    _nonce
                )
            )
        );
    }

    function generateAddPlaylistAgreementSchemaHash(
        uint _playlistId,
        uint _addedAgreementId,
        bytes32 _nonce
    ) internal view returns(bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    ADD_PLAYLIST_AGREEMENT_TYPEHASH,
                    _playlistId,
                    _addedAgreementId,
                    _nonce
                )
            )
        );
    }

    function generateDeletePlaylistAgreementSchemaHash(
        uint _playlistId,
        uint _deletedAgreementId,
        uint _deletedAgreementTimestamp,
        bytes32 _nonce
    ) internal view returns(bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_PLAYLIST_AGREEMENT_TYPEHASH,
                    _playlistId,
                    _deletedAgreementId,
                    _deletedAgreementTimestamp,
                    _nonce
                )
            )
        );
    }

    function generateOrderPlaylistAgreementsRequestSchemaHash(
        uint _playlistId,
        uint[] memory _agreementIds,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    ORDER_PLAYLIST_AGREEMENTS_TYPEHASH,
                    _playlistId,
                    keccak256(abi.encode(_agreementIds)),
                    _nonce
                )
            )
        );
    }

    function generateUpdatePlaylistNameRequestSchemaHash(
        uint _playlistId,
        string memory _updatedPlaylistName,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_PLAYLIST_NAME_TYPEHASH,
                    _playlistId,
                    keccak256(bytes(_updatedPlaylistName)),
                    _nonce
                )
            )
        );
    }

    function generateUpdatePlaylistPrivacyRequestSchemaHash(
        uint _playlistId,
        bool _updatedPlaylistPrivacy,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_PLAYLIST_PRIVACY_TYPEHASH,
                    _playlistId,
                    _updatedPlaylistPrivacy,
                    _nonce
                )
            )
        );
    }

    function generateUpdatePlaylistCoverPhotoSchemaHash(
        uint _playlistId,
        bytes32 _playlistImageMultihashDigest,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_PLAYLIST_COVER_PHOTO_TYPEHASH,
                    _playlistId,
                    _playlistImageMultihashDigest,
                    _nonce
                )
            )
        );
    }

    function generateUpdatePlaylistDescriptionSchemaHash(
        uint _playlistId,
        string memory _playlistDescription,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_PLAYLIST_DESCRIPTION_TYPEHASH,
                    _playlistId,
                    keccak256(bytes(_playlistDescription)),
                    _nonce
                )
            )
        );
    }

    function generateUpdatePlaylistUPCSchemaHash(
        uint _playlistId,
        bytes32 _playlistUPC,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_PLAYLIST_UPC_TYPEHASH,
                    _playlistId,
                    _playlistUPC,
                    _nonce
                )
            )
        );
    }
}
