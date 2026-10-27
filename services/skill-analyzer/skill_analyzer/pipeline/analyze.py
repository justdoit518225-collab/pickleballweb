from pathlib import Path
from typing import Any

import numpy as np

from skill_analyzer.pipeline.ball import detect_ball
from skill_analyzer.pipeline.court import (
    NET_Y,
    detect_court_quad_from_video,
    homography,
    image_to_court,
    in_backcourt,
    in_court,
    in_kitchen,
    in_transition,
    near_net,
    opponent_kitchen,
)
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
    player_click: dict[str, float] | None = None,
    selected_track_id: int | None = None,
    court_quad: list[dict[str, float]] | None = None,
    max_duration_sec: int,
    auto: bool = False,
    progress_cb=None,
) -> dict[str, Any]:
    processed = transcode_clip(video_path, work_dir / "processed.mp4", max_duration_sec)
    if progress_cb:
        progress_cb(15)

    if auto or court_quad is None:
        court_quad = detect_court_quad_from_video(processed)
    if auto or not player_click:
        import cv2

        cap = cv2.VideoCapture(str(processed))
        ok, frame0 = cap.read()
        cap.release()
        if ok:
            h, w = frame0.shape[:2]
            player_click = {"x": w / 2.0, "y": h * 0.78}
        else:
            player_click = player_click or {"x": 640.0, "y": 560.0}

    matrix = homography(court_quad)
    model = _load_yolo()
    if progress_cb:
        progress_cb(25)

    target_id = selected_track_id
    last_center: tuple[float, float] | None = (
        (player_click["x"], player_click["y"]) if player_click else None
    )
    player_court: list[tuple[float, float]] = []
    player_aligned: list[tuple[float, float] | None] = []
    wrists: list[tuple[float, float]] = []
    wrist_in_kitchen: list[tuple[float, float]] = []
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
        player_xy: tuple[float, float] | None = None
        if target:
            target_id = target["id"]
            last_center = target["center"]
            frames_with_target += 1
            foot = target["foot"]
            try:
                player_xy = image_to_court(matrix, foot[0], foot[1])
                player_court.append(player_xy)
            except Exception:  # noqa: BLE001
                player_xy = None
            if target["wrist"]:
                wrists.append(target["wrist"])
                if player_xy and in_kitchen(*player_xy):
                    wrist_in_kitchen.append(target["wrist"])
        player_aligned.append(player_xy)

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
    extras = _rubric_features(player_aligned, ball_court, wrist_in_kitchen)

    if coverage < 0.15:
        notes.append("目標球員追蹤較不穩定，區間已加寬")
    if ball_hits < 15:
        notes.append("球軌偵測偏少，第三球／reset 僅供參考")

    metrics = {
        "errorRate": round(error_rate, 3),
        "kitchenPct": round(kitchen_pct, 3),
        "smoothness": round(smoothness, 3),
        "shotCount": shot_count,
        "trackCoverage": round(coverage, 3),
        "ballDetections": ball_hits,
        "notes": notes,
        **{key: round(value, 3) for key, value in extras.items()},
    }
    mid, low, high, confidence, match = infer_skill(metrics)
    metrics["confidence"] = round(confidence, 3)
    metrics["rubricMatch"] = match
    if match.get("gaps"):
        notes.append("相對「" + match["nearestLabel"] + "」較弱：" + "、".join(match["gaps"]))
    metrics["notes"] = notes

    return {
        "estimatedMid": mid,
        "estimatedLow": low,
        "estimatedHigh": high,
        "metrics": metrics,
        "overlaySummary": {
            "frames": total_frames,
            "targetTrackId": target_id,
            "nearestLevel": match.get("nearestLevel"),
            "observed": match.get("observed"),
            "playerSamples": (
                [[round(x, 2), round(y, 2)] for x, y in player_court[:: max(1, len(player_court) // 40)]]
                if player_court
                else []
            ),
        },
        "modelVersion": "rubric-match-v1",
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


def _rubric_features(
    player_court: list[tuple[float, float] | None],
    ball_court: list[tuple[float, float] | None],
    wrist_in_kitchen: list[tuple[float, float]],
) -> dict[str, float]:
    known = [p for p in player_court if p is not None]
    if not known:
        return {
            "kitchenApproach": 0.2,
            "dropSuccess": 0.15,
            "resetScore": 0.15,
            "dinkPatience": 0.2,
            "handSpeed": 0.3,
            "lateralMobility": 0.3,
        }

    ys = np.array([p[1] for p in known], dtype=np.float32)
    xs = np.array([p[0] for p in known], dtype=np.float32)
    near_side = float(np.mean(ys)) < NET_Y
    split = max(1, len(ys) // 5)
    first = float(np.mean(ys[:split]))
    last = float(np.mean(ys[-split:]))
    approach = abs(last - NET_Y) < abs(first - NET_Y)
    approach_score = 0.75 if approach else 0.28
    if abs(last - NET_Y) <= 8:
        approach_score = max(approach_score, 0.62)

    drops = 0
    drop_ok = 0
    resets = 0
    n = min(len(player_court), len(ball_court))
    for i in range(n):
        player = player_court[i]
        ball = ball_court[i]
        if player is None or ball is None:
            continue
        px, py = player
        if in_backcourt(px, py, near_side):
            drops += 1
            if opponent_kitchen(ball[1], near_side):
                drop_ok += 1
        if in_transition(px, py) and in_kitchen(*ball):
            resets += 1
    drop_success = drop_ok / drops if drops else 0.18
    reset_score = min(0.95, resets / max(8, n / 40))

    kitchen_xy = [p for p in known if in_kitchen(*p)]
    if len(kitchen_xy) > 12:
        karr = np.array(kitchen_xy, dtype=np.float32)
        step = np.linalg.norm(np.diff(karr, axis=0), axis=1)
        patience = float(np.clip(1.0 / (1.0 + float(np.mean(step)) * 2.2), 0.1, 0.95))
    else:
        patience = 0.22

    hand_speed = _smoothness(wrist_in_kitchen) if len(wrist_in_kitchen) > 6 else 0.32
    if len(wrist_in_kitchen) > 6:
        wv = np.linalg.norm(np.diff(np.array(wrist_in_kitchen, dtype=np.float32), axis=0), axis=1)
        hand_speed = float(np.clip(np.mean(wv) / 18.0, 0.1, 0.95))

    lateral = float(np.clip(np.std(xs) / 6.5, 0.1, 0.95)) if len(xs) > 8 else 0.3

    return {
        "kitchenApproach": approach_score,
        "dropSuccess": float(drop_success),
        "resetScore": float(reset_score),
        "dinkPatience": patience,
        "handSpeed": hand_speed,
        "lateralMobility": lateral,
    }
