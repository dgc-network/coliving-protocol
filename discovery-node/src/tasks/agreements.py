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
from src.models.agreements.digital_content import DigitalContent
from src.models.agreements.digital_content_route import AgreementRoute
from src.models.users.user import User
from src.queries.skipped_transactions import add_node_level_skipped_transaction
from src.utils import helpers, multihash
from src.utils.indexing_errors import EntityMissingRequiredFieldError, IndexingError
from src.utils.model_nullable_validator import all_required_fields_present
from src.utils.prometheus_metric import PrometheusMetric, PrometheusMetricNames
from src.utils.digital_content_event_constants import (
    digital_content_event_types_arr,
    digital_content_event_types_lookup,
)

logger = logging.getLogger(__name__)


def digital_content_state_update(
    self,
    update_task: DatabaseTask,
    session: Session,
    digital_content_factory_txs,
    block_number,
    block_timestamp,
    block_hash,
    ipfs_metadata,
) -> Tuple[int, Set]:
    """Return tuple containing int representing number of DigitalContent model state changes found in transaction and set of processed digital_content IDs."""
    begin_digital_content_state_update = datetime.now()
    metric = PrometheusMetric(PrometheusMetricNames.AGREEMENT_STATE_UPDATE_DURATION_SECONDS)

    blockhash = update_task.web3.toHex(block_hash)
    num_total_changes = 0
    skipped_tx_count = 0
    # This stores the digital_content_ids created or updated in the set of transactions
    digital_content_ids: Set[int] = set()

    if not digital_content_factory_txs:
        return num_total_changes, digital_content_ids

    pending_digital_content_routes: List[AgreementRoute] = []
    digital_content_events: Dict[int, Dict[str, Any]] = {}
    for tx_receipt in digital_content_factory_txs:
        txhash = update_task.web3.toHex(tx_receipt.transactionHash)
        for event_type in digital_content_event_types_arr:
            digital_content_events_tx = get_digital_content_events_tx(update_task, event_type, tx_receipt)
            processedEntries = 0  # if record does not get added, do not count towards num_total_changes
            for entry in digital_content_events_tx:
                digital_content_event_start_time = time()
                event_args = entry["args"]
                digital_content_id = (
                    helpers.get_tx_arg(entry, "_digital_contentId")
                    if "_digital_contentId" in event_args
                    else helpers.get_tx_arg(entry, "_id")
                )
                existing_digital_content_record = None
                digital_content_metadata = None
                try:
                    # look up or populate existing record
                    if digital_content_id in digital_content_events:
                        existing_digital_content_record = digital_content_events[digital_content_id]["digital_content"]
                    else:
                        existing_digital_content_record = lookup_digital_content_record(
                            update_task,
                            session,
                            entry,
                            digital_content_id,
                            block_number,
                            blockhash,
                            txhash,
                        )
                    # parse digital_content event to add metadata to record
                    if event_type in [
                        digital_content_event_types_lookup["new_digital_content"],
                        digital_content_event_types_lookup["update_digital_content"],
                    ]:
                        digital_content_metadata_digest = event_args._multihashDigest.hex()
                        digital_content_metadata_hash_fn = event_args._multihashHashFn
                        buf = multihash.encode(
                            bytes.fromhex(digital_content_metadata_digest), digital_content_metadata_hash_fn
                        )
                        cid = multihash.to_b58_string(buf)
                        digital_content_metadata = ipfs_metadata[cid]

                    parsed_digital_content = parse_digital_content_event(
                        self,
                        session,
                        update_task,
                        entry,
                        event_type,
                        existing_digital_content_record,
                        block_number,
                        block_timestamp,
                        digital_content_metadata,
                        pending_digital_content_routes,
                    )

                    if parsed_digital_content is not None:
                        if digital_content_id not in digital_content_events:
                            digital_content_events[digital_content_id] = {
                                "digital_content": parsed_digital_content,
                                "events": [],
                            }
                        else:
                            digital_content_events[digital_content_id]["digital_content"] = parsed_digital_content
                        digital_content_events[digital_content_id]["events"].append(event_type)
                        digital_content_ids.add(digital_content_id)
                        processedEntries += 1
                except EntityMissingRequiredFieldError as e:
                    logger.warning(f"Skipping tx {txhash} with error {e}")
                    skipped_tx_count += 1
                    add_node_level_skipped_transaction(
                        session, block_number, blockhash, txhash
                    )
                    pass
                except Exception as e:
                    logger.info("Error in parse digital_content transaction")
                    raise IndexingError(
                        "digital_content", block_number, blockhash, txhash, str(e)
                    ) from e
                metric.save_time(
                    {"scope": "digital_content_event"}, start_time=digital_content_event_start_time
                )

            num_total_changes += processedEntries

    logger.info(
        f"index.py | agreements.py | [digital_content indexing] There are {num_total_changes} events processed and {skipped_tx_count} skipped transactions."
    )

    for digital_content_id, value_obj in digital_content_events.items():
        if value_obj["events"]:
            logger.info(f"index.py | agreements.py | Adding {value_obj['digital_content']}")
            invalidate_old_digital_content(session, digital_content_id)
            session.add(value_obj["digital_content"])

    if num_total_changes:
        metric.save_time({"scope": "full"})
        logger.info(
            f"index.py | agreements.py | digital_content_state_update | finished digital_content_state_update in {datetime.now() - begin_digital_content_state_update} // per event: {(datetime.now() - begin_digital_content_state_update) / num_total_changes} secs"
        )
    return num_total_changes, digital_content_ids


