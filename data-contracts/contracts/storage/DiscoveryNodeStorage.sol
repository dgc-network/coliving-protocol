pragma solidity ^0.8.0;

import "../registry/RegistryContract.sol";
import "../interface/RegistryInterface.sol";

/** @title - The persistent storage for Coliving Discovery Nodes
*  @dev - TODO - needs to be converted to proper eternal dumb storage
*/
contract DiscoveryNodeStorage is RegistryContract {

    bytes32 constant CALLER_REGISTRY_KEY = "DiscoveryNodeFactory";

    //RegistryInterface registry = RegistryInterface(0);
    address _registry;
    RegistryInterface registry = RegistryInterface(_registry);

    /** @dev - Uniquely assigned discProvId, incremented for each new assignment */
    uint discProvId = 1;
    /** @dev - mapping of discProvIds => wallets */
    mapping(uint => address) public discProvWallets;
    /** @dev - mapping of discProvIds => endpoints */
    mapping(uint => string) public discProvEndpoints;

    constructor(address _registryAddress) public {
        require(
            _registryAddress != address(0x00),
            "Requires non-zero _registryAddress"
        );
        registry = RegistryInterface(_registryAddress);
    }

    function getDiscoveryNode(uint _id)
    external view onlyRegistrant(CALLER_REGISTRY_KEY)
    returns (address wallet, string memory endpoint)
    {
        return (discProvWallets[_id], discProvEndpoints[_id]);
    }

    /** @notice - returns the total number of discProvIds currently on contract */
    function getTotalNumberOfProviders()
    external view onlyRegistrant(CALLER_REGISTRY_KEY)
    returns (uint total)
    {
        return (discProvId - 1);
    }

    /** @dev - adds new discovery node fields to storage, returns id of registered discprov */
    function register(address _wallet, string calldata _endpoint)
    external onlyRegistrant(CALLER_REGISTRY_KEY) returns (uint id)
    {
        discProvWallets[discProvId] = _wallet;
        discProvEndpoints[discProvId] = _endpoint;
        discProvId += 1;
        return (discProvId - 1);
    }

}
