import logging
from datetime import datetime
from time import time
from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy.orm.session import Session, make_transient
from sqlalchemy.sql import functions, null
from src.challenges.challenge_event import ChallengeEvent
from src.challenges.challenge_event_bus import ChallengeEventBus
from src.database_task import DatabaseTask
from src.models.agreements.remix import Remix
from src.models.agreements.stem import Stem
from src.models.agreements.agreement import Agreement
from src.models.agreements.agreement_route import AgreementRoute
from src.models.users.user import User
from src.queries.skipped_transactions import add_node_level_skipped_transaction
from src.utils import helpers, multihash
from src.utils.indexing_errors import EntityMissingRequiredFieldError, IndexingError
from src.utils.model_nullable_validator import all_required_fields_present
from src.utils.prometheus_metric import PrometheusMetric, PrometheusMetricNames
from src.utils.agreement_event_constants import (
    agreement_event_types_arr,
    agreement_event_types_lookup,
)

logger = logging.getLogger(__name__)


def agreement_state_update(
    self,
    update_task: DatabaseTask,
    session: Session,
    agreement_factory_txs,
    block_number,
    block_timestamp,
    block_hash,
    ipfs_metadata,
) -> Tuple[int, Set]:
    """Return tuple containing int representing number of Agreement model state changes found in transaction and set of processed agreement IDs."""
    begin_agreement_state_update = datetime.now()
    metric = PrometheusMetric(PrometheusMetricNames.AGREEMENT_STATE_UPDATE_DURATION_SECONDS)

    blockhash = update_task.web3.toHex(block_hash)
    num_total_changes = 0
    skipped_tx_count = 0
    # This stores the agreement_ids created or updated in the set of transactions
    agreement_ids: Set[int] = set()

    if not agreement_factory_txs:
        return num_total_changes, agreement_ids

    pending_agreement_routes: List[AgreementRoute] = []
    agreement_events: Dict[int, Dict[str, Any]] = {}
    for tx_receipt in agreement_factory_txs:
        txhash = update_task.web3.toHex(tx_receipt.transactionHash)
        for event_type in agreement_event_types_arr:
            agreement_events_tx = get_agreement_events_tx(update_task, event_type, tx_receipt)
            processedEntries = 0  # if record does not get added, do not count towards num_total_changes
            for entry in agreement_events_tx:
                agreement_event_start_time = time()
                event_args = entry["args"]
                agreement_id = (
                    helpers.get_tx_arg(entry, "_agreementId")
                    if "_agreementId" in event_args
                    else helpers.get_tx_arg(entry, "_id")
                )
                existing_agreement_record = None
                agreement_metadata = None
                try:
                    # look up or populate existing record
                    if agreement_id in agreement_events:
                        existing_agreement_record = agreement_events[agreement_id]["agreement"]
                    else:
                        existing_agreement_record = lookup_agreement_record(
                            update_task,
                            session,
                            entry,
                            agreement_id,
                            block_number,
                            blockhash,
                            txhash,
                        )
                    # parse agreement event to add metadata to record
                    if event_type in [
                        agreement_event_types_lookup["new_agreement"],
                        agreement_event_types_lookup["update_agreement"],
                    ]:
                        agreement_metadata_digest = event_args._multihashDigest.hex()
                        agreement_metadata_hash_fn = event_args._multihashHashFn
                        buf = multihash.encode(
                            bytes.fromhex(agreement_metadata_digest), agreement_metadata_hash_fn
                        )
                        cid = multihash.to_b58_string(buf)
                        agreement_metadata = ipfs_metadata[cid]

                    parsed_agreement = parse_agreement_event(
                        self,
                        session,
                        update_task,
                        entry,
                        event_type,
                        existing_agreement_record,
                        block_number,
                        block_timestamp,
                        agreement_metadata,
                        pending_agreement_routes,
                    )

                    if parsed_agreement is not None:
                        if agreement_id not in agreement_events:
                            agreement_events[agreement_id] = {
                                "agreement": parsed_agreement,
                                "events": [],
                            }
                        else:
                            agreement_events[agreement_id]["agreement"] = parsed_agreement
                        agreement_events[agreement_id]["events"].append(event_type)
                        agreement_ids.add(agreement_id)
                        processedEntries += 1
                except EntityMissingRequiredFieldError as e:
                    logger.warning(f"Skipping tx {txhash} with error {e}")
                    skipped_tx_count += 1
                    add_node_level_skipped_transaction(
                        session, block_number, blockhash, txhash
                    )
                    pass
                except Exception as e:
                    logger.info("Error in parse agreement transaction")
                    raise IndexingError(
                        "agreement", block_number, blockhash, txhash, str(e)
                    ) from e
                metric.save_time(
                    {"scope": "agreement_event"}, start_time=agreement_event_start_time
                )

            num_total_changes += processedEntries

    logger.info(
        f"index.py | agreements.py | [agreement indexing] There are {num_total_changes} events processed and {skipped_tx_count} skipped transactions."
    )

    for agreement_id, value_obj in agreement_events.items():
        if value_obj["events"]:
            logger.info(f"index.py | agreements.py | Adding {value_obj['agreement']}")
            invalidate_old_agreement(session, agreement_id)
            session.add(value_obj["agreement"])

    if num_total_changes:
        metric.save_time({"scope": "full"})
        logger.info(
            f"index.py | agreements.py | agreement_state_update | finished agreement_state_update in {datetime.now() - begin_agreement_state_update} // per event: {(datetime.now() - begin_agreement_state_update) / num_total_changes} secs"
        )
    return num_total_changes, agreement_ids


