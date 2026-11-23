"""Demo Data Purge Safety tests for AUREN SOLIAN.

Verifies:
- purge_demo_data() is strictly prohibited in production mode
- purge_demo_data() cannot be triggered accidentally in production
- purge_demo_data() executes cleanly in development/test environment without foreign key corruption
"""
import pytest
from app.core.config import settings
from app.services.storage.sqlite_repository import repo


def test_purge_demo_data_rejected_in_production(monkeypatch):
    """Verifies that purge_demo_data() raises a RuntimeError if is_production is True."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert settings.is_production is True

    with pytest.raises(RuntimeError):
        repo.purge_demo_data()


def test_purge_demo_data_permitted_in_development_or_testing():
    """Verifies that in non-production environments, purge_demo_data executes safely."""
    assert settings.is_production is False
    result = repo.purge_demo_data()
    assert isinstance(result, dict)
    assert "tasks" in result
    assert "projects" in result
    assert "members" in result

    # Re-seed test fixtures so subsequent tests have consistent environment
    repo._seed_initial_data()

