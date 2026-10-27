import numpy as np

COURT_W = 20.0
COURT_L = 44.0
NET_Y = 22.0
NVZ_MIN = 15.5
NVZ_MAX = 28.5


def homography(quad: list[dict[str, float]]) -> np.ndarray:
    src = np.float32([[p["x"], p["y"]] for p in quad])
    dst = np.float32(
        [
            [0, 0],
            [COURT_W, 0],
            [COURT_W, COURT_L],
            [0, COURT_L],
        ]
    )
    import cv2

    matrix, _ = cv2.findHomography(src, dst)
    if matrix is None:
        raise ValueError("球場四點無法建立透視變換，請依序重點四個場角")
    return matrix


def image_to_court(matrix: np.ndarray, x: float, y: float) -> tuple[float, float]:
    pt = np.array([[[x, y]]], dtype=np.float32)
    import cv2

    out = cv2.perspectiveTransform(pt, matrix)[0][0]
    return float(out[0]), float(out[1])


def in_kitchen(cx: float, cy: float) -> bool:
    return 0 <= cx <= COURT_W and NVZ_MIN <= cy <= NVZ_MAX


def in_transition(cx: float, cy: float) -> bool:
    return 0 <= cx <= COURT_W and (
        (NVZ_MIN - 7 <= cy < NVZ_MIN) or (NVZ_MAX < cy <= NVZ_MAX + 7)
    )


def in_backcourt(cx: float, cy: float, near_side: bool) -> bool:
    if not (0 <= cx <= COURT_W):
        return False
    return cy <= 12 if near_side else cy >= 32


def opponent_kitchen(cy: float, near_side: bool) -> bool:
    return (NET_Y <= cy <= NVZ_MAX) if near_side else (NVZ_MIN <= cy <= NET_Y)


def in_court(cx: float, cy: float, margin: float = 1.0) -> bool:
    return -margin <= cx <= COURT_W + margin and -margin <= cy <= COURT_L + margin


def near_net(cy: float, tol: float = 2.5) -> bool:
    return abs(cy - NET_Y) <= tol


def fallback_quad(width: float, height: float) -> list[dict[str, float]]:
    return [
        {"x": 0.08 * width, "y": 0.92 * height},
        {"x": 0.92 * width, "y": 0.92 * height},
        {"x": 0.78 * width, "y": 0.22 * height},
        {"x": 0.22 * width, "y": 0.22 * height},
    ]


def order_court_quad(pts: np.ndarray) -> list[dict[str, float]]:
    pts = np.asarray(pts, dtype=np.float32).reshape(-1, 2)
    by_y = pts[np.argsort(pts[:, 1])]
    far = by_y[:2]
    near = by_y[2:]
    far = far[np.argsort(far[:, 0])]
    near = near[np.argsort(near[:, 0])]
    ordered = [near[0], near[1], far[1], far[0]]
    return [{"x": float(p[0]), "y": float(p[1])} for p in ordered]


def detect_court_quad(frame: np.ndarray) -> list[dict[str, float]] | None:
    import cv2

    h, w = frame.shape[:2]
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    masks = [
        cv2.inRange(hsv, (90, 30, 40), (135, 255, 255)),
        cv2.inRange(hsv, (35, 30, 40), (90, 255, 255)),
        cv2.inRange(hsv, (0, 0, 40), (180, 50, 140)),
    ]
    best = None
    best_area = 0.0
    min_area = 0.08 * w * h
    for mask in masks:
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((21, 21), np.uint8))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue
        contour = max(contours, key=cv2.contourArea)
        area = float(cv2.contourArea(contour))
        if area < min_area:
            continue
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        box = approx if len(approx) == 4 else cv2.boxPoints(cv2.minAreaRect(contour))
        if area > best_area:
            best_area = area
            best = box
    if best is None:
        return None
    return order_court_quad(best)


def detect_court_quad_from_video(path) -> list[dict[str, float]]:
    import cv2

    cap = cv2.VideoCapture(str(path))
    try:
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        size = (
            float(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280),
            float(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720),
        )
        for frac in (0.18, 0.38, 0.58):
            if total > 0:
                cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * frac))
            ok, frame = cap.read()
            if not ok:
                continue
            quad = detect_court_quad(frame)
            if quad:
                return quad
            size = (float(frame.shape[1]), float(frame.shape[0]))
        return fallback_quad(*size)
    finally:
        cap.release()
