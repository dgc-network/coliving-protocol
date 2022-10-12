pragma solidity ^0.8.0;

import "./interface/UserFactoryInterface.sol";
import "./registry/RegistryContract.sol";
import "./interface/DigitalContentStorageInterface.sol";
import "./interface/RegistryInterface.sol";
import "./SigningLogic.sol";


/** @title Contract responsible for managing digital_content business logic */
contract DigitalContentFactory is RegistryContract, SigningLogic {

    //RegistryInterface registry = RegistryInterface(0);
    address _registryAddress;
    RegistryInterface registry = RegistryInterface(_registryAddress);
    bytes32 userFactoryRegistryKey;
    bytes32 digitalContentStorageRegistryKey;

    event NewDigitalContent(
        uint _id,
        uint _digital_contentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize
    );
    event UpdateDigitalContent(
        uint _digital_contentId,
        uint _digital_contentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize
    );
    event DigitalContentDeleted(uint _digital_contentId);

    bytes32 constant ADD_AGREEMENT_REQUEST_TYPEHASH = keccak256(
        "AddDigitalContentRequest(uint digitalContentOwnerId,bytes32 multihashDigest,uint8 multihashHashFn,uint8 multihashSize,bytes32 nonce)"
    );
    bytes32 constant UPDATE_AGREEMENT_REQUEST_TYPEHASH = keccak256(
        "UpdateDigitalContentRequest(uint digitalContentId,uint digitalContentOwnerId,bytes32 multihashDigest,uint8 multihashHashFn,uint8 multihashSize,bytes32 nonce)"
    );
    bytes32 constant DELETE_AGREEMENT_REQUEST_TYPEHASH = keccak256(
        "DeleteDigitalContentRequest(uint digitalContentId,bytes32 nonce)"
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
        digitalContentStorageRegistryKey = _digital_contentStorageRegistryKey;
    }

    function digitalContentExists(uint _id) external view returns (bool exists) {
        return DigitalContentStorageInterface(
            registry.getContract(digitalContentStorageRegistryKey)
        ).digitalContentExists(_id);
    }

    /**
    * @notice adds a new digital_content to DigitalContentStorage
    * @param _digital_contentOwnerId - id of the digital_content's owner from the UserFactory
    * @param _multihashDigest - metadata multihash digest
    * @param _multihashHashFn - hash function used to generate multihash
    * @param _multihashSize - size of digest
    * TODO(roneilr): stop saving multihash information to chain (wasteful of gas)
    */
    function addDigitalContent(
        uint _digital_contentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (uint)
    {
        bytes32 signatureDigest = generateAddDigitalContentRequestSchemaHash(
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

        uint digitalContentId = DigitalContentStorageInterface(
            registry.getContract(digitalContentStorageRegistryKey)
        ).addDigitalContent(_digital_contentOwnerId, _multihashDigest, _multihashHashFn, _multihashSize);

        emit NewDigitalContent(
            digitalContentId,
            _digital_contentOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize
        );
        return digitalContentId;
    }

    /**
    * @notice Updates an existing digital_content in DigitalContentStorage
    * @param _digital_contentId - id of digital_content to update
    * @param _digital_contentOwnerId - id of the digital_content's creator from the CreatorFactory
    * @param _multihashDigest - metadata multihash digest
    * @param _multihashHashFn - hash function used to generate multihash
    * @param _multihashSize - size of digest
    */
    function updateDigitalContent(
        uint _digital_contentId,
        uint _digital_contentOwnerId,
        bytes32 _multihashDigest,
        uint8 _multihashHashFn,
        uint8 _multihashSize,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (bool)
    {
        bytes32 signatureDigest = generateUpdateDigitalContentRequestSchemaHash(
            _digital_contentId,
            _digital_contentOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize,
            _nonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsDigitalContent(signer, _digital_contentId); // will revert if false

        bool digitalContentUpdated = DigitalContentStorageInterface(
            registry.getContract(digitalContentStorageRegistryKey)
        ).updateDigitalContent(
            _digital_contentId,
            _digital_contentOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize
        );

        emit UpdateDigitalContent(
            _digital_contentId,
            _digital_contentOwnerId,
            _multihashDigest,
            _multihashHashFn,
            _multihashSize
        );
        return digitalContentUpdated;
    }

    /**
    * @notice deletes existing digital_content given its ID
    * @notice does not delete digital_content from storage by design
    * @param _digital_contentId - id of digital_content to delete
    */
    function deleteDigitalContent(
        uint _digital_contentId,
        bytes32 _nonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDeleteDigitalContentRequestSchemaHash(_digital_contentId, _nonce);
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        this.callerOwnsDigitalContent(signer, _digital_contentId); // will revert if false

        emit DigitalContentDeleted(_digital_contentId);
        return true;
    }

    /** @notice ensures that calling address owns digital_content; reverts if not */
    function callerOwnsDigitalContent(address _caller, uint _digital_contentId) external view {
        // get user id of digital_content owner
        (uint digitalContentOwnerId,,,) = DigitalContentStorageInterface(
            registry.getContract(digitalContentStorageRegistryKey)
        ).getDigitalContent(_digital_contentId);

        // confirm caller owns digital_content owner
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(_caller, digitalContentOwnerId);    // will revert if false
    }

    /**
    * @notice returns the user and location of a digital_content given its id
    * @param _id - id of the digital_content
    */
    function getDigitalContent(uint _id) external view returns (
        uint digitalContentOwnerId, bytes32 multihashDigest, uint8 multihashHashFn, uint8 multihashSize)
    {
        return DigitalContentStorageInterface(
            registry.getContract(digitalContentStorageRegistryKey)
        ).getDigitalContent(_id);
    }

    function generateAddDigitalContentRequestSchemaHash(
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

    function generateUpdateDigitalContentRequestSchemaHash(
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

    function generateDeleteDigitalContentRequestSchemaHash(
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
