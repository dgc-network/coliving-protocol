pragma solidity ^0.8.0;

/// @title The interface for contracts to interact with the Coliving ContentList contract
interface ContentListFactoryInterface {
  function callerOwnsContentList(address _caller, uint _contentListId) external view;

  function contentListExists(uint _contentListId) external view returns (bool exists);
}
