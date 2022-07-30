import logging

from flask import Blueprint, request
from sqlalchemy import func
from src.api_helpers import error_response, success_response
from src.models.indexing.skipped_transaction import (
    SkippedTransaction,
    SkippedTransactionLevel,
)
from src.queries.get_skipped_transactions import (
    get_skipped_transactions,
    get_transaction_status,
)

logger = logging.getLogger(__name__)

bp = Blueprint("indexing", __name__)

MAX_NETWORK_LEVEL_SKIPPED_TX = 100


@bp.route("/indexing/skipped_transactions", methods=["GET"])
def check_skipped_transactions():
    """
    Returns skipped transactions during indexing
    Takes query params 'blocknumber', 'blockhash', and 'transactionhash'
    Filters by query params if they are not null
    """
    blocknumber = request.args.get("blocknumber", type=int)
    blockhash = request.args.get("blockhash")
    transactionhash = request.args.get("transactionhash")
    skipped_transactions = get_skipped_transactions(
        blocknumber, blockhash, transactionhash
    )
    return success_response(skipped_transactions)


@bp.route("/indexing/transaction_status", methods=["GET"])
def check_transaction_status():
    """
    Returns whether a transaction 'PASSED' | 'FAILED' | 'NOT_FOUND'
    based on all 3 query params 'blocknumber', 'blockhash', and 'transactionhash'
    """
    blocknumber = request.args.get("blocknumber", type=int)
    blockhash = request.args.get("blockhash")
    transactionhash = request.args.get("transactionhash")
    if blocknumber is None or blockhash is None or transactionhash is None:
        return error_response(
            "Please pass in required query parameters 'blocknumber', 'blockhash', and 'transactionhash'",
            400,
        )
    try:
        transaction_status = get_transaction_status(
            blocknumber, blockhash, transactionhash
        )
    except Exception as e:
        return error_response(e)
    return success_response(transaction_status)


def add_node_level_skipped_transaction(session, blocknumber, blockhash, txhash):
    skipped_tx = SkippedTransaction(
        blocknumber=blocknumber,
        blockhash=blockhash,
        txhash=txhash,
        level=SkippedTransactionLevel.node,
    )
    session.add(skipped_tx)


def add_network_level_skipped_transaction(session, blocknumber, blockhash, txhash):
    num_skipped_tx = (
        session.query(func.count(SkippedTransaction))
        .filter(SkippedTransaction.level == SkippedTransactionLevel.network)
        .scalar()
    )
    if num_skipped_tx >= MAX_NETWORK_LEVEL_SKIPPED_TX:
        logger.warning(
            f"skipped_transactions.py | Not skipping tx {txhash} as {num_skipped_tx} >= {MAX_NETWORK_LEVEL_SKIPPED_TX}"
        )
        raise
    skipped_tx = SkippedTransaction(
        blocknumber=blocknumber,
        blockhash=blockhash,
        txhash=txhash,
        level=SkippedTransactionLevel.network,
    )
    session.add(skipped_tx)
