from __future__ import annotations

import json
from pathlib import Path

from skill_analyzer.pipeline.dupr_rubric import (
    DIMENSIONS,
    DIMENSION_LABELS,
    LABELS,
    LEVEL_COPY,
    LEVELS,
    PROFILES,
    SOURCES,
    WEIGHTS,
)

_SUPERVISED_PATH = Path(__file__).resolve().parents[2] / "models" / "supervised-v1.json"
_SUPERVISED = None


def infer_skill(metrics: dict) -> tuple[float, float, float, float, dict]:
    """把影片特徵對齊公開等級剖面；若已有網路上標註影片訓練的回歸器則混合。"""
    observed = observed_vector(metrics)
    scored = {level: _similarity(observed, PROFILES[level]) for level in LEVELS}
    ranked = sorted(scored.items(), key=lambda item: item[1], reverse=True)
    best_level, best_score = ranked[0]
    second_level, second_score = ranked[1]

    total = best_score + second_score + 1e-6
    rubric_mid = (best_level * best_score + second_level * second_score) / total
    trained = _supervised_score(observed)
    if trained is not None:
        mid = round(min(5.5, max(2.0, 0.62 * trained + 0.38 * rubric_mid)), 2)
        blend = "supervised-v1+rubric"
    else:
        mid = round(min(5.5, max(2.0, rubric_mid)), 2)
        blend = "rubric-match-v1"

    coverage = _clip(metrics.get("trackCoverage", 0.4))
    ball_n = float(metrics.get("ballDetections", 0))
    confidence = _clip(0.22 + coverage * 0.4 + min(0.22, ball_n / 120) + best_score * 0.16)
    spread = round(max(0.2, 0.5 * (1 - confidence)), 2)
    low = round(max(2.0, mid - spread), 2)
    high = round(min(5.5, mid + spread), 2)

    gaps = []
    expected = PROFILES[best_level]
    for dim in DIMENSIONS:
        delta = expected[dim] - observed[dim]
        if delta >= 0.18:
            gaps.append(DIMENSION_LABELS[dim])

    match = {
        "nearestLevel": best_level,
        "nearestLabel": LABELS[best_level],
        "levelScores": {str(k): round(v, 3) for k, v in scored.items()},
        "observed": {k: round(v, 3) for k, v in observed.items()},
        "expected": expected,
        "dimensionLabels": DIMENSION_LABELS,
        "copy": LEVEL_COPY[best_level],
        "gaps": gaps,
        "sources": SOURCES,
        "blend": blend,
        "supervised": None if trained is None else round(trained, 2),
    }
    return mid, low, high, confidence, match


def observed_vector(metrics: dict) -> dict[str, float]:
    error_rate = _clip(metrics.get("errorRate", 0.25))
    kitchen = _clip(metrics.get("kitchenPct", 0.15))
    smooth = _clip(metrics.get("smoothness", 0.45))
    approach = _clip(metrics.get("kitchenApproach", 0.3))
    drop = _clip(metrics.get("dropSuccess", 0.2))
    reset = _clip(metrics.get("resetScore", 0.2))
    patience = _clip(metrics.get("dinkPatience", kitchen * 0.7))
    hands = _clip(metrics.get("handSpeed", 0.35))
    lateral = _clip(metrics.get("lateralMobility", 0.35))

    return {
        "consistency": _clip(1 - error_rate),
        "kitchenPresence": kitchen,
        "dinkPatience": patience,
        "thirdShotDrop": drop,
        "resetTransition": reset,
        "footwork": _clip(0.55 * smooth + 0.45 * lateral),
        "handSpeed": hands,
        "cognition": _clip(0.55 * approach + 0.45 * kitchen),
    }


def _similarity(observed: dict[str, float], expected: dict[str, float]) -> float:
    dist = 0.0
    for dim in DIMENSIONS:
        dist += WEIGHTS[dim] * abs(observed[dim] - expected[dim])
    return max(0.0, 1.0 - dist)


def _supervised_score(observed: dict[str, float]) -> float | None:
    model = _load_supervised()
    if not model:
        return None
    intercept = float(model.get("intercept", 0))
    weights = model.get("weights") or {}
    order = model.get("featureOrder") or list(DIMENSIONS)
    total = intercept
    for key in order:
        total += float(weights.get(key, 0)) * float(observed.get(key, 0))
    return max(2.0, min(5.5, total))


def _load_supervised() -> dict | None:
    global _SUPERVISED
    if _SUPERVISED is False:
        return None
    if _SUPERVISED is not None:
        return _SUPERVISED
    if not _SUPERVISED_PATH.exists():
        _SUPERVISED = False
        return None
    try:
        payload = json.loads(_SUPERVISED_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        _SUPERVISED = False
        return None
    if int(payload.get("n") or 0) < 20:
        _SUPERVISED = False
        return None
    _SUPERVISED = payload
    return _SUPERVISED


def _clip(value: float) -> float:
    return max(0.0, min(1.0, float(value)))
