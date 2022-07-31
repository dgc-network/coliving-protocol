# solana-tx-parser

A set of utilities for interacting with coliving-data program deployed to Solana.

## Install
Requires Python ^3.9
```
# run from solana-tx-parser dir root
python3.9 -m pip install -r requirements.txt
```

## Run
### Setup
In one terminal, start localnet:
```
cd $PROTOCOL_DIR/solana-programs/anchor/coliving-data && npm run localnet-up
```

In another terminal, build + deploy program, and seed tx:
```
cd $PROTOCOL_DIR/solana-programs/anchor/coliving-data && npm run dev-setup
```

### Parse
#### All program txs
Parse all txs found for program:
```
cd $PROTOCOL_DIR/solana-programs/anchor/coliving-data && npm run parse-tx
```

#### Parse single tx
To parse a single tx, export TX_HASH env var when running tx_parser.py:
```
cd $PROTOCOL_DIR/discovery-node/solana-tx-parser && TX_HASH=<txhash> python3.9 tx_parser.py
```
Alternatively:
```
cd $PROTOCOL_DIR/solana-programs/anchor/coliving-data && npm run parse-tx -- <txhash>
```