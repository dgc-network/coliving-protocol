pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
* @title SigningLogic is contract implementing signature recovery from typed data signatures
* @notice Recovers signatures based on the SignTypedData implementation provided by ethSigUtil
* @dev This contract is inherited by other contracts.
*/
contract SigningLogic {

    bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 domainSeparator;

    // Signatures contain a nonce to make them unique. usedSignatures digitalContents which signatures
    //  have been used so they can't be replayed
    mapping (bytes32 => bool) public usedSignatures;

    struct EIP712Domain {
        string  name;
        string  version;
        uint256 chainId;
        address verifyingContract;
    }

    //constructor (string memory name, string memory version, uint256 chainId) public {
    constructor (string memory name, string memory version, uint256 chainId) {
        domainSeparator = hash(
            EIP712Domain({
                name: name,
                version: version,
                chainId: chainId,
                verifyingContract: address(this)
            })
        );
    }

    function burnSignatureDigest(bytes32 _signatureDigest, address _sender) internal {
        bytes32 _txDataHash = keccak256(abi.encode(_signatureDigest, _sender));
        require(!usedSignatures[_txDataHash], "Signature not unique");
        usedSignatures[_txDataHash] = true;
    }

    function generateSchemaHash(bytes32 requestHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, requestHash));
    }

    function recoverSigner(bytes32 _hash, bytes memory _sig) internal pure returns (address) {
        address signer = ECDSA.recover(_hash, _sig);
        require(signer != address(0), "Signer cannot be contract creation address");
        return signer;
    }

    function hash(EIP712Domain memory eip712Domain) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712DOMAIN_TYPEHASH,
                keccak256(bytes(eip712Domain.name)),
                keccak256(bytes(eip712Domain.version)),
                eip712Domain.chainId,
                eip712Domain.verifyingContract
            )
        );
    }
}
