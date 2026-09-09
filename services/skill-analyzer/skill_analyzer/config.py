import os
from pathlib import Path

from dotenv import load_dotenv

_REPO_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_REPO_ROOT / ".env.local")
load_dotenv()


def _bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/playplayplay",
    )
    skill_analyzer_secret: str = os.getenv("SKILL_ANALYZER_SECRET", "")
    redis_url: str = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    storage_dir: str = os.getenv("STORAGE_DIR", "")
    cors_origins: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,https://www.playplayplay.fun,https://playplayplay.fun",
    )
    skill_analyzer_inline: bool = _bool("SKILL_ANALYZER_INLINE", False)
    max_duration_sec: int = int(os.getenv("SKILL_MAX_DURATION_SEC", "300"))
    max_upload_bytes: int = int(os.getenv("SKILL_MAX_BYTES", str(200 * 1024 * 1024)))

    @property
    def storage_path(self) -> Path:
        if self.storage_dir:
            return Path(self.storage_dir).resolve()
        return _REPO_ROOT / "storage" / "skill-videos"

    @property
    def origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


settings = Settings()
