from anchorpy import Provider

AUDIUS_DATA_PROGRAM_PATH = "../../solana-programs/anchor/coliving-data"
AUDIUS_DATA_IDL_PATH = f"{AUDIUS_DATA_PROGRAM_PATH}/target/idl/coliving_data.json"
PROVIDER = Provider.local()  # testing
RPC_ADDRESS = "http://localhost:8899"
AUDIUS_DATA_PROGRAM_NAME = "coliving_data"
