pragma solidity ^0.8.0;

// Import contract artifact for use in migration and tests
//import './proxy/AdminUpgradeabilityProxy.sol';

import "./proxy/UpgradeabilityProxy.sol";

/**
 * @notice Wrapper around OpenZeppelin's UpgradeabilityProxy contract.
 * Permissions proxy upgrade logic to Coliving Governance contract.
 * https://github.com/OpenZeppelin/openzeppelin-sdk/blob/release/2.8/packages/lib/contracts/upgradeability/UpgradeabilityProxy.sol
 * @dev Any logic contract that has a signature clash with this proxy contract will be unable to call those functions
 *      Please ensure logic contract functions do not share a signature with any functions defined in this file
 */
abstract contract AdminUpgradeabilityProxy is UpgradeabilityProxy {
    address private proxyAdmin;
    string private constant ERROR_ONLY_ADMIN = (
        "AdminUpgradeabilityProxy: Caller must be current proxy admin"
    );

    /**
     * @notice Sets admin address for future upgrades
     * @param _logic - address of underlying logic contract.
     *      Passed to UpgradeabilityProxy constructor.
     * @param _proxyAdmin - address of proxy admin
     *      Set to governance contract address for all non-governance contracts
     *      Governance is deployed and upgraded to have own address as admin
     * @param _data - data of function to be called on logic contract.
     *      Passed to UpgradeabilityProxy constructor.
     */
/*
    constructor(
      address _logic,
      address _proxyAdmin,
      bytes memory _data
    )
    UpgradeabilityProxy(_logic, _data) public payable
*/    
    constructor(
      address _logic,
      address _proxyAdmin,
      bytes memory _data
    )
    UpgradeabilityProxy() payable
    {
        proxyAdmin = _proxyAdmin;
    }

    /**
     * @notice Upgrade the address of the logic contract for this proxy
     * @dev Recreation of AdminUpgradeabilityProxy._upgradeTo.
     *      Adds a check to ensure msg.sender is the Coliving Proxy Admin
     * @param _newImplementation - new address of logic contract that the proxy will point to
     */
    function upgradeTo(address _newImplementation) external {
        require(msg.sender == proxyAdmin, ERROR_ONLY_ADMIN);
        _upgradeTo(_newImplementation);
    }

    /**
     * @return Current proxy admin address
     */
    function getColivingProxyAdminAddress() external view returns (address) {
        return proxyAdmin;
    }

    /**
     * @return The address of the implementation.
     */
    //function implementation() external override view returns (address) {
    //    return _implementation();
    //}

    /**
     * @notice Set the Coliving Proxy Admin
     * @dev Only callable by current proxy admin address
     * @param _adminAddress - new admin address
     */
    function setColivingProxyAdminAddress(address _adminAddress) external {
        require(msg.sender == proxyAdmin, ERROR_ONLY_ADMIN);
        proxyAdmin = _adminAddress;
    }
}