def get_digital_content_events_tx(update_task, event_type, tx_receipt):
    return getattr(update_task.digital_content_contract.events, event_type)().processReceipt(
        tx_receipt
    )


def lookup_digital_content_record(
    update_task, session, entry, event_digital_content_id, block_number, block_hash, txhash
):
    # Check if digital_content record exists
    digital_content_exists = session.query(DigitalContent).filter_by(digital_content_id=event_digital_content_id).count() > 0

    digital_content_record = None
    if digital_content_exists:
        digital_content_record = (
            session.query(DigitalContent)
            .filter(DigitalContent.digital_content_id == event_digital_content_id, DigitalContent.is_current == True)
            .first()
        )

        # expunge the result from sqlalchemy so we can modify it without UPDATE statements being made
        # https://stackoverflow.com/questions/28871406/how-to-clone-a-sqlalchemy-db-object-with-new-primary-key
        session.expunge(digital_content_record)
        make_transient(digital_content_record)
    else:
        digital_content_record = DigitalContent(digital_content_id=event_digital_content_id, is_current=True, is_delete=False)

    # update block related fields regardless of type
    digital_content_record.blocknumber = block_number
    digital_content_record.blockhash = block_hash
    digital_content_record.txhash = txhash
    return digital_content_record


def invalidate_old_digital_content(session, digital_content_id):
    digital_content_exists = session.query(DigitalContent).filter_by(digital_content_id=digital_content_id).count() > 0

    if not digital_content_exists:
        return

    num_invalidated_digital_contents = (
        session.query(DigitalContent)
        .filter(DigitalContent.digital_content_id == digital_content_id, DigitalContent.is_current == True)
        .update({"is_current": False})
    )
    assert (
        num_invalidated_digital_contents > 0
    ), "Update operation requires a current digital_content to be invalidated"


def invalidate_old_digital_contents(session, digital_content_ids):
    for digital_content_id in digital_content_ids:
        invalidate_old_digital_content(session, digital_content_id)


def update_stems_table(session, digital_content_record, digital_content_metadata):
    if ("stem_of" not in digital_content_metadata) or (
        not isinstance(digital_content_metadata["stem_of"], dict)
    ):
        return
    parent_digital_content_id = digital_content_metadata["stem_of"].get("parent_digital_content_id")
    if not isinstance(parent_digital_content_id, int):
        return

    # Avoid re-adding stem if it already exists
    existing_stem = (
        session.query(Stem)
        .filter_by(
            parent_digital_content_id=parent_digital_content_id, child_digital_content_id=digital_content_record.digital_content_id
        )
        .first()
    )
    if existing_stem:
        return

    stem = Stem(parent_digital_content_id=parent_digital_content_id, child_digital_content_id=digital_content_record.digital_content_id)
    session.add(stem)


def update_remixes_table(session, digital_content_record, digital_content_metadata):
    child_digital_content_id = digital_content_record.digital_content_id

    # Delete existing remix parents
    session.query(Remix).filter_by(child_digital_content_id=child_digital_content_id).delete()

    # Add all remixes
    if "remix_of" in digital_content_metadata and isinstance(digital_content_metadata["remix_of"], dict):
        agreements = digital_content_metadata["remix_of"].get("agreements")
        if agreements and isinstance(agreements, list):
            for digital_content in agreements:
                if not isinstance(digital_content, dict):
                    continue
                parent_digital_content_id = digital_content.get("parent_digital_content_id")
                if isinstance(parent_digital_content_id, int):
                    remix = Remix(
                        parent_digital_content_id=parent_digital_content_id, child_digital_content_id=child_digital_content_id
                    )
                    session.add(remix)


