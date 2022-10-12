from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    PrimaryKeyConstraint,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, validates
from src.model_validator import ModelValidator
from src.models.base import Base
from src.models.model_utils import (
    RepresentableMixin,
    get_fields_to_validate,
    validate_field_helper,
)
from src.models.agreements.digital_content_route import AgreementRoute
from src.models.users.user import User


class DigitalContent(Base, RepresentableMixin):
    __tablename__ = "agreements"

    blockhash = Column(ForeignKey("blocks.blockhash"))  # type: ignore
    digital_content_id = Column(Integer, primary_key=True, nullable=False)
    is_current = Column(Boolean, primary_key=True, nullable=False)
    is_delete = Column(Boolean, nullable=False)
    owner_id = Column(Integer, nullable=False, index=True)
    title = Column(Text)
    length = Column(Integer)
    cover_art = Column(String)
    tags = Column(String)
    genre = Column(String)
    mood = Column(String)
    credits_splits = Column(String)
    create_date = Column(String)
    release_date = Column(String)
    file_type = Column(String)
    metadata_multihash = Column(String)
    blocknumber = Column(ForeignKey("blocks.number"), index=True)  # type: ignore
    digital_content_segments = Column(JSONB(), nullable=False)
    created_at = Column(DateTime, nullable=False, index=True)
    description = Column(String)
    isrc = Column(String)
    iswc = Column(String)
    license = Column(String)
    updated_at = Column(DateTime, nullable=False)
    cover_art_sizes = Column(String)
    download = Column(JSONB())
    is_unlisted = Column(Boolean, nullable=False, server_default=text("false"))
    field_visibility = Column(JSONB())
    route_id = Column(String)
    stem_of = Column(JSONB())
    remix_of = Column(JSONB())
    txhash = Column(
        String,
        primary_key=True,
        nullable=False,
        server_default=text("''::character varying"),
    )
    slot = Column(Integer)
    is_available = Column(Boolean, nullable=False, server_default=text("true"))

    block = relationship(  # type: ignore
        "Block", primaryjoin="DigitalContent.blockhash == Block.blockhash"
    )
    block1 = relationship(  # type: ignore
        "Block", primaryjoin="DigitalContent.blocknumber == Block.number"
    )

    _routes = relationship(  # type: ignore
        AgreementRoute,
        primaryjoin="and_(\
            remote(DigitalContent.digital_content_id) == foreign(AgreementRoute.digital_content_id),\
            AgreementRoute.is_current)",
        lazy="joined",
        viewonly=True,
    )

    user = relationship(  # type: ignore
        User,
        primaryjoin="and_(\
            remote(DigitalContent.owner_id) == foreign(User.user_id),\
            User.is_current)",
        lazy="joined",
        viewonly=True,
    )

    @property
    def _slug(self):
        return self._routes[0].slug if self._routes else ""

    @property
    def permalink(self):
        if self.user and self.user[0].handle and self._slug:
            return f"/{self.user[0].handle}/{self._slug}"
        return ""

    PrimaryKeyConstraint(is_current, digital_content_id, txhash)

    ModelValidator.init_model_schemas("DigitalContent")
    fields = get_fields_to_validate("DigitalContent")

    # unpacking args into @validates
    @validates(*fields)
    def validate_field(self, field, value):
        return validate_field_helper(field, value, "DigitalContent", getattr(DigitalContent, field).type)
