"""Unit tests for Settings and Environment Validation (Phase 3A)."""
import pytest
from app.core.config import Settings


def test_development_settings_defaults():
    """Verifies that development settings initialize with expected defaults."""
    cfg = Settings(ENVIRONMENT="development")
    assert cfg.ENVIRONMENT == "development"
    assert not cfg.is_production
    assert cfg.database_dialect == "sqlite"
    assert cfg.AUTH_MODE == "auto"


def test_production_rejects_default_secret_key():
    """Verifies that production environment strictly rejects insecure default SECRET_KEY."""
    with pytest.raises(ValueError) as exc:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="solian-enterprise-dev-secret-key-change-in-production",
            AUTH_MODE="jwt",
            DATABASE_URL="postgresql://postgres:secret@localhost:5432/solian_db",
        )
    assert "Default or weak SECRET_KEY cannot be used in production" in str(exc.value)


def test_production_rejects_weak_short_secret_key():
    """Verifies that production environment strictly rejects secret keys under 32 characters."""
    with pytest.raises(ValueError) as exc:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="short-secret-key",
            AUTH_MODE="jwt",
            DATABASE_URL="postgresql://postgres:secret@localhost:5432/solian_db",
        )
    assert "SECRET_KEY" in str(exc.value)


def test_production_rejects_simulation_auth_mode():
    """Verifies that production environment rejects AUTH_MODE='simulation'."""
    with pytest.raises(ValueError) as exc:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a" * 36,  # 36 chars valid length
            AUTH_MODE="simulation",
            DATABASE_URL="postgresql://postgres:secret@localhost:5432/solian_db",
        )
    assert "AUTH_MODE='simulation' is strictly prohibited in production" in str(exc.value)


def test_production_strips_wildcard_cors():
    """Verifies that in production, wildcard CORS origin (*) is automatically removed."""
    cfg = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="production-super-secret-cryptographic-key-123456",
        AUTH_MODE="jwt",
        DATABASE_URL="postgresql://postgres:secret@localhost:5432/solian_db",
        CORS_ORIGINS=["https://frontend-solian-wolves.vercel.app", "*"],
    )
    assert "*" not in cfg.CORS_ORIGINS
    assert "https://frontend-solian-wolves.vercel.app" in cfg.CORS_ORIGINS


def test_production_valid_configuration_succeeds():
    """Verifies that production configuration succeeds when valid secrets, postgres database, and jwt auth are provided."""
    cfg = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="production-super-secret-cryptographic-key-123456",
        AUTH_MODE="jwt",
        SUPABASE_JWT_SECRET="supabase-production-jwt-secret-verification-token-key-123",
        DATABASE_URL="postgresql://postgres:secret@localhost:5432/solian_db",
    )
    assert cfg.is_production
    assert cfg.AUTH_MODE == "jwt"
    assert cfg.database_dialect == "postgres"
    assert cfg.jwt_secret == "supabase-production-jwt-secret-verification-token-key-123"


def test_production_rejects_sqlite_database():
    """Verifies that production environment strictly rejects SQLite or missing DATABASE_URL."""
    with pytest.raises(ValueError) as exc:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="production-super-secret-cryptographic-key-123456",
            AUTH_MODE="jwt",
            SUPABASE_JWT_SECRET="supabase-production-jwt-secret-verification-token-key-123",
            DATABASE_URL=None,  # SQLite default
        )
    assert "Production environment cannot use SQLite" in str(exc.value)


def test_database_dialect_contradiction_validation():
    """Verifies that Settings fails safely when DATABASE_DIALECT and DATABASE_URL contradict each other."""
    # 1. Dialect postgres but no PostgreSQL URL
    with pytest.raises(ValueError) as exc1:
        Settings(
            DATABASE_DIALECT="postgres",
            DATABASE_URL=None,
        )
    assert "DATABASE_DIALECT is set to 'postgres' but DATABASE_URL is not a valid PostgreSQL" in str(exc1.value)

    # 2. Dialect sqlite but PostgreSQL URL provided
    with pytest.raises(ValueError) as exc2:
        Settings(
            DATABASE_DIALECT="sqlite",
            DATABASE_URL="postgresql://postgres:secret@localhost:5432/solian_db",
        )
    assert "DATABASE_DIALECT is set to 'sqlite' but DATABASE_URL specifies a PostgreSQL" in str(exc2.value)

    # 3. Invalid dialect string
    with pytest.raises(ValueError) as exc3:
        Settings(
            DATABASE_DIALECT="oracle",
        )
    assert "Invalid DATABASE_DIALECT" in str(exc3.value)


def test_dynamic_repository_proxy_refuses_sqlite_in_production(monkeypatch):
    """Verifies that DynamicRepositoryProxy strictly refuses to silently route production requests to SQLite."""
    from app.core.config import settings
    from app.services.storage.sqlite_repository import DynamicRepositoryProxy

    proxy = DynamicRepositoryProxy()
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "DATABASE_URL", None)

    with pytest.raises(RuntimeError) as exc:
        _ = proxy.active_repo
    assert "Repository cannot route production requests to SQLite" in str(exc.value)


def test_jwt_secret_selection_prefers_supabase_jwt_secret():
    """Verifies that settings.jwt_secret prefers SUPABASE_JWT_SECRET when configured."""
    cfg = Settings(
        SECRET_KEY="internal-secret-key-for-dev-testing-purposes",
        SUPABASE_JWT_SECRET="supabase-dedicated-jwt-secret",
    )
    assert cfg.jwt_secret == "supabase-dedicated-jwt-secret"


def test_database_dialect_detection():
    """Tests dialect detection for SQLite vs PostgreSQL URLs."""
    sqlite_cfg = Settings(
        DATABASE_URL=None,
        DATABASE_PATH="solian_enterprise.db",
    )
    assert sqlite_cfg.database_dialect == "sqlite"

    pg_cfg = Settings(
        DATABASE_URL="postgresql://postgres:secret@localhost:5432/solian_db",
    )
    assert pg_cfg.database_dialect == "postgres"


def test_settings_enable_demo_fixtures_defaults_to_false():
    """Verifies that ENABLE_DEMO_FIXTURES defaults to False."""
    cfg = Settings(ENVIRONMENT="development")
    assert cfg.ENABLE_DEMO_FIXTURES is False


def test_production_rejects_demo_fixtures():
    """Verifies that production environment strictly rejects ENABLE_DEMO_FIXTURES=True."""
    with pytest.raises(ValueError) as exc:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="production-super-secret-cryptographic-key-123456",
            AUTH_MODE="jwt",
            SUPABASE_JWT_SECRET="supabase-production-jwt-secret-verification-token-key-123",
            DATABASE_URL="postgresql://postgres:secret@localhost:5432/solian_db",
            ENABLE_DEMO_FIXTURES=True,
        )
    assert "ENABLE_DEMO_FIXTURES cannot be True in production" in str(exc.value)