def get_agreement_events_tx(update_task, event_type, tx_receipt):
    return getattr(update_task.agreement_contract.events, event_type)().processReceipt(
        tx_receipt
    )


def lookup_agreement_record(
    update_task, session, entry, event_agreement_id, block_number, block_hash, txhash
):
    # Check if agreement record exists
    agreement_exists = session.query(Agreement).filter_by(agreement_id=event_agreement_id).count() > 0

    agreement_record = None
    if agreement_exists:
        agreement_record = (
            session.query(Agreement)
            .filter(Agreement.agreement_id == event_agreement_id, Agreement.is_current == True)
            .first()
        )

        # expunge the result from sqlalchemy so we can modify it without UPDATE statements being made
        # https://stackoverflow.com/questions/28871406/how-to-clone-a-sqlalchemy-db-object-with-new-primary-key
        session.expunge(agreement_record)
        make_transient(agreement_record)
    else:
        agreement_record = Agreement(agreement_id=event_agreement_id, is_current=True, is_delete=False)

    # update block related fields regardless of type
    agreement_record.blocknumber = block_number
    agreement_record.blockhash = block_hash
    agreement_record.txhash = txhash
    return agreement_record


def invalidate_old_agreement(session, agreement_id):
    agreement_exists = session.query(Agreement).filter_by(agreement_id=agreement_id).count() > 0

    if not agreement_exists:
        return

    num_invalidated_agreements = (
        session.query(Agreement)
        .filter(Agreement.agreement_id == agreement_id, Agreement.is_current == True)
        .update({"is_current": False})
    )
    assert (
        num_invalidated_agreements > 0
    ), "Update operation requires a current agreement to be invalidated"


def invalidate_old_agreements(session, agreement_ids):
    for agreement_id in agreement_ids:
        invalidate_old_agreement(session, agreement_id)


def update_stems_table(session, agreement_record, agreement_metadata):
    if ("stem_of" not in agreement_metadata) or (
        not isinstance(agreement_metadata["stem_of"], dict)
    ):
        return
    parent_agreement_id = agreement_metadata["stem_of"].get("parent_agreement_id")
    if not isinstance(parent_agreement_id, int):
        return

    # Avoid re-adding stem if it already exists
    existing_stem = (
        session.query(Stem)
        .filter_by(
            parent_agreement_id=parent_agreement_id, child_agreement_id=agreement_record.agreement_id
        )
        .first()
    )
    if existing_stem:
        return

    stem = Stem(parent_agreement_id=parent_agreement_id, child_agreement_id=agreement_record.agreement_id)
    session.add(stem)


def update_remixes_table(session, agreement_record, agreement_metadata):
    child_agreement_id = agreement_record.agreement_id

    # Delete existing remix parents
    session.query(Remix).filter_by(child_agreement_id=child_agreement_id).delete()

    # Add all remixes
    if "remix_of" in agreement_metadata and isinstance(agreement_metadata["remix_of"], dict):
        agreements = agreement_metadata["remix_of"].get("agreements")
        if agreements and isinstance(agreements, list):
            for agreement in agreements:
                if not isinstance(agreement, dict):
                    continue
                parent_agreement_id = agreement.get("parent_agreement_id")
                if isinstance(parent_agreement_id, int):
                    remix = Remix(
                        parent_agreement_id=parent_agreement_id, child_agreement_id=child_agreement_id
                    )
                    session.add(remix)


