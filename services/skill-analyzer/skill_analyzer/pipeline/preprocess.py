import shutil
import subprocess
from pathlib import Path

import cv2


def probe_duration_sec(path: Path) -> int | None:
    ffprobe = shutil.which("ffprobe")
    if ffprobe:
        try:
            out = subprocess.check_output(
                [
                    ffprobe,
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    str(path),
                ],
                text=True,
                timeout=30,
            )
            return max(1, int(float(out.strip())))
        except (subprocess.CalledProcessError, ValueError, subprocess.TimeoutExpired):
            pass
    cap = cv2.VideoCapture(str(path))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 0
        frames = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        if fps > 1 and frames > 0:
            return max(1, int(frames / fps))
    finally:
        cap.release()
    return None


def transcode_clip(src: Path, dest: Path, max_duration_sec: int) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return src
    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(src),
        "-t",
        str(max_duration_sec),
        "-vf",
        "scale=-2:720",
        "-r",
        "30",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "28",
        "-an",
        str(dest),
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=600)
        return dest if dest.exists() else src
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return src


def extract_preview(path: Path, dest: Path, at_sec: float = 2.0) -> tuple[int, int] | None:
    cap = cv2.VideoCapture(str(path))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, int(at_sec * fps)))
        ok, frame = cap.read()
        if not ok:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ok, frame = cap.read()
        if not ok:
            return None
        dest.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(dest), frame)
        h, w = frame.shape[:2]
        return w, h
    finally:
        cap.release()
