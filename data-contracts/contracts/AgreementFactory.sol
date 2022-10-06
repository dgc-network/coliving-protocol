pragma solidity ^0.8.0;

import "./interface/UserFactoryInterface.sol";
import "./registry/RegistryContract.sol";
import "./interface/AgreementStorageInterface.sol";
import "./interface/RegistryInterface.sol";
import "./SigningLogic.sol";


/** @title Contract responsible for managing agreement business logic */
contract AgreementFactory is RegistryContract, SigningLogic {

    RegistryInterface registry = RegistryInterface(0);
    //RegistryInterface registry = RegistryInterface();
    bytes32 userFactoryRegistryKey;
    bytes32 agreementStorageRegistryKey;

    event NewAgreement(
        uint _id,
        uint _agreementOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize
    );
    event UpdateAgreement(
        uint _agreementId,
        uint _agreementOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize
    );
    event AgreementDeleted(uint _agreementId);

    bytes32 constant ADD_AGREEMENT_REQUEST_TYPEHASH = keccak256(
        "AddAgreementRequest(uint agreementOwnerId,bytes32 multihashDigest,uint8 multihashHashFn,uint8 multihashSize,bytes32 nonce)"
    );
    bytes32 constant UPDATE_AGREEMENT_REQUEST_TYPEHASH = keccak256(
        "UpdateAgreementRequest(uint agreementId,uint agreementOwnerId,bytes32 multihashDigest,uint8 multihashHashFn,uint8 multihashSize,bytes32 nonce)"
    );
    bytes32 constant DELETE_AGREEMENT_REQUEST_TYPEHASH = keccak256(
        "DeleteAgreementRequest(uint agreementId,bytes32 nonce)"
    );

    /**
    * @notice Sets registry address and user factory and agreement storage keys
    */
    constructor(
        address _registryAddress,
        bytes32 _agreementStorageRegistryKey,
        bytes32 _userFactoryRegistryKey,
        uint _networkId
    ) SigningLogic("Agreement Factory", "1", _networkId) public {
        require(
            _registryAddress != address(0x00) &&
            _agreementStorageRegistryKey.length != 0 && _userFactoryRegistryKey.length != 0,
            "requires non-zero _registryAddress, non-empty _agreementStorageRegistryKey, non-empty _userFactoryRegistryKey"
        );
        registry = RegistryInterface(_registryAddress);
        userFactoryRegistryKey = _userFactoryRegistryKey;
        agreementStorageRegistryKey = _agreementStorageRegistryKey;
    }

    function agreementExists(uint _id) external view returns (bool exists) {
        return AgreementStorageInterface(
            registry.getContract(agreementStorageRegistryKey)
        ).agreementExists(_id);
    }

    /**
    * @notice adds a new agreement to AgreementStorage
    * @param _agreementOwnerId - id of the agreement's owner from the UserFactory
    * @param _multihashDigest - metadata multihash digest
    * @param _multihashHashFn - hash function used to generate multihash
    * @param _multihashSize - size of digest
    * TODO(roneilr): stop saving multihash information to chain (wasteful of gas)
    */
    function addAgreement(
        uint _agreementOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (uint)
    {
        bytes32 signatureDigest = generateAddAgreementRequestSchemaHash(
            _agreementOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _agreementOwnerId);    // will revert if false

        uint agreementId = AgreementStorageInterface(
            registry.getContract(agreementStorageRegistryKey)
        ).addAgreement(_agreementOwnerId, _multihashDigest, _multihashHashFn, _multihashSize);

        emit NewAgreement(
            agreementId,
            _agreementOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize
        );
        return agreementId;
    }

    /**
    * @notice Updates an existing agreement in AgreementStorage
    * @param _agreementId - id of agreement to update
    * @param _agreementOwnerId - id of the agreement's creator from the CreatorFactory
    * @param _multihashDigest - metadata multihash digest
    * @param _multihashHashFn - hash function used to generate multihash
    * @param _multihashSize - size of digest
    */
    function updateAgreement(
        uint _agreementId,
        uint _agreementOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (bool)
    {
        bytes32 signatureDigest = generateUpdateAgreementRequestSchemaHash(
            _agreementId,
            _agreementOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsAgreement(signer, _agreementId); // will revert if false

        bool agreementUpdated = AgreementStorageInterface(
            registry.getContract(agreementStorageRegistryKey)
        ).updateAgreement(
            _agreementId,
            _agreementOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize
        );

        emit UpdateAgreement(
            _agreementId,
            _agreementOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize
        );
        return agreementUpdated;
    }

    /**
    * @notice deletes existing agreement given its ID
    * @notice does not delete agreement from storage by design
    * @param _agreementId - id of agreement to delete
    */
    function deleteAgreement(
        uint _agreementId,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDeleteAgreementRequestSchemaHash(_agreementId, _nonce);
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsAgreement(signer, _agreementId); // will revert if false

        emit AgreementDeleted(_agreementId);
        return true;
    }

    /** @notice ensures that calling address owns agreement; reverts if not */
    function callerOwnsAgreement(address _caller, uint _agreementId) external view {
        // get user id of agreement owner
        (uint agreementOwnerId,,,) = AgreementStorageInterface(
            registry.getContract(agreementStorageRegistryKey)
        ).getAgreement(_agreementId);

        // confirm caller owns agreement owner
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(_caller, agreementOwnerId);    // will revert if false
    }

    /**
    * @notice returns the user and location of a agreement given its id
    * @param _id - id of the agreement
    */
    function getAgreement(uint _id) external view returns (
        uint agreementOwnerId, bytes32 multihashDigest, uint8 multihashHashFn, uint8 multihashSize)
    {
        return AgreementStorageInterface(
            registry.getContract(agreementStorageRegistryKey)
        ).getAgreement(_id);
    }

    function generateAddAgreementRequestSchemaHash(
        uint _agreementOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    ADD_AGREEMENT_REQUEST_TYPEHASH,
                    _agreementOwnerId,
                    _multihashDigest,
                    _multihashHashFn,
                    _multihashSize,
                    _nonce
                )
            )
        );
    }

    function generateUpdateAgreementRequestSchemaHash(
        uint _agreementId,
        uint _agreementOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_AGREEMENT_REQUEST_TYPEHASH,
                    _agreementId,
                    _agreementOwnerId,
                    _multihashDigest,
                    _multihashHashFn,
                    _multihashSize,
                    _nonce
                )
            )
        );
    }

    function generateDeleteAgreementRequestSchemaHash(
        uint _agreementId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_AGREEMENT_REQUEST_TYPEHASH,
                    _agreementId,
                    _nonce
                )
            )
        );
    }
}
