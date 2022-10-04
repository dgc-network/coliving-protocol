#!/bin/bash

function cd_data_contracts_repo {
  # Navigate to contracts repository
  if [ -d "../data-contracts" ]; then
    cd ../data-contracts/
    pwd
  else
    echo "INCORRECT REPOSITORY STRUCTURE. PLEASE FOLLOW README"
    exit 1
  fi
}

function cd_eth_contracts_repo {
  # Navigate to contracts repository
  if [ -d "../eth-contracts" ]; then
    cd ../eth-contracts/
    pwd
  else
    echo "INCORRECT REPOSITORY STRUCTURE. PLEASE FOLLOW README"
    exit 1
  fi
}

function cd_discprov_repo {
  # Navigate to discovery node repository
  if [ -d "../discovery-node" ]; then
    cd ../discovery-node/
    pwd
  else
    echo "INCORRECT REPOSITORY STRUCTURE. PLEASE FOLLOW README"
    exit 1
  fi
}
