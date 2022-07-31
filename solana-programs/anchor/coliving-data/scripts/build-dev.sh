#!/usr/bin/env bash
set -euxo pipefail

cd $PROTOCOL_DIR/solana-programs/anchor/coliving-data
# Replace program ID with solana pubkey generated from anchor build
cur_address=$(grep -Po '(?<=declare_id!\(").*(?=")' programs/coliving-data/src/lib.rs)
echo "Building and deploying coliving_data program with anchor CLI..."
anchor build
COLIVING_DATA_PROGRAM_ID=$(solana-keygen pubkey target/deploy/coliving_data-keypair.json)
sed -i "s/$cur_address/$COLIVING_DATA_PROGRAM_ID/g" Anchor.toml
sed -i "s/$cur_address/$COLIVING_DATA_PROGRAM_ID/g" programs/coliving-data/src/lib.rs

anchor build
echo "coliving-data program built. Start solana test validator and deploy by running, in separate windows, npm run localnet-up and npm run deploy-dev."