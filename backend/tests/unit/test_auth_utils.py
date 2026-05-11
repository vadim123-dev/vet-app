import string
import pytest
from backend.utils.auth_utils import generate_strong_password


def test_password_has_correct_length():
    assert len(generate_strong_password(12)) == 12
    assert len(generate_strong_password(20)) == 20


def test_password_contains_required_character_types():
    password = generate_strong_password(12)
    assert any(c in string.ascii_lowercase for c in password)
    assert any(c in string.ascii_uppercase for c in password)
    assert any(c in string.digits for c in password)
    assert any(c in "!@#$%^&*" for c in password)


def test_password_raises_for_short_length():
    with pytest.raises(ValueError):
        generate_strong_password(7)
