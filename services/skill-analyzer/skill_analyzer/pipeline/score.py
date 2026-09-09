from __future__ import annotations


def infer_skill(metrics: dict) -> tuple[float, float, float, float]:
    error_rate = _clip(metrics.get("errorRate", 0.2))
    kitchen = _clip(metrics.get("kitchenPct", 0.2))
    smooth = _clip(metrics.get("smoothness", 0.5))
    coverage = _clip(metrics.get("trackCoverage", 0.4))

    mid = 3.0
    mid -= min(error_rate, 0.65) * 2.4
    if kitchen < 0.08:
        mid -= 0.45
    elif 0.18 <= kitchen <= 0.7:
        mid += 0.55
    else:
        mid += 0.15
    mid += (smooth - 0.5) * 1.5
    if coverage < 0.25:
        mid -= 0.25

    mid = round(min(5.5, max(2.0, mid)), 2)
    confidence = _clip(0.25 + coverage * 0.45 + (0.2 if metrics.get("ballDetections", 0) > 20 else 0))
    spread = round(max(0.25, 0.55 * (1 - confidence)), 2)
    low = round(max(2.0, mid - spread), 2)
    high = round(min(5.5, mid + spread), 2)
    return mid, low, high, confidence


def _clip(value: float) -> float:
    return max(0.0, min(1.0, float(value)))
