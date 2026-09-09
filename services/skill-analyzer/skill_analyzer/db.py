import secrets
from typing import Any

import psycopg
from psycopg.types.json import Json

from skill_analyzer.config import settings


def connect():
    return psycopg.connect(settings.database_url)


def get_job(job_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, status, "storageKey", "durationSec", detections,
                       "selectedTrackId", "playerClick", "courtQuad", progress
                FROM "SkillAnalysisJob"
                WHERE id = %s
                """,
                (job_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "status": row[1],
                "storageKey": row[2],
                "durationSec": row[3],
                "detections": row[4],
                "selectedTrackId": row[5],
                "playerClick": row[6],
                "courtQuad": row[7],
                "progress": row[8],
            }


def update_job(job_id: str, **fields: Any) -> None:
    if not fields:
        return
    mapping = {
        "status": "status",
        "storageKey": '"storageKey"',
        "durationSec": '"durationSec"',
        "detections": "detections",
        "selectedTrackId": '"selectedTrackId"',
        "playerClick": '"playerClick"',
        "courtQuad": '"courtQuad"',
        "progress": "progress",
        "errorMessage": '"errorMessage"',
    }
    sets: list[str] = []
    values: list[Any] = []
    for key, value in fields.items():
        col = mapping.get(key)
        if not col:
            raise KeyError(key)
        if key in {"detections", "playerClick", "courtQuad"} and value is not None:
            value = Json(value)
        sets.append(f"{col} = %s")
        values.append(value)
    sets.append('"updatedAt" = NOW()')
    values.append(job_id)
    sql = f'UPDATE "SkillAnalysisJob" SET {", ".join(sets)} WHERE id = %s'
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, values)
        conn.commit()


def save_report(
    job_id: str,
    *,
    estimated_mid: float,
    estimated_low: float,
    estimated_high: float,
    metrics: dict[str, Any],
    overlay_summary: dict[str, Any] | None,
    model_version: str,
) -> None:
    report_id = secrets.token_hex(12)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM "SkillAnalysisReport" WHERE "jobId" = %s', (job_id,))
            cur.execute(
                """
                INSERT INTO "SkillAnalysisReport"
                  (id, "jobId", "estimatedMid", "estimatedLow", "estimatedHigh",
                   metrics, "overlaySummary", "modelVersion", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """,
                (
                    report_id,
                    job_id,
                    f"{estimated_mid:.2f}",
                    f"{estimated_low:.2f}",
                    f"{estimated_high:.2f}",
                    Json(metrics),
                    Json(overlay_summary) if overlay_summary is not None else None,
                    model_version,
                ),
            )
            cur.execute(
                """
                UPDATE "SkillAnalysisJob"
                SET status = 'COMPLETED', progress = 100, "errorMessage" = NULL, "updatedAt" = NOW()
                WHERE id = %s
                """,
                (job_id,),
            )
        conn.commit()


def mark_failed(job_id: str, message: str) -> None:
    update_job(job_id, status="FAILED", errorMessage=message[:2000], progress=0)
