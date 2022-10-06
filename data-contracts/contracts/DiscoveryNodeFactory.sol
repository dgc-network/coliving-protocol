//pragma solidity ^0.5.0;
pragma solidity ^0.8.0;

import "./interface/RegistryInterface.sol";
import "./registry/RegistryContract.sol";
import "./interface/DiscoveryNodeStorageInterface.sol";


/** @title Contract responsible for managing discovery node on-chain business logic */
contract DiscoveryNodeFactory is RegistryContract {

    RegistryInterface registry = RegistryInterface(0);
    bytes32 discoveryNodeStorageRegistryKey;

    event NewDiscoveryNode(uint _id, address _wallet, string _endpoint);

    /** @notice - Sets registry address and discovery node storage contract registry key */
    constructor(address _registryAddress, bytes32 _discoveryNodeStorageRegistryKey) public
    {
        require(
            _registryAddress != address(0x00) &&
            _discoveryNodeStorageRegistryKey.length != 0,
            "Requires non-zero _registryAddress and non-empty _discoveryNodeStorageRegistryKey"
        );
        registry = RegistryInterface(_registryAddress);
        discoveryNodeStorageRegistryKey = _discoveryNodeStorageRegistryKey;
    }

    /** @notice - returns registered discovery node given its id */
    function getDiscoveryNode(uint _id)
    external view returns (address wallet, string memory endpoint)
    {
        return DiscoveryNodeStorageInterface(
            registry.getContract(discoveryNodeStorageRegistryKey)
        ).getDiscoveryNode(_id);
    }

    /** @notice - returns the total number of discProvIds currently on contract */
    function getTotalNumberOfProviders()
    external view returns (uint total)
    {
        return DiscoveryNodeStorageInterface(
            registry.getContract(discoveryNodeStorageRegistryKey)
        ).getTotalNumberOfProviders();
    }

    /** @notice - adds new discovery node to DiscoveryNodeStorage */
    function register(string calldata _endpoint)
    external returns (uint discProvId)
    {
        discProvId = DiscoveryNodeStorageInterface(
            registry.getContract(discoveryNodeStorageRegistryKey)
        ).register(msg.sender, _endpoint);
        emit NewDiscoveryNode(discProvId, msg.sender, _endpoint);
        return discProvId;
    }
}
