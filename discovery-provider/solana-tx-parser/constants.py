from anchorpy import Provider

COLIVING_DATA_PROGRAM_PATH = "../../solana-programs/anchor/coliving-data"
COLIVING_DATA_IDL_PATH = f"{COLIVING_DATA_PROGRAM_PATH}/target/idl/coliving_data.json"
PROVIDER = Provider.local()  # testing
RPC_ADDRESS = "http://localhost:8899"
COLIVING_DATA_PROGRAM_NAME = "coliving_data"
