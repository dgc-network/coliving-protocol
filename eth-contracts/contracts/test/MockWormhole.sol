pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
//import "../erc20/ERC20Detailed.sol";

contract MockWormhole {
    using SafeERC20 for ERC20;

    uint8 CHAIN_ID = 2;

    event LogTokensTransferred(
        uint16 recipientChain,
        uint16 tokenChain,
        uint8 tokenDecimals,
        bytes32 indexed token,
        bytes32 indexed sender,
        bytes32 recipient,
        uint256 amount,
        uint256 arbiterFee,
        uint32 nonce
    );

    function transferTokens(
        address token,
        uint256 amount,
        uint16 recipientChain,
        bytes32 recipient,
        uint256 arbiterFee,
        uint32 nonce
    ) public {
        ERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        uint16 assetChain = CHAIN_ID;
        //uint8 decimals = ERC20Detailed(token).decimals();
        uint8 decimals = ERC20(token).decimals();
        //bytes32 assetAddress = bytes32(uint256(token));
        bytes32 assetAddress = bytes32(uint256(uint160(token)));

        emit LogTokensTransferred(
            recipientChain,
            assetChain,
            decimals,
            assetAddress,
            //bytes32(uint256(msg.sender)),
            bytes32(uint256(uint160(msg.sender))),
            recipient,
            amount,
            arbiterFee,
            nonce
        );
    }
}
