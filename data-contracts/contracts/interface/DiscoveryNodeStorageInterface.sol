//pragma solidity ^0.5.0;
pragma solidity ^0.8.0;

/// @title The interface for contracts to interact with the Coliving DiscoveryNodeStorage contract
interface DiscoveryNodeStorageInterface {
    function getDiscoveryNode(uint _id) external view
        returns (address wallet, string memory endpoint);
    function getTotalNumberOfProviders() external view returns (uint total);
    function register(address _wallet, string calldata _endpoint) external returns (uint id);
}
