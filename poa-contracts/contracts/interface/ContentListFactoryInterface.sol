//pragma solidity ^0.5.0;
pragma solidity ^0.6.1;


/// @title The interface for contracts to interact with the Coliving ContentList contract
interface ContentListFactoryInterface {
  function callerOwnsContentList(address _caller, uint _content_listId) external view;

  function contentListExists(uint _content_listId) external view returns (bool exists);
}