@helpers.time_method
def update_digital_content_routes_table(
    session, digital_content_record, digital_content_metadata, pending_digital_content_routes
):
    """Creates the route for the given digital_content"""

    # Check if the title is staying the same, and if so, return early
    if digital_content_record.title == digital_content_metadata["title"]:
        return

    # Get the title slug, and set the new slug to that
    # (will check for conflicts later)
    new_digital_content_slug_title = helpers.create_digital_content_slug(
        digital_content_metadata["title"], digital_content_record.digital_content_id
    )
    new_digital_content_slug = new_digital_content_slug_title

    # Find the current route for the digital_content
    # Check the pending digital_content route updates first
    prev_digital_content_route_record = next(
        (
            route
            for route in pending_digital_content_routes
            if route.is_current and route.digital_content_id == digital_content_record.digital_content_id
        ),
        None,
    )
    # Then query the DB if necessary
    if prev_digital_content_route_record is None:
        prev_digital_content_route_record = (
            session.query(AgreementRoute)
            .filter(
                AgreementRoute.digital_content_id == digital_content_record.digital_content_id,
                AgreementRoute.is_current == True,
            )  # noqa: E712
            .one_or_none()
        )

    if prev_digital_content_route_record is not None:
        if prev_digital_content_route_record.title_slug == new_digital_content_slug_title:
            # If the title slug hasn't changed, we have no work to do
            return
        # The new route will be current
        prev_digital_content_route_record.is_current = False

    # Check for collisions by slug titles, and get the max collision_id
    max_collision_id: Optional[int] = None
    # Check pending updates first
    for route in pending_digital_content_routes:
        if (
            route.title_slug == new_digital_content_slug_title
            and route.owner_id == digital_content_record.owner_id
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
                AgreementRoute.title_slug == new_digital_content_slug_title,
                AgreementRoute.owner_id == digital_content_record.owner_id,
            )
            .one_or_none()
        )[0]

    existing_digital_content_route: Optional[AgreementRoute] = None
    # If the new digital_content_slug ends in a digit, there's a possibility it collides
    # with an existing route when the collision_id is appended to its title_slug
    if new_digital_content_slug[-1].isdigit():
        existing_digital_content_route = next(
            (
                route
                for route in pending_digital_content_routes
                if route.slug == new_digital_content_slug
                and route.owner_id == digital_content_record.owner_id
            ),
            None,
        )
        if existing_digital_content_route is None:
            existing_digital_content_route = (
                session.query(AgreementRoute)
                .filter(
                    AgreementRoute.slug == new_digital_content_slug,
                    AgreementRoute.owner_id == digital_content_record.owner_id,
                )
                .one_or_none()
            )

    new_collision_id = 0
    has_collisions = existing_digital_content_route is not None

    if max_collision_id is not None:
        has_collisions = True
        new_collision_id = max_collision_id
    while has_collisions:
        # If there is an existing digital_content by the user with that slug,
        # then we need to append the collision number to the slug
        new_collision_id += 1
        new_digital_content_slug = helpers.create_digital_content_slug(
            digital_content_metadata["title"], digital_content_record.digital_content_id, new_collision_id
        )

        # Check for new collisions after making the new slug
        # In rare cases the user may have digital_content names that end in numbers that
        # conflict with this digital_content name when the collision id is appended,
        # for example they could be trying to create a route that conflicts
        # with the old routing (of appending -{digital_content_id}) This is a fail safe
        # to increment the collision ID until no such collisions are present.
        #
        # Example scenario:
        #   - User uploads digital_content titled "DigitalContent" (title_slug: 'digital_content')
        #   - User uploads digital_content titled "DigitalContent 1" (title_slug: 'digital-content-1')
        #   - User uploads digital_content titled "DigitalContent" (title_slug: 'digital_content')
        #       - Try collision_id: 1, slug: 'digital-content-1' and find new collision
        #       - Use collision_id: 2, slug: 'digital-content-2'
        #   - User uploads digital_content titled "DigitalContent" (title_slug: 'digital_content')
        #       - Use collision_id: 3, slug: 'digital-content-3'
        #   - User uploads digital_content titled "DigitalContent 1" (title_slug: 'digital-content-1')
        #       - Use collision_id: 1, slug: 'digital-content-1-1'
        #
        # This may be expensive with many collisions, but should be rare.
        existing_digital_content_route = next(
            (
                route
                for route in pending_digital_content_routes
                if route.slug == new_digital_content_slug
                and route.owner_id == digital_content_record.owner_id
            ),
            None,
        )
        if existing_digital_content_route is None:
            existing_digital_content_route = (
                session.query(AgreementRoute)
                .filter(
                    AgreementRoute.slug == new_digital_content_slug,
                    AgreementRoute.owner_id == digital_content_record.owner_id,
                )
                .one_or_none()
            )
        has_collisions = existing_digital_content_route is not None

    # Add the new digital_content route
    new_digital_content_route = AgreementRoute()
    new_digital_content_route.slug = new_digital_content_slug
    new_digital_content_route.title_slug = new_digital_content_slug_title
    new_digital_content_route.collision_id = new_collision_id
    new_digital_content_route.owner_id = digital_content_record.owner_id
    new_digital_content_route.digital_content_id = digital_content_record.digital_content_id
    new_digital_content_route.is_current = True
    new_digital_content_route.blockhash = digital_content_record.blockhash
    new_digital_content_route.blocknumber = digital_content_record.blocknumber
    new_digital_content_route.txhash = digital_content_record.txhash
    session.add(new_digital_content_route)

    # Add to pending digital_content routes so we don't add the same route twice
    pending_digital_content_routes.append(new_digital_content_route)