@helpers.time_method
def update_agreement_routes_table(
    session, agreement_record, agreement_metadata, pending_agreement_routes
):
    """Creates the route for the given agreement"""

    # Check if the title is staying the same, and if so, return early
    if agreement_record.title == agreement_metadata["title"]:
        return

    # Get the title slug, and set the new slug to that
    # (will check for conflicts later)
    new_agreement_slug_title = helpers.create_agreement_slug(
        agreement_metadata["title"], agreement_record.agreement_id
    )
    new_agreement_slug = new_agreement_slug_title

    # Find the current route for the agreement
    # Check the pending agreement route updates first
    prev_agreement_route_record = next(
        (
            route
            for route in pending_agreement_routes
            if route.is_current and route.agreement_id == agreement_record.agreement_id
        ),
        None,
    )
    # Then query the DB if necessary
    if prev_agreement_route_record is None:
        prev_agreement_route_record = (
            session.query(AgreementRoute)
            .filter(
                AgreementRoute.agreement_id == agreement_record.agreement_id,
                AgreementRoute.is_current == True,
            )  # noqa: E712
            .one_or_none()
        )

    if prev_agreement_route_record is not None:
        if prev_agreement_route_record.title_slug == new_agreement_slug_title:
            # If the title slug hasn't changed, we have no work to do
            return
        # The new route will be current
        prev_agreement_route_record.is_current = False

    # Check for collisions by slug titles, and get the max collision_id
    max_collision_id: Optional[int] = None
    # Check pending updates first
    for route in pending_agreement_routes:
        if (
            route.title_slug == new_agreement_slug_title
            and route.owner_id == agreement_record.owner_id
        ):
            max_collision_id = (
                route.collision_id
                if max_collision_id is None
                else max(max_collision_id, route.collision_id)
            )
    # Check DB if necessary
    if max_collision_id is None:
        max_collision_id = (
            session.query(functions.max(AgreementRoute.collision_id))
            .filter(
                AgreementRoute.title_slug == new_agreement_slug_title,
                AgreementRoute.owner_id == agreement_record.owner_id,
            )
            .one_or_none()
        )[0]

    existing_agreement_route: Optional[AgreementRoute] = None
    # If the new agreement_slug ends in a digit, there's a possibility it collides
    # with an existing route when the collision_id is appended to its title_slug
    if new_agreement_slug[-1].isdigit():
        existing_agreement_route = next(
            (
                route
                for route in pending_agreement_routes
                if route.slug == new_agreement_slug
                and route.owner_id == agreement_record.owner_id
            ),
            None,
        )
        if existing_agreement_route is None:
            existing_agreement_route = (
                session.query(AgreementRoute)
                .filter(
                    AgreementRoute.slug == new_agreement_slug,
                    AgreementRoute.owner_id == agreement_record.owner_id,
                )
                .one_or_none()
            )

    new_collision_id = 0
    has_collisions = existing_agreement_route is not None

    if max_collision_id is not None:
        has_collisions = True
        new_collision_id = max_collision_id
    while has_collisions:
        # If there is an existing agreement by the user with that slug,
        # then we need to append the collision number to the slug
        new_collision_id += 1
        new_agreement_slug = helpers.create_agreement_slug(
            agreement_metadata["title"], agreement_record.agreement_id, new_collision_id
        )

        # Check for new collisions after making the new slug
        # In rare cases the user may have agreement names that end in numbers that
        # conflict with this agreement name when the collision id is appended,
        # for example they could be trying to create a route that conflicts
        # with the old routing (of appending -{agreement_id}) This is a fail safe
        # to increment the collision ID until no such collisions are present.
        #
        # Example scenario:
        #   - User uploads agreement titled "Agreement" (title_slug: 'agreement')
        #   - User uploads agreement titled "Agreement 1" (title_slug: 'agreement-1')
        #   - User uploads agreement titled "Agreement" (title_slug: 'agreement')
        #       - Try collision_id: 1, slug: 'agreement-1' and find new collision
        #       - Use collision_id: 2, slug: 'agreement-2'
        #   - User uploads agreement titled "Agreement" (title_slug: 'agreement')
        #       - Use collision_id: 3, slug: 'agreement-3'
        #   - User uploads agreement titled "Agreement 1" (title_slug: 'agreement-1')
        #       - Use collision_id: 1, slug: 'agreement-1-1'
        #
        # This may be expensive with many collisions, but should be rare.
        existing_agreement_route = next(
            (
                route
                for route in pending_agreement_routes
                if route.slug == new_agreement_slug
                and route.owner_id == agreement_record.owner_id
            ),
            None,
        )
        if existing_agreement_route is None:
            existing_agreement_route = (
                session.query(AgreementRoute)
                .filter(
                    AgreementRoute.slug == new_agreement_slug,
                    AgreementRoute.owner_id == agreement_record.owner_id,
                )
                .one_or_none()
            )
        has_collisions = existing_agreement_route is not None

    # Add the new agreement route
    new_agreement_route = AgreementRoute()
    new_agreement_route.slug = new_agreement_slug
    new_agreement_route.title_slug = new_agreement_slug_title
    new_agreement_route.collision_id = new_collision_id
    new_agreement_route.owner_id = agreement_record.owner_id
    new_agreement_route.agreement_id = agreement_record.agreement_id
    new_agreement_route.is_current = True
    new_agreement_route.blockhash = agreement_record.blockhash
    new_agreement_route.blocknumber = agreement_record.blocknumber
    new_agreement_route.txhash = agreement_record.txhash
    session.add(new_agreement_route)

    # Add to pending agreement routes so we don't add the same route twice
    pending_agreement_routes.append(new_agreement_route)


