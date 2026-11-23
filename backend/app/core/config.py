"""Core application configuration for AUREN SOLIAN.

Enterprise-grade configuration layer supporting multiple environments:
- development: Local development using SQLite and local simulation fallback
- test: Isolated in-memory or disposable database testing
- staging: Staging environment against Supabase PostgreSQL and strict JWT
- production: High-security production environment requiring signed JWTs,
              production secrets, and strict CORS.
"""
from typing import List, Optional
from pydantic import Field, model_validator, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # =========================================================================
    # 1. Application & Runtime Configuration
    # =========================================================================
    APP_NAME: str = "AUREN SOLIAN Company AI API"
    PROJECT_NAME: str = "AUREN SOLIAN"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(
        default="development",
        description="Runtime environment: development | test | staging | production",
    )
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENABLE_DEMO_FIXTURES: bool = Field(
        default=False,
        description="Enable fictional demo data seeding. STRICTLY FALSE in production.",
    )

    # =========================================================================
    # 2. Enterprise Tenant Identity
    # =========================================================================
    ORGANIZATION_ID: str = "org-solian-wolves"
    ORGANIZATION_NAME: str = "Solian Wolves"
    ORGANIZATION_CODE: str = "SLN-WLV"

    # =========================================================================
    # 3. Database & Persistence Layer
    # =========================================================================
    DATABASE_URL: Optional[str] = Field(
        default=None,
        description="Connection URL for PostgreSQL/Supabase (postgresql://...) or SQLite (sqlite:///...)",
    )
    DATABASE_PATH: str = Field(
        default="solian_enterprise.db",
        description="Local SQLite database file path when DATABASE_URL is not set",
    )
    DATABASE_DIALECT: Optional[str] = Field(
        default=None,
        description="Explicit database dialect: 'postgres' | 'sqlite'. Must be consistent with DATABASE_URL.",
    )
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_AUTO_MIGRATE: bool = True

    # =========================================================================
    # 4. Security, Cryptographic Authentication & RBAC
    # =========================================================================
    AUTH_MODE: str = Field(
        default="auto",
        description="Auth enforcement mode: 'auto' (JWT with dev fallback), 'jwt' (strict JWT), 'simulation' (dev only)",
    )
    SECRET_KEY: str = Field(
        default="solian-enterprise-dev-secret-key-change-in-production",
        description="Cryptographic secret key for signing internal tokens and session cookies",
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Supabase Auth & JWT Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = Field(
        default="",
        description="Supabase JWT secret for validating incoming Bearer tokens",
    )
    SUPABASE_JWT_ALGORITHM: str = "HS256"
    SUPABASE_JWT_AUDIENCE: str = "authenticated"

    # =========================================================================
    # 5. AI & Large Language Model (LLM) Configuration
    # =========================================================================
    LLM_PROVIDER: str = "gemini"
    LLM_API_KEY: Optional[str] = None
    GEMINI_API_KEY: str = Field(
        default="",
        description="Google Gemini API Key",
    )
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    GROQ_API_KEY: str = Field(
        default="",
        description="Groq API Key for fast inference fallback",
    )
    GROQ_MODEL: str = "qwen/qwen3.8-27b"
    EMBEDDING_PROVIDER: str = "gemini"
    EMBEDDING_MODEL: str = "gemini-embedding-2"
    EMBEDDING_API_KEY: str = ""

    # =========================================================================
    # 6. CORS Policy Configuration
    # =========================================================================
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "https://frontend-solian-wolves.vercel.app",
        "*",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Allow comma-separated strings or JSON lists from environment variables."""
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [orig.strip() for orig in v.split(",") if orig.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        """
        Enforce strict security boundaries and dialect consistency:
        - Rejects configuration contradictions between DATABASE_DIALECT and DATABASE_URL.
        - In production:
          - Rejects SQLite or missing DATABASE_URL (PostgreSQL is required).
          - Insecure dev secret keys are strictly disallowed.
          - Simulation auth mode is strictly prohibited.
          - Wildcard CORS with credentials must not be blindly permitted.
        """
        # 1. Validate DATABASE_DIALECT vs DATABASE_URL consistency across all environments
        if self.DATABASE_DIALECT is not None:
            normalized_dialect = self.DATABASE_DIALECT.lower().strip()
            if normalized_dialect not in ("postgres", "sqlite"):
                raise ValueError(
                    f"Configuration error: Invalid DATABASE_DIALECT '{self.DATABASE_DIALECT}'. "
                    "Allowed values are 'postgres' or 'sqlite'."
                )

            is_pg_url = bool(
                self.DATABASE_URL
                and self.DATABASE_URL.lower().startswith(("postgres://", "postgresql://"))
            )

            if normalized_dialect == "postgres" and not is_pg_url:
                raise ValueError(
                    "Configuration contradiction: DATABASE_DIALECT is set to 'postgres' "
                    "but DATABASE_URL is not a valid PostgreSQL connection URL."
                )

            if normalized_dialect == "sqlite" and is_pg_url:
                raise ValueError(
                    "Configuration contradiction: DATABASE_DIALECT is set to 'sqlite' "
                    "but DATABASE_URL specifies a PostgreSQL database."
                )

        env = self.ENVIRONMENT.lower().strip()
        if env == "production":
            # 2. Reject SQLite or missing PostgreSQL DATABASE_URL in production
            if self.database_dialect != "postgres" or not self.DATABASE_URL or not self.DATABASE_URL.lower().startswith(("postgres://", "postgresql://")):
                raise ValueError(
                    "PRODUCTION ERROR: Production environment cannot use SQLite. "
                    "A valid PostgreSQL DATABASE_URL (postgresql://...) is required."
                )

            # 3. Reject default development secret
            if (
                self.SECRET_KEY == "solian-enterprise-dev-secret-key-change-in-production"
                or "dev-secret" in self.SECRET_KEY.lower()
                or len(self.SECRET_KEY) < 32
            ):
                raise ValueError(
                    "PRODUCTION ERROR: Default or weak SECRET_KEY cannot be used in production environment. "
                    "Set a secure, random SECRET_KEY of at least 32 characters."
                )

            # 4. Reject simulation auth mode in production
            if self.AUTH_MODE.lower() == "simulation":
                raise ValueError(
                    "PRODUCTION ERROR: AUTH_MODE='simulation' is strictly prohibited in production. "
                    "Use AUTH_MODE='jwt' or 'auto' with valid cryptographic secrets."
                )

            # 5. Reject wildcard CORS in production
            if "*" in self.CORS_ORIGINS:
                # Remove wildcard in production for safety
                self.CORS_ORIGINS = [orig for orig in self.CORS_ORIGINS if orig != "*"]

            # 6. Reject ENABLE_DEMO_FIXTURES in production
            if self.ENABLE_DEMO_FIXTURES:
                raise ValueError(
                    "PRODUCTION ERROR: ENABLE_DEMO_FIXTURES cannot be True in production environment."
                )

        return self

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower().strip() == "production"

    @property
    def is_test(self) -> bool:
        return self.ENVIRONMENT.lower().strip() == "test"

    @property
    def effective_gemini_key(self) -> str:
        import os
        return self.GEMINI_API_KEY or self.LLM_API_KEY or os.environ.get("GEMINI_API_KEY", "")

    @property
    def effective_groq_key(self) -> str:
        import os
        return self.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")

    @property
    def jwt_secret(self) -> str:
        """Returns the appropriate JWT secret key for signature verification."""
        return self.SUPABASE_JWT_SECRET or self.SECRET_KEY

    @property
    def database_dialect(self) -> str:
        """Returns the active database dialect: 'postgres' or 'sqlite'."""
        if self.DATABASE_DIALECT:
            return self.DATABASE_DIALECT.lower().strip()
        if self.DATABASE_URL:
            url_lower = self.DATABASE_URL.lower()
            if url_lower.startswith("postgres://") or url_lower.startswith("postgresql://"):
                return "postgres"
        return "sqlite"


settings = Settings()