def parse_digital_content_event(
    self,
    session,
    update_task: DatabaseTask,
    entry,
    event_type,
    digital_content_record,
    block_number,
    block_timestamp,
    digital_content_metadata,
    pending_digital_content_routes,
):
    challenge_bus = update_task.challenge_event_bus
    # Just use block_timestamp as integer
    block_datetime = datetime.utcfromtimestamp(block_timestamp)

    if event_type == digital_content_event_types_lookup["new_digital_content"]:
        digital_content_record.created_at = block_datetime

        digital_content_metadata_digest = helpers.get_tx_arg(entry, "_multihashDigest").hex()
        digital_content_metadata_hash_fn = helpers.get_tx_arg(entry, "_multihashHashFn")
        buf = multihash.encode(
            bytes.fromhex(digital_content_metadata_digest), digital_content_metadata_hash_fn
        )
        digital_content_metadata_multihash = multihash.to_b58_string(buf)
        logger.info(
            f"index.py | agreements.py | digital_content metadata ipld : {digital_content_metadata_multihash}"
        )

        owner_id = helpers.get_tx_arg(entry, "_digital_contentOwnerId")
        digital_content_record.owner_id = owner_id
        digital_content_record.is_delete = False

        handle = (
            session.query(User.handle)
            .filter(User.user_id == owner_id, User.is_current == True)
            .first()
        )[0]
        if not handle:
            raise EntityMissingRequiredFieldError(
                "digital_content",
                digital_content_record,
                f"No user found for {digital_content_record}",
            )

        update_digital_content_routes_table(
            session, digital_content_record, digital_content_metadata, pending_digital_content_routes
        )
        digital_content_record = populate_digital_content_record_metadata(
            digital_content_record, digital_content_metadata, handle
        )
        digital_content_record.metadata_multihash = digital_content_metadata_multihash

        # if cover_art CID is of a dir, store under _sizes field instead
        if digital_content_record.cover_art:
            logger.info(
                f"index.py | agreements.py | Processing digital_content cover art {digital_content_record.cover_art}"
            )
            digital_content_record.cover_art_sizes = digital_content_record.cover_art
            digital_content_record.cover_art = None

        update_stems_table(session, digital_content_record, digital_content_metadata)
        update_remixes_table(session, digital_content_record, digital_content_metadata)
        dispatch_challenge_digital_content_upload(challenge_bus, block_number, digital_content_record)

    if event_type == digital_content_event_types_lookup["update_digital_content"]:
        upd_digital_content_metadata_digest = helpers.get_tx_arg(entry, "_multihashDigest").hex()
        upd_digital_content_metadata_hash_fn = helpers.get_tx_arg(entry, "_multihashHashFn")
        update_buf = multihash.encode(
            bytes.fromhex(upd_digital_content_metadata_digest), upd_digital_content_metadata_hash_fn
        )
        upd_digital_content_metadata_multihash = multihash.to_b58_string(update_buf)
        logger.info(
            f"index.py | agreements.py | update digital_content metadata ipld : {upd_digital_content_metadata_multihash}"
        )

        owner_id = helpers.get_tx_arg(entry, "_digital_contentOwnerId")
        digital_content_record.owner_id = owner_id
        digital_content_record.is_delete = False

        handle = (
            session.query(User.handle)
            .filter(User.user_id == owner_id, User.is_current == True)
            .first()
        )[0]
        if not handle:
            raise EntityMissingRequiredFieldError(
                "digital_content",
                digital_content_record,
                f"No user found for {digital_content_record}",
            )

        update_digital_content_routes_table(
            session, digital_content_record, digital_content_metadata, pending_digital_content_routes
        )
        digital_content_record = populate_digital_content_record_metadata(
            digital_content_record, digital_content_metadata, handle
        )
        digital_content_record.metadata_multihash = upd_digital_content_metadata_multihash

        # All incoming cover art is intended to be a directory
        # Any write to cover_art field is replaced by cover_art_sizes
        if digital_content_record.cover_art:
            logger.info(
                f"index.py | agreements.py | Processing digital_content cover art {digital_content_record.cover_art}"
            )
            digital_content_record.cover_art_sizes = digital_content_record.cover_art
            digital_content_record.cover_art = None

        update_remixes_table(session, digital_content_record, digital_content_metadata)

    if event_type == digital_content_event_types_lookup["delete_digital_content"]:
        digital_content_record.is_delete = True
        digital_content_record.stem_of = null()
        digital_content_record.remix_of = null()
        logger.info(f"index.py | agreements.py | Removing digital_content : {digital_content_record.digital_content_id}")

    digital_content_record.updated_at = block_datetime

    if not all_required_fields_present(DigitalContent, digital_content_record):
        raise EntityMissingRequiredFieldError(
            "digital_content",
            digital_content_record,
            f"Error parsing digital_content {digital_content_record} with entity missing required field(s)",
        )

    return digital_content_record


