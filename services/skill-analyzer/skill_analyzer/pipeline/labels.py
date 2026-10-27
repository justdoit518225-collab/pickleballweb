"""從影片標題／說明解析 DUPR 或公開技能等級標籤。"""

from __future__ import annotations

import re

_DUPR = re.compile(r"\bdupr", re.I)
_NUM = r"([2-6](?:\.\d{1,2})?)"
_RANGE = re.compile(rf"{_NUM}\s*(?:vs\.?|/|v|-|–|to)\s*{_NUM}", re.I)
_SINGLE = [
    re.compile(rf"dupr\s*[:\-]?\s*{_NUM}", re.I),
    re.compile(rf"{_NUM}\s*dupr", re.I),
    re.compile(rf"(?:skill\s*level|self[-\s]?rate[d]?|rated)\s*[:\-]?\s*{_NUM}", re.I),
    re.compile(rf"\b{_NUM}\s*(?:pickleball|doubles|singles)\b", re.I),
]


def parse_skill_label(title: str, description: str = "") -> dict | None:
    text = f"{title}\n{description[:800]}"
    has_dupr = bool(_DUPR.search(text))
    found: list[float] = []

    range_match = _RANGE.search(text)
    if range_match:
        for group in range_match.groups():
            value = _clip_rating(group)
            if value is not None:
                found.append(value)

    if not found:
        for pat in _SINGLE:
            match = pat.search(text)
            if not match:
                continue
            value = _clip_rating(match.group(1))
            if value is not None:
                found.append(value)
                break

    if not found:
        return None

    unique: list[float] = []
    for value in found:
        if not any(abs(value - seen) < 0.05 for seen in unique):
            unique.append(value)

    mixed = len(unique) > 1
    label = unique[0] if len(unique) == 1 else round(sum(unique[:2]) / 2, 2)
    return {
        "y": label,
        "raw": unique,
        "hasDupr": has_dupr,
        "mixed": mixed,
        "confidence": 0.86 if has_dupr and not mixed else 0.7 if has_dupr else 0.45,
    }


def _clip_rating(raw: str) -> float | None:
    try:
        value = float(raw)
    except ValueError:
        return None
    if value < 2.0 or value > 6.5:
        return None
    return round(value, 2)