def parse_agreement_event(
    self,
    session,
    update_task: DatabaseTask,
    entry,
    event_type,
    agreement_record,
    block_number,
    block_timestamp,
    agreement_metadata,
    pending_agreement_routes,
):
    challenge_bus = update_task.challenge_event_bus
    # Just use block_timestamp as integer
    block_datetime = datetime.utcfromtimestamp(block_timestamp)

    if event_type == agreement_event_types_lookup["new_agreement"]:
        agreement_record.created_at = block_datetime

        agreement_metadata_digest = helpers.get_tx_arg(entry, "_multihashDigest").hex()
        agreement_metadata_hash_fn = helpers.get_tx_arg(entry, "_multihashHashFn")
        buf = multihash.encode(
            bytes.fromhex(agreement_metadata_digest), agreement_metadata_hash_fn
        )
        agreement_metadata_multihash = multihash.to_b58_string(buf)
        logger.info(
            f"index.py | agreements.py | agreement metadata ipld : {agreement_metadata_multihash}"
        )

        owner_id = helpers.get_tx_arg(entry, "_agreementOwnerId")
        agreement_record.owner_id = owner_id
        agreement_record.is_delete = False

        handle = (
            session.query(User.handle)
            .filter(User.user_id == owner_id, User.is_current == True)
            .first()
        )[0]
        if not handle:
            raise EntityMissingRequiredFieldError(
                "agreement",
                agreement_record,
                f"No user found for {agreement_record}",
            )

        update_agreement_routes_table(
            session, agreement_record, agreement_metadata, pending_agreement_routes
        )
        agreement_record = populate_agreement_record_metadata(
            agreement_record, agreement_metadata, handle
        )
        agreement_record.metadata_multihash = agreement_metadata_multihash

        # if cover_art CID is of a dir, store under _sizes field instead
        if agreement_record.cover_art:
            logger.info(
                f"index.py | agreements.py | Processing agreement cover art {agreement_record.cover_art}"
            )
            agreement_record.cover_art_sizes = agreement_record.cover_art
            agreement_record.cover_art = None

        update_stems_table(session, agreement_record, agreement_metadata)
        update_remixes_table(session, agreement_record, agreement_metadata)
        dispatch_challenge_agreement_upload(challenge_bus, block_number, agreement_record)

    if event_type == agreement_event_types_lookup["update_agreement"]:
        upd_agreement_metadata_digest = helpers.get_tx_arg(entry, "_multihashDigest").hex()
        upd_agreement_metadata_hash_fn = helpers.get_tx_arg(entry, "_multihashHashFn")
        update_buf = multihash.encode(
            bytes.fromhex(upd_agreement_metadata_digest), upd_agreement_metadata_hash_fn
        )
        upd_agreement_metadata_multihash = multihash.to_b58_string(update_buf)
        logger.info(
            f"index.py | agreements.py | update agreement metadata ipld : {upd_agreement_metadata_multihash}"
        )

        owner_id = helpers.get_tx_arg(entry, "_agreementOwnerId")
        agreement_record.owner_id = owner_id
        agreement_record.is_delete = False

        handle = (
            session.query(User.handle)
            .filter(User.user_id == owner_id, User.is_current == True)
            .first()
        )[0]
        if not handle:
            raise EntityMissingRequiredFieldError(
                "agreement",
                agreement_record,
                f"No user found for {agreement_record}",
            )

        update_agreement_routes_table(
            session, agreement_record, agreement_metadata, pending_agreement_routes
        )
        agreement_record = populate_agreement_record_metadata(
            agreement_record, agreement_metadata, handle
        )
        agreement_record.metadata_multihash = upd_agreement_metadata_multihash

        # All incoming cover art is intended to be a directory
        # Any write to cover_art field is replaced by cover_art_sizes
        if agreement_record.cover_art:
            logger.info(
                f"index.py | agreements.py | Processing agreement cover art {agreement_record.cover_art}"
            )
            agreement_record.cover_art_sizes = agreement_record.cover_art
            agreement_record.cover_art = None

        update_remixes_table(session, agreement_record, agreement_metadata)

    if event_type == agreement_event_types_lookup["delete_agreement"]:
        agreement_record.is_delete = True
        agreement_record.stem_of = null()
        agreement_record.remix_of = null()
        logger.info(f"index.py | agreements.py | Removing agreement : {agreement_record.agreement_id}")

    agreement_record.updated_at = block_datetime

    if not all_required_fields_present(Agreement, agreement_record):
        raise EntityMissingRequiredFieldError(
            "agreement",
            agreement_record,
            f"Error parsing agreement {agreement_record} with entity missing required field(s)",
        )

    return agreement_record


