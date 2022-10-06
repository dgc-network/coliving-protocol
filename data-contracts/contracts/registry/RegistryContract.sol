pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interface/RegistryInterface.sol";

/**
 * @title Parent class to all contracts used to check that a contract is registerable
 * @notice RegistryContract is Ownable so the deployer can re-register it against new registries
 * @dev The Registry uses this to talk to all contracts that inherit from this contract.
 */
contract RegistryContract is Ownable {

    struct Multihash {	
        bytes32 digest;	
        uint8 hashFn;	
        uint8 size;	
    }

    address payable internal registryAddress;

    /// @notice all contracts that inherit from RegistryContract are automatically Ownable()
    /// @dev internal constructor makes RegistryContract abstract
    //constructor() Ownable() internal { }
    constructor() Ownable() { }

    /// @notice only allow storage contracts to be called by the respective factory.
    ///     i.e. AgreementStorage methods can only be invoked by AgreementFactory.
    modifier onlyRegistrant(bytes32 _name) {
        require(
            msg.sender == RegistryInterface(registryAddress).getContract(_name),
            "Requires msg.sender is from contract address registered to _name"
        );
        _;
    }

    function setRegistry(address payable _registryAddress) external {
        require(
            registryAddress == address(0x00) ||
            registryAddress == msg.sender ||
            this.owner() == msg.sender,
            "Can only be called if registryAddress is empty, msg.sender or owner"
        );
        registryAddress = _registryAddress;
    }

    function kill() external {
        assert (msg.sender == registryAddress);
        selfdestruct(registryAddress);
    }
}
