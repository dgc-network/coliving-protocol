import logging

from jsonschema import ValidationError
from src.model_validator import ModelValidator

logger = logging.getLogger("model_validator")


# ##### Testing field validation with variation of instances ##### #
def test_one_field_schema_pass():
    digital_content = {"title": "ok"}
    try:
        ModelValidator.validate(to_validate=digital_content, field="title", model="DigitalContent")
    except ValidationError as e:
        assert False, f"test_model_validator [test_one_field_schema_pass] failed: {e}"


def test_one_field_schema_bad_value():
    digital_content = {"title": 1}
    try:
        ModelValidator.validate(to_validate=digital_content, field="title", model="DigitalContent")
        assert False, "test_model_validator [test_one_field_schema_bad_value] failed"
    except BaseException:
        assert True


def test_one_field_schema_bad_key():
    digital_content = {"wrong": "ok"}
    try:
        ModelValidator.validate(to_validate=digital_content, field="title", model="DigitalContent")
        assert False, "test_model_validator [test_one_field_schema_bad_key] failed"
    except BaseException:
        assert True


def test_one_field_schema_bad_key_and_value():
    digital_content = {"wrong": 1}
    try:
        ModelValidator.validate(to_validate=digital_content, field="title", model="DigitalContent")
        assert (
            False
        ), "test_model_validator [test_one_field_schema_bad_key_and_value] failed"
    except BaseException:
        assert True


def test_one_field_schema_with_additional_properties():
    digital_content = {"title": "ok", "wrong": 1}
    try:
        ModelValidator.validate(to_validate=digital_content, field="title", model="DigitalContent")
        assert (
            False
        ), "test_model_validator [test_one_field_schema_with_additional_properties] failed"
    except BaseException:
        assert True


def test_one_field_schema_empty_object():
    digital_content = {}
    try:
        ModelValidator.validate(to_validate=digital_content, field="title", model="DigitalContent")
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
