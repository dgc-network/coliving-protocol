pragma solidity ^0.8.0;

import "./interface/UserFactoryInterface.sol";
import "./registry/RegistryContract.sol";
import "./interface/AgreementStorageInterface.sol";
import "./interface/RegistryInterface.sol";
import "./SigningLogic.sol";


/** @title Contract responsible for managing digital_content business logic */
contract AgreementFactory is RegistryContract, SigningLogic {

    //RegistryInterface registry = RegistryInterface(0);
    address _registryAddress;
    RegistryInterface registry = RegistryInterface(_registryAddress);
    bytes32 userFactoryRegistryKey;
    bytes32 agreementStorageRegistryKey;

    event NewAgreement(
        uint _id,
        uint _digital_contentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize
    );
    event UpdateAgreement(
        uint _digital_contentId,
        uint _digital_contentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize
    );
    event AgreementDeleted(uint _digital_contentId);

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
    * @notice Sets registry address and user factory and digital_content storage keys
    */
    constructor(
        address _registryAddress,
        bytes32 _digital_contentStorageRegistryKey,
        bytes32 _userFactoryRegistryKey,
        uint _networkId
    ) SigningLogic("DigitalContent Factory", "1", _networkId) public {
        require(
            _registryAddress != address(0x00) &&
            _digital_contentStorageRegistryKey.length != 0 && _userFactoryRegistryKey.length != 0,
            "requires non-zero _registryAddress, non-empty _digital_contentStorageRegistryKey, non-empty _userFactoryRegistryKey"
        );
        registry = RegistryInterface(_registryAddress);
        userFactoryRegistryKey = _userFactoryRegistryKey;
        agreementStorageRegistryKey = _digital_contentStorageRegistryKey;
    }

    function agreementExists(uint _id) external view returns (bool exists) {
        return AgreementStorageInterface(
            registry.getContract(agreementStorageRegistryKey)
        ).agreementExists(_id);
    }

    /**
    * @notice adds a new digital_content to AgreementStorage
    * @param _digital_contentOwnerId - id of the digital_content's owner from the UserFactory
    * @param _multihashDigest - metadata multihash digest
    * @param _multihashHashFn - hash function used to generate multihash
    * @param _multihashSize - size of digest
    * TODO(roneilr): stop saving multihash information to chain (wasteful of gas)
    */
    function addAgreement(
        uint _digital_contentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (uint)
    {
        bytes32 signatureDigest = generateAddAgreementRequestSchemaHash(
            _digital_contentOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _digital_contentOwnerId);    // will revert if false

        uint agreementId = AgreementStorageInterface(
            registry.getContract(agreementStorageRegistryKey)
        ).addAgreement(_digital_contentOwnerId, _multihashDigest, _multihashHashFn, _multihashSize);

        emit NewAgreement(
            agreementId,
            _digital_contentOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize
        );
        return agreementId;
    }

    /**
    * @notice Updates an existing digital_content in AgreementStorage
    * @param _digital_contentId - id of digital_content to update
    * @param _digital_contentOwnerId - id of the digital_content's creator from the CreatorFactory
    * @param _multihashDigest - metadata multihash digest
    * @param _multihashHashFn - hash function used to generate multihash
    * @param _multihashSize - size of digest
    */
    function updateAgreement(
        uint _digital_contentId,
        uint _digital_contentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (bool)
    {
        bytes32 signatureDigest = generateUpdateAgreementRequestSchemaHash(
            _digital_contentId,
            _digital_contentOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsAgreement(signer, _digital_contentId); // will revert if false

        bool agreementUpdated = AgreementStorageInterface(
            registry.getContract(agreementStorageRegistryKey)
        ).updateAgreement(
            _digital_contentId,
            _digital_contentOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize
        );

        emit UpdateAgreement(
            _digital_contentId,
            _digital_contentOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize
        );
        return agreementUpdated;
    }

    /**
    * @notice deletes existing digital_content given its ID
    * @notice does not delete digital_content from storage by design
    * @param _digital_contentId - id of digital_content to delete
    */
    function deleteAgreement(
        uint _digital_contentId,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDeleteAgreementRequestSchemaHash(_digital_contentId, _nonce);
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsAgreement(signer, _digital_contentId); // will revert if false

        emit AgreementDeleted(_digital_contentId);
        return true;
    }

    /** @notice ensures that calling address owns digital_content; reverts if not */
    function callerOwnsAgreement(address _caller, uint _digital_contentId) external view {
        // get user id of digital_content owner
        (uint agreementOwnerId,,,) = AgreementStorageInterface(
            registry.getContract(agreementStorageRegistryKey)
        ).getAgreement(_digital_contentId);

        // confirm caller owns digital_content owner
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(_caller, agreementOwnerId);    // will revert if false
    }

    /**
    * @notice returns the user and location of a digital_content given its id
    * @param _id - id of the digital_content
    */
    function getAgreement(uint _id) external view returns (
        uint agreementOwnerId, bytes32 multihashDigest, uint8 multihashHashFn, uint8 multihashSize)
    {
        return AgreementStorageInterface(
            registry.getContract(agreementStorageRegistryKey)
        ).getAgreement(_id);
    }

    function generateAddAgreementRequestSchemaHash(
        uint _digital_contentOwnerId,
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
                    _digital_contentOwnerId,
                    _multihashDigest,
                    _multihashHashFn,
                    _multihashSize,
                    _nonce
                )
            )
        );
    }

    function generateUpdateAgreementRequestSchemaHash(
        uint _digital_contentId,
        uint _digital_contentOwnerId,
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
                    _digital_contentId,
                    _digital_contentOwnerId,
                    _multihashDigest,
                    _multihashHashFn,
                    _multihashSize,
                    _nonce
                )
            )
        );
    }

    function generateDeleteAgreementRequestSchemaHash(
        uint _digital_contentId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_AGREEMENT_REQUEST_TYPEHASH,
                    _digital_contentId,
                    _nonce
                )
            )
        );
    }
}