def dispatch_challenge_digital_content_upload(
    bus: ChallengeEventBus, block_number: int, digital_content_record
):
    bus.dispatch(ChallengeEvent.digital_content_upload, block_number, digital_content_record.owner_id)


def is_valid_json_field(metadata, field):
    if field in metadata and isinstance(metadata[field], dict) and metadata[field]:
        return True
    return False


def populate_digital_content_record_metadata(digital_content_record, digital_content_metadata, handle):
    digital_content_record.title = digital_content_metadata["title"]
    digital_content_record.length = digital_content_metadata["length"] or 0
    digital_content_record.cover_art = digital_content_metadata["cover_art"]
    if digital_content_metadata["cover_art_sizes"]:
        digital_content_record.cover_art = digital_content_metadata["cover_art_sizes"]
    digital_content_record.tags = digital_content_metadata["tags"]
    digital_content_record.genre = digital_content_metadata["genre"]
    digital_content_record.mood = digital_content_metadata["mood"]
    digital_content_record.credits_splits = digital_content_metadata["credits_splits"]
    digital_content_record.create_date = digital_content_metadata["create_date"]
    digital_content_record.release_date = digital_content_metadata["release_date"]
    digital_content_record.file_type = digital_content_metadata["file_type"]
    digital_content_record.description = digital_content_metadata["description"]
    digital_content_record.license = digital_content_metadata["license"]
    digital_content_record.isrc = digital_content_metadata["isrc"]
    digital_content_record.iswc = digital_content_metadata["iswc"]
    digital_content_record.digital_content_segments = digital_content_metadata["digital_content_segments"]
    digital_content_record.is_unlisted = digital_content_metadata["is_unlisted"]
    digital_content_record.field_visibility = digital_content_metadata["field_visibility"]
    if is_valid_json_field(digital_content_metadata, "stem_of"):
        digital_content_record.stem_of = digital_content_metadata["stem_of"]
    else:
        digital_content_record.stem_of = null()
    if is_valid_json_field(digital_content_metadata, "remix_of"):
        digital_content_record.remix_of = digital_content_metadata["remix_of"]
    else:
        digital_content_record.remix_of = null()

    if "download" in digital_content_metadata:
        digital_content_record.download = {
            "is_downloadable": digital_content_metadata["download"].get("is_downloadable")
            == True,
            "requires_follow": digital_content_metadata["download"].get("requires_follow")
            == True,
            "cid": digital_content_metadata["download"].get("cid", None),
        }
    else:
        digital_content_record.download = {
            "is_downloadable": False,
            "requires_follow": False,
            "cid": None,
        }

    digital_content_record.route_id = helpers.create_digital_content_route_id(
        digital_content_metadata["title"], handle
    )
    return digital_content_record
