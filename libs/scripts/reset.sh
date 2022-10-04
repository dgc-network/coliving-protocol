#!/usr/bin/env bash

set -e
set -o xtrace

##### INIT DATA CONTRACTS #####

if [ -d "../data-contracts" ]
then
  echo "Coliving contracts repo is present"
  cd ../data-contracts/
else
  echo "INCORRECT REPOSITORY STRUCTURE. PLEASE FOLLOW README"
  exit 1
fi

rm -rf ./build/

# not problematic for this to fail
set +e
npm run ganache-q
set -e

npm run ganache
npm run truffle-migrate


##### INIT ETH CONTRACTS #####

if [ -d "../eth-contracts" ]
then
  echo "Coliving eth-contracts repo is present"
  cd ../eth-contracts/
else
  echo "INCORRECT REPOSITORY STRUCTURE. PLEASE FOLLOW README"
  exit 1
fi

rm -rf ./build/

# not problematic for this to fail
set +e
npm run ganache-q
set -e

npm run ganache
npm run truffle-migrate

cd ../libs/

# Migrate data & eth contracts
# - Copy contracts build dir + create config files
# - Data contracts config: registry contract & owner wallet addresses
# - Eth contracts config: ColivingToken contract, registry contract and owner wallet addresses
sh ./scripts/migrate_contracts.sh

#### RUN TESTS #####

# printf '\nSTART tests:\n\n'
#./node_modules/.bin/mocha tests/index.js

# run linter
# node_modules/.bin/standard

# intentionally does not bring down containers
