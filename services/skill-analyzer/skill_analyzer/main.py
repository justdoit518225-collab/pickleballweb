from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from skill_analyzer.auth import token_from_request, verify_job_token
from skill_analyzer.config import settings
from skill_analyzer.db import get_job, update_job
from skill_analyzer.pipeline.preprocess import probe_duration_sec
from skill_analyzer.storage import find_original, job_dir
from skill_analyzer.tasks import run_analyze, run_preview_detect


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        settings.storage_path.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass
    yield


app = FastAPI(title="Pickleball Skill Analyzer", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origin_list or ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Accept-Ranges", "Content-Range", "Content-Length"],
)

ALLOWED_EXT = {".mp4", ".webm", ".mov"}


def _check(job_id: str, token: str | None, header_token: str | None) -> None:
    verify_job_token(token_from_request(token, header_token), job_id)


@app.get("/")
def root():
    return {"ok": True, "service": "skill-analyzer"}


@app.get("/health")
def health():
    return {"ok": True, "inline": settings.skill_analyzer_inline}


@app.post("/jobs/{job_id}/upload")
async def upload_video(
    job_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    token: str | None = None,
    x_skill_token: str | None = Header(default=None, alias="X-Skill-Token"),
):
    _check(job_id, token, x_skill_token)
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="找不到分析任務")

    suffix = Path(file.filename or "clip.mp4").suffix.lower() or ".mp4"
    if suffix not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="僅支援 MP4 / WebM / MOV")

    dest = job_dir(job_id) / f"original{suffix}"
    size = 0
    with dest.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > settings.max_upload_bytes:
                dest.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="檔案超過 200MB")
            out.write(chunk)

    duration = probe_duration_sec(dest)
    update_job(
        job_id,
        storageKey=job_id,
        durationSec=duration,
        status="CREATED",
        progress=0,
        errorMessage=None,
    )
    background_tasks.add_task(run_preview_detect, job_id)
    return {"ok": True, "bytes": size, "durationSec": duration}


@app.post("/jobs/{job_id}/analyze")
def enqueue_analyze(
    job_id: str,
    background_tasks: BackgroundTasks,
    token: str | None = None,
    x_skill_token: str | None = Header(default=None, alias="X-Skill-Token"),
):
    _check(job_id, token, x_skill_token)
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="找不到分析任務")
    if not find_original(job_id):
        raise HTTPException(status_code=409, detail="影片尚未上傳")

    if settings.skill_analyzer_inline or not _redis_ok():
        background_tasks.add_task(run_analyze, job_id)
        return {"ok": True, "mode": "inline"}

    from skill_analyzer.tasks import analyze_job

    analyze_job.delay(job_id)
    return {"ok": True, "mode": "celery"}


@app.get("/jobs/{job_id}/video")
def get_video(
    job_id: str,
    token: str | None = None,
    x_skill_token: str | None = Header(default=None, alias="X-Skill-Token"),
):
    _check(job_id, token, x_skill_token)
    processed = job_dir(job_id) / "processed.mp4"
    path = processed if processed.exists() else find_original(job_id)
    if not path:
        raise HTTPException(status_code=404, detail="影片不存在")
    media = "video/webm" if path.suffix == ".webm" else "video/mp4"
    return FileResponse(path, media_type=media, filename=path.name)


@app.get("/jobs/{job_id}/preview")
def get_preview(
    job_id: str,
    token: str | None = None,
    x_skill_token: str | None = Header(default=None, alias="X-Skill-Token"),
):
    _check(job_id, token, x_skill_token)
    path = job_dir(job_id) / "preview.jpg"
    if not path.exists():
        raise HTTPException(status_code=404, detail="預覽不存在")
    return FileResponse(path, media_type="image/jpeg")


def _redis_ok() -> bool:
    try:
        import redis

        client = redis.Redis.from_url(settings.redis_url)
        return bool(client.ping())
    except Exception:  # noqa: BLE001
        return False
