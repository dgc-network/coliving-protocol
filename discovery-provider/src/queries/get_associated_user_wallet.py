import logging
from typing import List, Tuple, TypedDict

from src.models.users.associated_wallet import AssociatedWallet
from src.utils import db_session

logger = logging.getLogger(__name__)


class AssociatedUserWalletArgs(TypedDict):
    user_id: int


class AssociatedUserWallet(TypedDict):
    eth: List[str]
    sol: List[str]


def get_associated_user_wallet(args: AssociatedUserWalletArgs) -> AssociatedUserWallet:
    """
    Returns a list of associated wallets

    Args:
        args: dict The parsed args from the request
        args.user_id: number The blockchain user id

    Returns:
        Array of strings representing the user's associated wallets
    """
    db = db_session.get_db_read_replica()
    with db.scoped_session() as session:
        user_wallet: List[Tuple[str, str]] = (
            session.query(AssociatedWallet.wallet, AssociatedWallet.chain)
            .filter(AssociatedWallet.is_current == True)
            .filter(AssociatedWallet.is_delete == False)
            .filter(AssociatedWallet.user_id == args.get("user_id"))
            .all()
        )
        eth_wallets: List[str] = []
        sol_wallets: List[str] = []
        for wallet, chain in user_wallet:
            if chain == "eth":
                eth_wallets.append(wallet)
            elif chain == "sol":
                sol_wallets.append(wallet)
        return {"eth": eth_wallets, "sol": sol_wallets}
