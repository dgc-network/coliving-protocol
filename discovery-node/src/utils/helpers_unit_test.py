from src.utils.helpers import create_agreement_slug, is_fqdn


def test_create_agreement_slug_normal_title():
    title = "Karma Police"
    assert create_agreement_slug(title, 1, 0) == "karma-police"
    assert create_agreement_slug(title, 1, 3) == "karma-police-3"


def test_create_agreement_slug_long_characters():
    title = "#$*$(Strip\x00\x00\x00 !!@#*)&$(&#$%*Weird   + Characters"
    assert create_agreement_slug(title, 1, 0) == "strip-weird-characters"
    assert create_agreement_slug(title, 1, 3) == "strip-weird-characters-3"


def test_create_agreement_slug_only_bad_characters():
    title = "???"
    assert create_agreement_slug(title, 15633, 0) == "LjEvV"
    assert create_agreement_slug(title, 15633, 3) == "LjEvV-3"


def test_create_agreement_slug_bad_and_good_characters():
    title = "???f"
    assert create_agreement_slug(title, 15633, 0) == "f"
    assert create_agreement_slug(title, 15633, 3) == "f-3"


def test_create_agreement_slug_good_and_bad_characters():
    title = "f???"
    assert create_agreement_slug(title, 15633, 0) == "f"
    assert create_agreement_slug(title, 15633, 3) == "f-3"


def test_create_agreement_slug_chinese():
    title = "听妈妈的话"
    assert create_agreement_slug(title, 15633, 0) == "听妈妈的话"
    assert create_agreement_slug(title, 15633, 3) == "听妈妈的话-3"


def test_create_agreement_slug_unicode():
    title = "ñóนมนุษşoföre"
    assert create_agreement_slug(title, 15633, 0) == "ñóนมนุษşoföre"
    assert create_agreement_slug(title, 15633, 3) == "ñóนมนุษşoföre-3"


def test_create_agreement_slug_periods_and_punctuation():
    title = "Some: agreement; that has, like, punctuation!? everywhere."
    assert (
        create_agreement_slug(title, 0, 0)
        == "some-agreement-that-has-like-punctuation-everywhere"
    )


def test_create_agreement_slug_trailing_spaces():
    assert create_agreement_slug(" some agreement title ", 0, 0) == "some-agreement-title"
    assert create_agreement_slug("some ( original mix )", 0, 0) == "some-original-mix"
    assert create_agreement_slug("( some agreement title )", 0, 0) == "some-agreement-title"


def test_is_fqdn_url():
    assert is_fqdn("https://validurl1.domain.com") == True
    assert is_fqdn("http://validurl2.subdomain.domain.com") == True
    assert is_fqdn("http://cn2_content-node_1:4001") == True
    assert is_fqdn("http://www.example.$com\and%26here.html") == False
