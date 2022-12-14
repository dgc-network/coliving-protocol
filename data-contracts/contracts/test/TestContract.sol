pragma solidity ^0.8.0;

import "../registry/RegistryContract.sol";
import "../interface/RegistryInterface.sol";

/**
* Simple registryContract for test purposes
*/
contract TestContract is RegistryContract {

    //RegistryInterface registry = RegistryInterface(0);
    address _registry;
    RegistryInterface registry = RegistryInterface(_registry);

    uint public x = 1;

    constructor(address _registryAddress) public {
        require(
            _registryAddress != address(0x00),
            "Requires non-zero _registryAddress"
        );
        registry = RegistryInterface(_registryAddress);
    }

    function setX(uint _x) external {
        x = _x;
    }
}
