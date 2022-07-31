#!/usr/bin/env bash
set -euo pipefail

TX_PARSER_DIR="$PROTOCOL_DIR/discovery-node/solana-tx-parser"
COLIVING_DATA_PROGRAM_ID=$(solana-keygen pubkey $PWD/target/deploy/coliving_data-keypair.json)

echo "Installing parser deps if needed..."
cd "$TX_PARSER_DIR" && python3.9 -m pip install -r requirements.txt

echo "Running parser with tx hash "$@"... If no tx hash is provided, parser will default to all tx for program ID $COLIVING_DATA_PROGRAM_ID"
TX_HASH="$@" python3.9 tx_parser.py