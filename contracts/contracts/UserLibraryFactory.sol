pragma solidity ^0.5.0;

import "./interface/RegistryInterface.sol";
import "./registry/RegistryContract.sol";
import "./interface/UserFactoryInterface.sol";
import "./interface/AgreementFactoryInterface.sol";
import "./interface/PlaylistFactoryInterface.sol";
import "./SigningLogic.sol";


/** @title Logic contract for Coliving user library features including
* agreement saves and playlist/album saves */
contract UserLibraryFactory is RegistryContract, SigningLogic {

    RegistryInterface registry = RegistryInterface(0);
    bytes32 userFactoryRegistryKey;
    bytes32 agreementFactoryRegistryKey;
    bytes32 playlistFactoryRegistryKey;

    event AgreementSaveAdded(uint _userId, uint _agreementId);
    event AgreementSaveDeleted(uint _userId, uint _agreementId);
    event PlaylistSaveAdded(uint _userId, uint _playlistId);
    event PlaylistSaveDeleted(uint _userId, uint _playlistId);

    /* EIP-712 saved signature generation / verification */
    bytes32 constant AGREEMENT_SAVE_REQUEST_TYPEHASH = keccak256(
        "AgreementSaveRequest(uint userId,uint agreementId,bytes32 nonce)"
    );
    bytes32 constant DELETE_AGREEMENT_SAVE_REQUEST_TYPEHASH = keccak256(
        "DeleteAgreementSaveRequest(uint userId,uint agreementId,bytes32 nonce)"
    );
    bytes32 constant PLAYLIST_SAVE_REQUEST_TYPEHASH = keccak256(
        "PlaylistSaveRequest(uint userId,uint playlistId,bytes32 nonce)"
    );
    bytes32 constant DELETE_PLAYLIST_SAVE_REQUEST_TYPEHASH = keccak256(
        "DeletePlaylistSaveRequest(uint userId,uint playlistId,bytes32 nonce)"
    );

    constructor(address _registryAddress,
        bytes32 _userFactoryRegistryKey,
        bytes32 _agreementFactoryRegistryKey,
        bytes32 _playlistFactoryRegistryKey,
        uint _networkId
    ) SigningLogic("User Library Factory", "1", _networkId) public
    {
        require(
            _registryAddress != address(0x00) &&
            _userFactoryRegistryKey.length != 0 &&
            _agreementFactoryRegistryKey.length != 0 &&
            _playlistFactoryRegistryKey.length != 0,
            "requires non-zero _registryAddress"
        );

        registry = RegistryInterface(_registryAddress);
        userFactoryRegistryKey = _userFactoryRegistryKey;
        agreementFactoryRegistryKey = _agreementFactoryRegistryKey;
        playlistFactoryRegistryKey = _playlistFactoryRegistryKey;
    }

    function addAgreementSave(
        uint _userId,
        uint _agreementId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateAgreementSaveRequestSchemaHash(
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

        emit AgreementSaveAdded(_userId, _agreementId);
        return true;
    }

    function deleteAgreementSave(
        uint _userId,
        uint _agreementId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDeleteAgreementSaveRequestSchemaHash(
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

        emit AgreementSaveDeleted(_userId, _agreementId);
        return true;
    }

    function addPlaylistSave(
        uint _userId,
        uint _playlistId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generatePlaylistSaveRequestSchemaHash(
            _userId, _playlistId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool playlistExists = PlaylistFactoryInterface(
            registry.getContract(playlistFactoryRegistryKey)
        ).playlistExists(_playlistId);
        require(playlistExists == true, "must provide valid playlist ID");

        emit PlaylistSaveAdded(_userId, _playlistId);
        return true;
    }

    function deletePlaylistSave(
        uint _userId,
        uint _playlistId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDeletePlaylistSaveRequestSchemaHash(
            _userId, _playlistId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool playlistExists = PlaylistFactoryInterface(
            registry.getContract(playlistFactoryRegistryKey)
        ).playlistExists(_playlistId);
        require(playlistExists == true, "must provide valid playlist ID");

        emit PlaylistSaveDeleted(_userId, _playlistId);
        return true;
    }

    function generateDeletePlaylistSaveRequestSchemaHash(
        uint _userId,
        uint _playlistId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_PLAYLIST_SAVE_REQUEST_TYPEHASH,
                    _userId,
                    _playlistId,
                    _nonce
                )
            )
        );
    }

    function generatePlaylistSaveRequestSchemaHash(
        uint _userId,
        uint _playlistId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    PLAYLIST_SAVE_REQUEST_TYPEHASH,
                    _userId,
                    _playlistId,
                    _nonce
                )
            )
        );
    }

    function generateDeleteAgreementSaveRequestSchemaHash(
        uint _userId,
        uint _agreementId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_AGREEMENT_SAVE_REQUEST_TYPEHASH,
                    _userId,
                    _agreementId,
                    _nonce
                )
            )
        );
    }

    function generateAgreementSaveRequestSchemaHash(
        uint _userId,
        uint _agreementId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    AGREEMENT_SAVE_REQUEST_TYPEHASH,
                    _userId,
                    _agreementId,
                    _nonce
                )
            )
        );
    }
}
