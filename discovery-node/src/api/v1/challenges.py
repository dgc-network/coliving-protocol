import logging

from flask_restx import Namespace, Resource, abort, fields, reqparse
from src.api.v1.helpers import (
    DescriptiveArgument,
    decode_with_abort,
    extend_undisbursed_challenge,
    get_current_user_id,
    make_response,
    pagination_parser,
    success_response,
)
from src.api.v1.models.challenges import (
    attestation,
    create_sender_attestation,
    undisbursed_challenge,
)
from src.queries.get_attestation import (
    AttestationError,
    get_attestation,
    get_create_sender_attestation,
)
from src.queries.get_undisbursed_challenges import get_undisbursed_challenges
from src.utils.db_session import get_db_read_replica
from src.utils.redis_cache import cache

logger = logging.getLogger(__name__)

ns = Namespace("challenges", description="Challenge related operations")

attestation_response = make_response(
    "attestation_reponse", ns, fields.Nested(attestation)
)

attest_route = "/<string:challenge_id>/attest"

attest_parser = reqparse.RequestParser(argument_class=DescriptiveArgument)
attest_parser.add_argument(
    "oracle",
    required=True,
    description="The address of a valid, registered Anti-Abuse Oracle",
)
attest_parser.add_argument(
    "specifier",
    required=True,
    description="The specifier of the user challenge requiring the attestation",
)
attest_parser.add_argument(
    "user_id",
    required=True,
    description="The user ID of the user challenge requiring the attestation",
)


@ns.route(attest_route, doc=False)
class Attest(Resource):
    @ns.doc(
        id="Get Challenge Attestation",
        description="Produces an attestation that a given user has completed a challenge, or errors.",
        params={
            "challenge_id": "The challenge ID of the user challenge requiring the attestation"
        },
        responses={
            200: "Success",
            400: "The attestation request was invalid (eg. The user didn't complete that challenge yet)",
            500: "Server error",
        },
    )
    @ns.expect(attest_parser)
    @ns.marshal_with(attestation_response)
    @cache(ttl_sec=5)
    def get(self, challenge_id: str):
        args = attest_parser.parse_args(strict=True)
        user_id: str = args["user_id"]
        oracle_address: str = args["oracle"]
        specifier: str = args["specifier"]
        decoded_user_id = decode_with_abort(user_id, ns)
        db = get_db_read_replica()
        with db.scoped_session() as session:
            try:
                owner_wallet, signature = get_attestation(
                    session,
                    user_id=decoded_user_id,
                    oracle_address=oracle_address,
                    specifier=specifier,
                    challenge_id=challenge_id,
                )

                return success_response(
                    {"owner_wallet": owner_wallet, "attestation": signature}
                )
            except AttestationError as e:
                abort(400, e)
                return None


undisbursed_route = "/undisbursed"

get_undisbursed_challenges_route_parser = pagination_parser.copy()
get_undisbursed_challenges_route_parser.add_argument(
    "user_id",
    required=False,
    description="A User ID to filter the undisbursed challenges to a particular user",
)
get_undisbursed_challenges_route_parser.add_argument(
    "completed_blocknumber",
    required=False,
    type=int,
    description="Starting blocknumber to retrieve completed undisbursed challenges",
)

get_challenges_response = make_response(
    "undisbursed_challenges", ns, fields.List(fields.Nested(undisbursed_challenge))
)


@ns.route(undisbursed_route, doc=False)
class GetUndisbursedChallenges(Resource):
    @ns.doc(
        id="""Get Undisbursed Challenges""",
        description="""Get all undisbursed challenges""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(get_undisbursed_challenges_route_parser)
    @ns.marshal_with(get_challenges_response)
    @cache(ttl_sec=5)
    def get(self):
        args = get_undisbursed_challenges_route_parser.parse_args()
        decoded_id = get_current_user_id(args)
        db = get_db_read_replica()

        with db.scoped_session() as session:
            undisbursed_challenges = get_undisbursed_challenges(
                session,
                {
                    "user_id": decoded_id,
                    "limit": args["limit"],
                    "offset": args["offset"],
                    "completed_blocknumber": args["completed_blocknumber"],
                },
            )
            undisbursed_challenges = list(
                map(extend_undisbursed_challenge, undisbursed_challenges)
            )
            return success_response(undisbursed_challenges)


create_sender_attest_route = "/attest_sender"

create_sender_attest_parser = reqparse.RequestParser(argument_class=DescriptiveArgument)
create_sender_attest_parser.add_argument(
    "sender_eth_address",
    required=True,
    description="The address of the discovery node to attest for",
)

create_sender_attestation_response = make_response(
    "attestation_response", ns, fields.Nested(create_sender_attestation)
)


@ns.route(create_sender_attest_route, doc=False)
class CreateSenderAttestation(Resource):
    @ns.doc(
        id="""Get Create Sender Attestation""",
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.expect(create_sender_attest_parser)
    @ns.marshal_with(create_sender_attestation_response)
    @cache(ttl_sec=5)
    def get(self):
        """
        Creates an attestation for a discovery node that it can attest for challenges.

        Produces an attestation that a specified discovery node is a validated, on-chain discovery node that can be used to sign challenges.
        """
        args = create_sender_attest_parser.parse_args(strict=True)
        sender_eth_address = args["sender_eth_address"]
        try:
            owner_wallet, attestation = get_create_sender_attestation(
                sender_eth_address
            )
            return success_response(
                {"owner_wallet": owner_wallet, "attestation": attestation}
            )
        except Exception as e:
            abort(400, e)
            return None
