from pathlib import Path
from typing import Any

import numpy as np

from skill_analyzer.pipeline.ball import detect_ball
from skill_analyzer.pipeline.court import homography, image_to_court, in_court, in_kitchen, near_net
from skill_analyzer.pipeline.preprocess import transcode_clip
from skill_analyzer.pipeline.score import infer_skill


LEFT_ANKLE = 15
RIGHT_ANKLE = 16
LEFT_WRIST = 9
RIGHT_WRIST = 10
LEFT_ELBOW = 7
RIGHT_ELBOW = 8


def run_full_analysis(
    video_path: Path,
    work_dir: Path,
    *,
    player_click: dict[str, float],
    selected_track_id: int | None,
    court_quad: list[dict[str, float]],
    max_duration_sec: int,
    progress_cb=None,
) -> dict[str, Any]:
    processed = transcode_clip(video_path, work_dir / "processed.mp4", max_duration_sec)
    if progress_cb:
        progress_cb(15)

    matrix = homography(court_quad)
    model = _load_yolo()
    if progress_cb:
        progress_cb(25)

    target_id = selected_track_id
    last_center: tuple[float, float] | None = (
        (player_click["x"], player_click["y"]) if player_click else None
    )
    player_court: list[tuple[float, float]] = []
    wrists: list[tuple[float, float]] = []
    ball_court: list[tuple[float, float] | None] = []
    frames_with_target = 0
    total_frames = 0
    ball_hits = 0

    results = model.track(
        source=str(processed),
        persist=True,
        tracker="bytetrack.yaml",
        stream=True,
        verbose=False,
        conf=0.25,
    )

    for result in results:
        total_frames += 1
        frame = result.orig_img
        tracks = _tracks_from_result(result)
        target = _pick_target(tracks, target_id, last_center)
        if target:
            target_id = target["id"]
            last_center = target["center"]
            frames_with_target += 1
            foot = target["foot"]
            try:
                player_court.append(image_to_court(matrix, foot[0], foot[1]))
            except Exception:  # noqa: BLE001
                pass
            if target["wrist"]:
                wrists.append(target["wrist"])

        ball = detect_ball(frame) if frame is not None else None
        if ball:
            ball_hits += 1
            try:
                ball_court.append(image_to_court(matrix, ball[0], ball[1]))
            except Exception:  # noqa: BLE001
                ball_court.append(None)
        else:
            ball_court.append(None)

        if progress_cb and total_frames % 45 == 0:
            pct = 25 + min(60, int(60 * total_frames / max(total_frames + 120, 1)))
            progress_cb(pct)

    if progress_cb:
        progress_cb(88)

    kitchen_pts = [1 if in_kitchen(x, y) else 0 for x, y in player_court]
    kitchen_pct = float(np.mean(kitchen_pts)) if kitchen_pts else 0.0
    smoothness = _smoothness(wrists)
    error_rate, shot_count, notes = _error_proxy(ball_court)
    coverage = frames_with_target / total_frames if total_frames else 0.0

    if coverage < 0.15:
        notes.append("目標球員追蹤較不穩定，區間已加寬")
    if ball_hits < 15:
        notes.append("球軌偵測偏少，失誤率僅供參考")

    metrics = {
        "errorRate": round(error_rate, 3),
        "kitchenPct": round(kitchen_pct, 3),
        "smoothness": round(smoothness, 3),
        "shotCount": shot_count,
        "trackCoverage": round(coverage, 3),
        "ballDetections": ball_hits,
        "notes": notes,
    }
    mid, low, high, confidence = infer_skill(metrics)
    metrics["confidence"] = round(confidence, 3)

    return {
        "estimatedMid": mid,
        "estimatedLow": low,
        "estimatedHigh": high,
        "metrics": metrics,
        "overlaySummary": {
            "frames": total_frames,
            "targetTrackId": target_id,
            "playerSamples": (
                [[round(x, 2), round(y, 2)] for x, y in player_court[:: max(1, len(player_court) // 40)]]
                if player_court
                else []
            ),
        },
        "modelVersion": "heuristic-v1",
    }


def _load_yolo():
    from ultralytics import YOLO

    return YOLO("yolov8n-pose.pt")


def _tracks_from_result(result) -> list[dict]:
    tracks: list[dict] = []
    if result.boxes is None or result.boxes.xyxy is None:
        return tracks
    ids = result.boxes.id
    kpts = result.keypoints.xy if result.keypoints is not None else None
    for i, xyxy in enumerate(result.boxes.xyxy):
        x1, y1, x2, y2 = [float(v) for v in xyxy.tolist()]
        track_id = int(ids[i]) if ids is not None else i + 1
        center = ((x1 + x2) / 2, (y1 + y2) / 2)
        foot = ((x1 + x2) / 2, y2)
        wrist = None
        if kpts is not None and i < len(kpts):
            pts = kpts[i]
            ankles = []
            for idx in (LEFT_ANKLE, RIGHT_ANKLE):
                if idx < len(pts) and float(pts[idx][0]) > 0:
                    ankles.append((float(pts[idx][0]), float(pts[idx][1])))
            if ankles:
                foot = (sum(p[0] for p in ankles) / len(ankles), sum(p[1] for p in ankles) / len(ankles))
            wrists = []
            for idx in (LEFT_WRIST, RIGHT_WRIST, LEFT_ELBOW, RIGHT_ELBOW):
                if idx < len(pts) and float(pts[idx][0]) > 0:
                    wrists.append((float(pts[idx][0]), float(pts[idx][1])))
            if wrists:
                wrist = (
                    sum(p[0] for p in wrists) / len(wrists),
                    sum(p[1] for p in wrists) / len(wrists),
                )
        tracks.append({"id": track_id, "center": center, "foot": foot, "wrist": wrist, "box": (x1, y1, x2, y2)})
    return tracks


def _pick_target(
    tracks: list[dict],
    target_id: int | None,
    last_center: tuple[float, float] | None,
) -> dict | None:
    if not tracks:
        return None
    if target_id is not None:
        for track in tracks:
            if track["id"] == target_id:
                return track
    ref = last_center
    if ref is None:
        return tracks[0]
    return min(tracks, key=lambda t: (t["center"][0] - ref[0]) ** 2 + (t["center"][1] - ref[1]) ** 2)


def _smoothness(points: list[tuple[float, float]]) -> float:
    if len(points) < 8:
        return 0.45
    arr = np.array(points, dtype=np.float32)
    vel = np.linalg.norm(np.diff(arr, axis=0), axis=1)
    if vel.size < 3:
        return 0.45
    jerk = np.diff(vel)
    mean_v = float(np.mean(vel) + 1e-6)
    score = 1.0 / (1.0 + float(np.std(jerk)) / mean_v)
    return float(np.clip(score, 0.05, 0.98))


def _error_proxy(ball_court: list[tuple[float, float] | None]) -> tuple[float, int, list[str]]:
    notes: list[str] = []
    events = 0
    shots = 0
    cooldown = 0
    last_in: tuple[float, float] | None = None
    missing = 0
    for pt in ball_court:
        if cooldown > 0:
            cooldown -= 1
        if pt is None:
            missing += 1
            if last_in and near_net(last_in[1]) and missing >= 8 and cooldown == 0:
                events += 1
                cooldown = 40
                last_in = None
            continue
        missing = 0
        shots += 1
        if last_in and in_court(*last_in) and not in_court(*pt, margin=0.4) and cooldown == 0:
            events += 1
            cooldown = 40
        last_in = pt
    if shots == 0:
        notes.append("未穩定追到球，改以動作流暢度與廚房區為主")
        return 0.22, 0, notes
    rate = min(0.8, events / max(shots / 18, 1))
    return float(rate), shots, notes
