//pragma solidity ^0.5.0;
pragma solidity ^0.8.0;

import "../Staking.sol";

contract StakingUpgraded is Staking {
    function newFunction() public view returns (uint256) {
        _requireIsInitialized();

        return 5;
    }
}
