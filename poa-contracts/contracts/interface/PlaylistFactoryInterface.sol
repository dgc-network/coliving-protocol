pragma solidity ^0.5.0;


/// @title The interface for contracts to interact with the Coliving ContentList contract
interface ContentListFactoryInterface {
  function callerOwnsContentList(address _caller, uint _content listId) external view;

  function content listExists(uint _content listId) external view returns (bool exists);
}
