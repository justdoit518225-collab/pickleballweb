from skill_analyzer.celery_app import celery_app
from skill_analyzer.config import settings
from skill_analyzer.db import get_job, mark_failed, save_report, update_job
from skill_analyzer.storage import find_original, job_dir


def run_preview_detect(job_id: str) -> None:
    from skill_analyzer.pipeline.detect import detect_preview

    try:
        video = find_original(job_id)
        if not video:
            mark_failed(job_id, "找不到已上傳的影片")
            return
        preview = job_dir(job_id) / "preview.jpg"
        detections = detect_preview(video, preview)
        update_job(job_id, detections=detections, status="AWAITING_PLAYER", progress=0)
    except Exception as exc:  # noqa: BLE001
        mark_failed(job_id, f"預覽偵測失敗：{exc}")


def run_analyze(job_id: str) -> None:
    from skill_analyzer.pipeline.analyze import run_full_analysis

    try:
        update_job(job_id, status="PROCESSING", progress=8, errorMessage=None)
        job = get_job(job_id)
        if not job:
            mark_failed(job_id, "找不到分析任務")
            return
        video = find_original(job_id)
        if not video:
            mark_failed(job_id, "找不到已上傳的影片")
            return
        click = job.get("playerClick") or {}
        quad = job.get("courtQuad") or []
        if not isinstance(click, dict) or not isinstance(quad, list) or len(quad) != 4:
            mark_failed(job_id, "缺少球員點位或球場四點")
            return

        def on_progress(value: int) -> None:
            update_job(job_id, progress=min(99, max(8, value)), status="PROCESSING")

        result = run_full_analysis(
            video,
            job_dir(job_id),
            player_click=click,
            selected_track_id=job.get("selectedTrackId"),
            court_quad=quad,
            max_duration_sec=settings.max_duration_sec,
            progress_cb=on_progress,
        )
        save_report(
            job_id,
            estimated_mid=result["estimatedMid"],
            estimated_low=result["estimatedLow"],
            estimated_high=result["estimatedHigh"],
            metrics=result["metrics"],
            overlay_summary=result.get("overlaySummary"),
            model_version=result["modelVersion"],
        )
    except Exception as exc:  # noqa: BLE001
        mark_failed(job_id, f"分析失敗：{exc}")


@celery_app.task(name="skill_analyzer.tasks.analyze_job")
def analyze_job(job_id: str) -> None:
    run_analyze(job_id)
