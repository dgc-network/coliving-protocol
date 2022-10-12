pragma solidity ^0.8.0;

import "./interface/RegistryInterface.sol";
import "./registry/RegistryContract.sol";
import "./interface/UserFactoryInterface.sol";
import "./interface/DigitalContentFactoryInterface.sol";
import "./interface/ContentListFactoryInterface.sol";
import "./SigningLogic.sol";

/** @title Logic contract for Coliving user library features including
* digital_content saves and contentList/album saves */
contract UserLibraryFactory is RegistryContract, SigningLogic {

    //RegistryInterface registry = RegistryInterface(0);
    address _registryAddress;
    RegistryInterface registry = RegistryInterface(_registryAddress);
    bytes32 userFactoryRegistryKey;
    bytes32 digitalContentFactoryRegistryKey;
    bytes32 contentListFactoryRegistryKey;

    event DigitalContentSaveAdded(uint _userId, uint _digital_contentId);
    event DigitalContentSaveDeleted(uint _userId, uint _digital_contentId);
    event ContentListSaveAdded(uint _userId, uint _content_listId);
    event ContentListSaveDeleted(uint _userId, uint _content_listId);

    /* EIP-712 saved signature generation / verification */
    bytes32 constant AGREEMENT_SAVE_REQUEST_TYPEHASH = keccak256(
        "DigitalContentSaveRequest(uint userId,uint digitalContentId,bytes32 nonce)"
    );
    bytes32 constant DELETE_AGREEMENT_SAVE_REQUEST_TYPEHASH = keccak256(
        "DeleteDigitalContentSaveRequest(uint userId,uint digitalContentId,bytes32 nonce)"
    );
    bytes32 constant CONTENT_LIST_SAVE_REQUEST_TYPEHASH = keccak256(
        "ContentListSaveRequest(uint userId,uint contentListId,bytes32 nonce)"
    );
    bytes32 constant DELETE_CONTENT_LIST_SAVE_REQUEST_TYPEHASH = keccak256(
        "DeleteContentListSaveRequest(uint userId,uint contentListId,bytes32 nonce)"
    );

    constructor(address _registryAddress,
        bytes32 _userFactoryRegistryKey,
        bytes32 _digital_contentFactoryRegistryKey,
        bytes32 _content_listFactoryRegistryKey,
        uint _networkId
    ) SigningLogic("User Library Factory", "1", _networkId) public
    {
        require(
            _registryAddress != address(0x00) &&
            _userFactoryRegistryKey.length != 0 &&
            _digital_contentFactoryRegistryKey.length != 0 &&
            _content_listFactoryRegistryKey.length != 0,
            "requires non-zero _registryAddress"
        );

        registry = RegistryInterface(_registryAddress);
        userFactoryRegistryKey = _userFactoryRegistryKey;
        digitalContentFactoryRegistryKey = _digital_contentFactoryRegistryKey;
        contentListFactoryRegistryKey = _content_listFactoryRegistryKey;
    }

    function addDigitalContentSave(
        uint _userId,
        uint _digital_contentId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDigitalContentSaveRequestSchemaHash(
            _userId, _digital_contentId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool digitalContentExists = DigitalContentFactoryInterface(
            registry.getContract(digitalContentFactoryRegistryKey)
        ).digitalContentExists(_digital_contentId);
        require(digitalContentExists == true, "must provide valid digital_content ID");

        emit DigitalContentSaveAdded(_userId, _digital_contentId);
        return true;
    }

    function deleteDigitalContentSave(
        uint _userId,
        uint _digital_contentId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDeleteDigitalContentSaveRequestSchemaHash(
            _userId, _digital_contentId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool digitalContentExists = DigitalContentFactoryInterface(
            registry.getContract(digitalContentFactoryRegistryKey)
        ).digitalContentExists(_digital_contentId);
        require(digitalContentExists == true, "must provide valid digital_content ID");

        emit DigitalContentSaveDeleted(_userId, _digital_contentId);
        return true;
    }

    function addContentListSave(
        uint _userId,
        uint _content_listId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateContentListSaveRequestSchemaHash(
            _userId, _content_listId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool contentListExists = ContentListFactoryInterface(
            registry.getContract(contentListFactoryRegistryKey)
        ).contentListExists(_content_listId);
        require(contentListExists == true, "must provide valid contentList ID");

        emit ContentListSaveAdded(_userId, _content_listId);
        return true;
    }

    function deleteContentListSave(
        uint _userId,
        uint _content_listId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external returns (bool status)
    {
        bytes32 signatureDigest = generateDeleteContentListSaveRequestSchemaHash(
            _userId, _content_listId, _requestNonce
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        UserFactoryInterface(
            registry.getContract(userFactoryRegistryKey)
        ).callerOwnsUser(signer, _userId);  // will revert if false

        bool contentListExists = ContentListFactoryInterface(
            registry.getContract(contentListFactoryRegistryKey)
        ).contentListExists(_content_listId);
        require(contentListExists == true, "must provide valid contentList ID");

        emit ContentListSaveDeleted(_userId, _content_listId);
        return true;
    }

    function generateDeleteContentListSaveRequestSchemaHash(
        uint _userId,
        uint _content_listId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_CONTENT_LIST_SAVE_REQUEST_TYPEHASH,
                    _userId,
                    _content_listId,
                    _nonce
                )
            )
        );
    }

    function generateContentListSaveRequestSchemaHash(
        uint _userId,
        uint _content_listId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    CONTENT_LIST_SAVE_REQUEST_TYPEHASH,
                    _userId,
                    _content_listId,
                    _nonce
                )
            )
        );
    }

    function generateDeleteDigitalContentSaveRequestSchemaHash(
        uint _userId,
        uint _digital_contentId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    DELETE_AGREEMENT_SAVE_REQUEST_TYPEHASH,
                    _userId,
                    _digital_contentId,
                    _nonce
                )
            )
        );
    }

    function generateDigitalContentSaveRequestSchemaHash(
        uint _userId,
        uint _digital_contentId,
        bytes32 _nonce
    ) internal view returns (bytes32)
    {
        return generateSchemaHash(
            keccak256(
                abi.encode(
                    AGREEMENT_SAVE_REQUEST_TYPEHASH,
                    _userId,
                    _digital_contentId,
                    _nonce
                )
            )
        );
    }
}
