from pathlib import Path

from skill_analyzer.config import settings


def job_dir(job_id: str) -> Path:
    path = settings.storage_path / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def find_original(job_id: str) -> Path | None:
    folder = job_dir(job_id)
    for name in ("original.mp4", "original.webm", "original.mov", "processed.mp4"):
        candidate = folder / name
        if candidate.exists():
            return candidate
    matches = list(folder.glob("original.*"))
    return matches[0] if matches else None
