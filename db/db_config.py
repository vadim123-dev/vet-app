# db.py
import os                                  # read configuration from environment variables
import uuid                                # work with UUIDs in Python
from dataclasses import dataclass          # simple, typed config object
from sqlalchemy import create_engine, text  # SQLAlchemy engine + safe SQL text()
from sqlalchemy.engine import Engine        # type hint for Engine


@dataclass(frozen=True)  # immutable config object (safer: no accidental changes at runtime)
class DBConfig:
    host: str
    port: int
    user: str
    password: str
    database: str

    @staticmethod
    def from_env() -> "DBConfig":
        # Pull values from env vars with sensible defaults for local dev.
        # In Docker, DB_HOST will be 'mysql' (container name)
        # Locally, DB_HOST defaults to '127.0.0.1'
        return DBConfig(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", "pandaTeya"),
            database=os.getenv("DB_NAME", "vet"),
        )


def create_db_engine(cfg: DBConfig) -> Engine:
    # Build SQLAlchemy database URL for MySQL using the PyMySQL driver.
    url = (
        f"mysql+pymysql://{cfg.user}:{cfg.password}"
        f"@{cfg.host}:{cfg.port}/{cfg.database}"
        f"?charset=utf8mb4"
    )

    # Engine = connection pool + DB dialect. Reused across requests.
    # pool_pre_ping=True checks dead connections (good for Docker / long-running apps).
    # pool_size/max_overflow control pool capacity.
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )


def uuid_to_bin(u: uuid.UUID) -> bytes:
    # Convert Python UUID -> 16 bytes for MySQL BINARY(16)
    return u.bytes


def bin_to_uuid(b: bytes) -> str:
    # Convert MySQL BINARY(16) -> UUID string
    return str(uuid.UUID(bytes=b))
