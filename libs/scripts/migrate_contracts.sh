# COPY DATA CONTRACTS
if [ -d "../data-contracts/build/contracts" ]
then
  echo "Coliving contracts repo is present"
  cd ../data-contracts/
  echo "Writing contracts config files"
  node_modules/.bin/truffle exec scripts/migrateContracts.js
else
  echo "INCORRECT REPOSITORY STRUCTURE. PLEASE FOLLOW README"
  exit 1
fi

# COPY ETH CONTRACTS
if [ -d "../eth-contracts/build/contracts" ]
then
  echo "Coliving eth-contracts repo is present"
  cd ../eth-contracts/
  echo "Writing eth-contracts config files"
  node_modules/.bin/truffle exec scripts/migrateContracts.js
  cp ../libs/scripts/colivingClaimDistributor.json ../libs/eth-contracts/ABIs/colivingClaimDistributor.json
  cp ../libs/scripts/wormhole.json ../libs/eth-contracts/ABIs/wormhole.json
else
  echo "INCORRECT REPOSITORY STRUCTURE. PLEASE FOLLOW README"
  exit 1
fi
