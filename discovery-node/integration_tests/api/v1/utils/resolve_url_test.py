from datetime import datetime

from src.api.v1.utils.resolve_url import resolve_url
from src.models.indexing.block import Block
from src.models.users.user import User
from src.utils.db_session import get_db


def test_resolve_agreement_url(app):
    """Tests that it resolves a agreement url"""
    with app.test_request_context():
        db = get_db()
        with db.scoped_session() as session:
            url = 'https://coliving.lol/urbanbankai/mb-shola-vivienne-"westwood"-87325'
            resolved_url = resolve_url(session, url)

            assert (
                resolved_url
                == "/v1/agreements?slug=mb-shola-vivienne-%22westwood%22-87325&handle=urbanbankai"
            )


def test_resolve_content list_url(app):
    """Tests that it resolves a content list url"""
    with app.test_request_context():
        db = get_db()
        with db.scoped_session() as session:
            url = "https://coliving.lol/urbanbankai/content list/up-next-atl-august-2020-9801"
            resolved_url = resolve_url(session, url)

            assert resolved_url == "/v1/content lists/ePkW0"


def test_resolve_non_fully_qualified_url(app):
    """Tests that it resolves a agreement url when not fully qualified"""
    with app.test_request_context():
        db = get_db()
        with db.scoped_session() as session:
            url = '/urbanbankai/mb-shola-vivienne-"westwood"-87325'
            resolved_url = resolve_url(session, url)

            assert (
                resolved_url
                == "/v1/agreements?slug=mb-shola-vivienne-%22westwood%22-87325&handle=urbanbankai"
            )


def test_resolve_user_url(app):
    """Tests that it resolves a user url"""
    with app.test_request_context():
        db = get_db()
        with db.scoped_session() as session:
            session.add(
                Block(
                    blockhash="0x2969e88561fac17ca19c1749cb3e614211ba15c8e471be55de47d0b8ca6acf5f",
                    parenthash="0x0000000000000000000000000000000000000000",
                    number=16914541,
                    is_current=True,
                )
            )
            session.flush()
            session.add(
                User(
                    blockhash="0x2969e88561fac17ca19c1749cb3e614211ba15c8e471be55de47d0b8ca6acf5f",
                    is_current=True,
                    updated_at=datetime.now(),
                    created_at=datetime.now(),
                    blocknumber=16914541,
                    handle="Urbanbankai",
                    handle_lc="urbanbankai",
                    user_id=42727,
                    primary_id=1,
                    secondary_ids=[2, 3],
                )
            )
            url = "https://coliving.lol/urbanbankai"
            resolved_url = resolve_url(session, url)

            assert resolved_url == "/v1/users/DE677"
