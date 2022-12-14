pragma solidity ^0.8.0;

/// @title - Interface for Coliving DiscoveryNodeFactory contract
interface DiscoveryNodeFactoryInterface {
    function getDiscoveryNode(uint _id) external view
        returns (address wallet, string memory endpoint);
    function getTotalNumberOfProviders() external view returns (uint total);
    function register(string calldata _endpoint) external returns (uint discProvId);
}
