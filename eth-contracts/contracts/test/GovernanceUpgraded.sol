//pragma solidity ^0.5.0;
pragma solidity ^0.6.1;

import "../Governance.sol";


contract GovernanceUpgraded is Governance {
    function newFunction() public view returns (uint256) {
        _requireIsInitialized();

        return 5;
    }
}