def dispatch_challenge_agreement_upload(
    bus: ChallengeEventBus, block_number: int, agreement_record
):
    bus.dispatch(ChallengeEvent.agreement_upload, block_number, agreement_record.owner_id)


def is_valid_json_field(metadata, field):
    if field in metadata and isinstance(metadata[field], dict) and metadata[field]:
        return True
    return False


def populate_agreement_record_metadata(agreement_record, agreement_metadata, handle):
    agreement_record.title = agreement_metadata["title"]
    agreement_record.length = agreement_metadata["length"] or 0
    agreement_record.cover_art = agreement_metadata["cover_art"]
    if agreement_metadata["cover_art_sizes"]:
        agreement_record.cover_art = agreement_metadata["cover_art_sizes"]
    agreement_record.tags = agreement_metadata["tags"]
    agreement_record.genre = agreement_metadata["genre"]
    agreement_record.mood = agreement_metadata["mood"]
    agreement_record.credits_splits = agreement_metadata["credits_splits"]
    agreement_record.create_date = agreement_metadata["create_date"]
    agreement_record.release_date = agreement_metadata["release_date"]
    agreement_record.file_type = agreement_metadata["file_type"]
    agreement_record.description = agreement_metadata["description"]
    agreement_record.license = agreement_metadata["license"]
    agreement_record.isrc = agreement_metadata["isrc"]
    agreement_record.iswc = agreement_metadata["iswc"]
    agreement_record.agreement_segments = agreement_metadata["agreement_segments"]
    agreement_record.is_unlisted = agreement_metadata["is_unlisted"]
    agreement_record.field_visibility = agreement_metadata["field_visibility"]
    if is_valid_json_field(agreement_metadata, "stem_of"):
        agreement_record.stem_of = agreement_metadata["stem_of"]
    else:
        agreement_record.stem_of = null()
    if is_valid_json_field(agreement_metadata, "remix_of"):
        agreement_record.remix_of = agreement_metadata["remix_of"]
    else:
        agreement_record.remix_of = null()

    if "download" in agreement_metadata:
        agreement_record.download = {
            "is_downloadable": agreement_metadata["download"].get("is_downloadable")
            == True,
            "requires_follow": agreement_metadata["download"].get("requires_follow")
            == True,
            "cid": agreement_metadata["download"].get("cid", None),
        }
    else:
        agreement_record.download = {
            "is_downloadable": False,
            "requires_follow": False,
            "cid": None,
        }

    agreement_record.route_id = helpers.create_agreement_route_id(
        agreement_metadata["title"], handle
    )
    return agreement_record
