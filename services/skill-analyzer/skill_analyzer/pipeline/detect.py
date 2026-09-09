from pathlib import Path

import cv2

from skill_analyzer.pipeline.preprocess import extract_preview


def _load_yolo():
    from ultralytics import YOLO

    return YOLO("yolov8n-pose.pt")


def detect_preview(video_path: Path, preview_path: Path) -> dict:
    size = extract_preview(video_path, preview_path)
    if size is None:
        raise RuntimeError("無法讀取影片預覽幀")
    width, height = size
    frame = cv2.imread(str(preview_path))
    if frame is None:
        raise RuntimeError("預覽幀讀取失敗")

    try:
        model = _load_yolo()
        results = model.predict(frame, verbose=False, conf=0.25)
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"人體偵測模型無法載入：{exc}") from exc

    boxes: list[dict] = []
    if results:
        result = results[0]
        if result.boxes is not None:
            for i, box in enumerate(result.boxes):
                xyxy = box.xyxy[0].tolist()
                x1, y1, x2, y2 = xyxy
                boxes.append(
                    {
                        "trackId": i + 1,
                        "x": float(x1),
                        "y": float(y1),
                        "w": float(x2 - x1),
                        "h": float(y2 - y1),
                        "conf": float(box.conf[0]) if box.conf is not None else 0.0,
                    }
                )
    return {"frameWidth": width, "frameHeight": height, "boxes": boxes}
