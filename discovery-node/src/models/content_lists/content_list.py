from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, validates
from src.model_validator import ModelValidator
from src.models.base import Base
from src.models.model_utils import RepresentableMixin, validate_field_helper


class ContentList(Base, RepresentableMixin):
    __tablename__ = "content_lists"

    blockhash = Column(ForeignKey("blocks.blockhash"))  # type: ignore
    blocknumber = Column(ForeignKey("blocks.number"), index=True)  # type: ignore
    content_list_id = Column(Integer, primary_key=True, nullable=False)
    content_list_owner_id = Column(Integer, nullable=False, index=True)
    is_album = Column(Boolean, nullable=False)
    is_private = Column(Boolean, nullable=False)
    content_list_name = Column(String)
    content_list_contents = Column(JSONB(), nullable=False)
    content_list_image_multihash = Column(String)
    is_current = Column(Boolean, primary_key=True, nullable=False)
    is_delete = Column(Boolean, nullable=False)
    description = Column(String)
    created_at = Column(DateTime, nullable=False, index=True)
    upc = Column(String)
    updated_at = Column(DateTime, nullable=False)
    content_list_image_sizes_multihash = Column(String)
    txhash = Column(
        String,
        primary_key=True,
        nullable=False,
        server_default=text("''::character varying"),
    )
    last_added_to = Column(DateTime)
    slot = Column(Integer)

    block = relationship(  # type: ignore
        "Block", primaryjoin="ContentList.blockhash == Block.blockhash"
    )
    block1 = relationship(  # type: ignore
        "Block", primaryjoin="ContentList.blocknumber == Block.number"
    )

    ModelValidator.init_model_schemas("ContentList")
    fields = ["content_list_name", "description"]

    # unpacking args into @validates
    @validates(*fields)
    def validate_field(self, field, value):
        return validate_field_helper(
            field, value, "ContentList", getattr(ContentList, field).type
        )
