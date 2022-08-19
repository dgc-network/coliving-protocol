import logging

from jsonschema import ValidationError
from src.model_validator import ModelValidator

logger = logging.getLogger("model_validator")


# ##### Testing field validation with variation of instances ##### #
def test_one_field_schema_pass():
    agreement = {"title": "ok"}
    try:
        ModelValidator.validate(to_validate=agreement, field="title", model="Agreement")
    except ValidationError as e:
        assert False, f"test_model_validator [test_one_field_schema_pass] failed: {e}"


def test_one_field_schema_bad_value():
    agreement = {"title": 1}
    try:
        ModelValidator.validate(to_validate=agreement, field="title", model="Agreement")
        assert False, "test_model_validator [test_one_field_schema_bad_value] failed"
    except BaseException:
        assert True


def test_one_field_schema_bad_key():
    agreement = {"wrong": "ok"}
    try:
        ModelValidator.validate(to_validate=agreement, field="title", model="Agreement")
        assert False, "test_model_validator [test_one_field_schema_bad_key] failed"
    except BaseException:
        assert True


def test_one_field_schema_bad_key_and_value():
    agreement = {"wrong": 1}
    try:
        ModelValidator.validate(to_validate=agreement, field="title", model="Agreement")
        assert (
            False
        ), "test_model_validator [test_one_field_schema_bad_key_and_value] failed"
    except BaseException:
        assert True


def test_one_field_schema_with_additional_properties():
    agreement = {"title": "ok", "wrong": 1}
    try:
        ModelValidator.validate(to_validate=agreement, field="title", model="Agreement")
        assert (
            False
        ), "test_model_validator [test_one_field_schema_with_additional_properties] failed"
    except BaseException:
        assert True


def test_one_field_schema_empty_object():
    agreement = {}
    try:
        ModelValidator.validate(to_validate=agreement, field="title", model="Agreement")
        assert False, "test_model_validator [test_one_field_schema_empty_object] failed"
    except BaseException:
        assert True


# #### Testing field validation with variation of schemas ##### #
def test_schema_missing():
    try:
        ModelValidator.validate(to_validate={}, field="title", model="non-existant")
        assert False, "test_model_validator [test_one_field_schema_empty_object] failed"
    except BaseException:
        assert True


def test_schema_invalid_json():
    ModelValidator.BASE_PATH = "./integration_tests/res/"
    try:
        ModelValidator.validate(to_validate={}, field="title", model="bad")
        assert False, "test_model_validator [test_schema_invalid_json] failed"
    except BaseException:
        assert True


def test_schema_missing_model_key():
    ModelValidator.BASE_PATH = "./integration_tests/res/"

    try:
        ModelValidator.validate(to_validate={}, field="title", model="user_bad")
        assert False, "test_model_validator [test_schema_missing_model_key] failed"
    except BaseException:
        assert True
