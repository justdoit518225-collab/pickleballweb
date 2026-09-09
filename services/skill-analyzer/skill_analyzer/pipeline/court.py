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


def in_court(cx: float, cy: float, margin: float = 1.0) -> bool:
    return -margin <= cx <= COURT_W + margin and -margin <= cy <= COURT_L + margin


def near_net(cy: float, tol: float = 2.5) -> bool:
    return abs(cy - NET_Y) <= tol
