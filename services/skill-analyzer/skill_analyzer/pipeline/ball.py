import cv2
import numpy as np


def detect_ball(frame_bgr: np.ndarray) -> tuple[float, float] | None:
    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, (18, 90, 90), (40, 255, 255))
    mask = cv2.medianBlur(mask, 5)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    best = None
    best_score = 0.0
    h, w = frame_bgr.shape[:2]
    min_area = (w * h) * 0.00002
    max_area = (w * h) * 0.004
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area or area > max_area:
            continue
        peri = cv2.arcLength(cnt, True)
        if peri <= 0:
            continue
        circularity = 4 * np.pi * area / (peri * peri)
        if circularity < 0.45:
            continue
        score = circularity * area
        if score > best_score:
            m = cv2.moments(cnt)
            if m["m00"] == 0:
                continue
            best = (m["m10"] / m["m00"], m["m01"] / m["m00"])
            best_score = score
    return best
