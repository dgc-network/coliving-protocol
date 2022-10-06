pragma solidity ^0.8.0;

import "../Governance.sol";

contract GovernanceUpgraded is Governance {
    function newFunction() public view returns (uint256) {
        _requireIsInitialized();

        return 5;
    }
}