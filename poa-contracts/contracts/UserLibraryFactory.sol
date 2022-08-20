pragma solidity ^0.5.0;

import "./interface/RegistryInterface.sol";
import "./registry/RegistryContract.sol";
import "./interface/UserFactoryInterface.sol";
import "./interface/AgreementFactoryInterface.sol";
import "./interface/ContentListFactoryInterface.sol";
import "./SigningLogic.sol";


/** @title Logic contract for Coliving user library features including
* agreement saves and contentList/album saves */
contract UserLibraryFactory is RegistryContract, SigningLogic {

    RegistryInterface registry = RegistryInterface(0);
    bytes32 userFactoryRegistryKey;
    bytes32 agreementFactoryRegistryKey;
    bytes32 contentListFactoryRegistryKey;

    event AgreementSaveAdded(uint _userId, uint _agreementId);
    event AgreementSaveDeleted(uint _userId, uint _agreementId);
    event ContentListSaveAdded(uint _userId, uint _contentListId);
    event ContentListSaveDeleted(uint _userId, uint _contentListId);

    /* EIP-712 saved signature generation / verification */
    bytes32 constant AGREEMENT_SAVE_REQUEST_TYPEHASH = keccak256(
        "AgreementSaveRequest(uint userId,uint agreementId,bytes32 nonce)"
    );
    bytes32 constant DELETE_AGREEMENT_SAVE_REQUEST_TYPEHASH = keccak256(
        "DeleteAgreementSaveRequest(uint userId,uint agreementId,bytes32 nonce)"
    );
    bytes32 constant CONTENT_LIST_SAVE_REQUEST_TYPEHASH = keccak256(
        "ContentListSaveRequest(uint userId,uint contentListId,bytes32 nonce)"
    );
    bytes32 constant DELETE_CONTENT_LIST_SAVE_REQUEST_TYPEHASH = keccak256(
        "DeleteContentListSaveRequest(uint userId,uint contentListId,bytes32 nonce)"
    );

    constructor(address _registryAddress,
        bytes32 _userFactoryRegistryKey,
        bytes32 _agreementFactoryRegistryKey,
        bytes32 _contentListFactoryRegistryKey,
        uint _networkId
    ) SigningLogic("User Library Factory", "1", _networkId) public
    {
        require(
            _registryAddress != address(0x00) &&
            _userFactoryRegistryKey.length != 0 &&
            _agreementFactoryRegistryKey.length != 0 &&
            _contentListFactoryRegistryKey.length != 0,
            "requires non-zero _registryAddress"
        );

        registry = RegistryInterface(_registryAddress);
        userFactoryRegistryKey = _userFactoryRegistryKey;
        agreementFactoryRegistryKey = _agreementFactoryRegistryKey;
        contentListFactoryRegistryKey = _contentListFactoryRegistryKey;
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

    function addContentListSave(
        uint _userId,
        uint _contentListId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateContentListSaveRequestSchemaHash(
            _userId, _contentListId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool contentListExists = ContentListFactoryInterface(
            registry.getContract(contentListFactoryRegistryKey)
        ).contentListExists(_contentListId);
        require(contentListExists == true, "must provide valid contentList ID");

        emit ContentListSaveAdded(_userId, _contentListId);
        return true;
    }

    function deleteContentListSave(
        uint _userId,
        uint _contentListId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDeleteContentListSaveRequestSchemaHash(
            _userId, _contentListId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool contentListExists = ContentListFactoryInterface(
            registry.getContract(contentListFactoryRegistryKey)
        ).contentListExists(_contentListId);
        require(contentListExists == true, "must provide valid contentList ID");

        emit ContentListSaveDeleted(_userId, _contentListId);
        return true;
    }

    function generateDeleteContentListSaveRequestSchemaHash(
        uint _userId,
        uint _contentListId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_CONTENT_LIST_SAVE_REQUEST_TYPEHASH,
                    _userId,
                    _contentListId,
                    _nonce
                )
            )
        );
    }

    function generateContentListSaveRequestSchemaHash(
        uint _userId,
        uint _contentListId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    CONTENT_LIST_SAVE_REQUEST_TYPEHASH,
                    _userId,
                    _contentListId,
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
