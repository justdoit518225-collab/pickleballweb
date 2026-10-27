"""用已確認的官方 DUPR 標註樣本做監督訓練。

資料來源：
  --jsonl path.jsonl     平台匯出的 JSONL
  --from-db              直接讀 Postgres SkillTrainingSample（CONFIRMED）

樣本不足時只報告、不覆寫線上評分。建議先有約 50 筆、且涵蓋 2.5–5.0。
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

FEATURE_KEYS = (
    "consistency",
    "kitchenPresence",
    "dinkPatience",
    "thirdShotDrop",
    "resetTransition",
    "footwork",
    "handSpeed",
    "cognition",
)
MIN_SAMPLES = 8


def main() -> None:
    parser = argparse.ArgumentParser(description="Train DUPR-labeled skill regressor")
    parser.add_argument("--jsonl", type=Path, nargs="*", help="labeled JSONL files")
    parser.add_argument("--from-db", action="store_true", help="load CONFIRMED rows from Postgres")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "models" / "supervised-v1.json",
    )
    parser.add_argument("--min-samples", type=int, default=MIN_SAMPLES)
    args = parser.parse_args()

    rows = load_from_db() if args.from_db else []
    jsonl_paths = args.jsonl or []
    if not jsonl_paths and not args.from_db:
        default_web = Path(__file__).resolve().parents[3] / "storage" / "web-training" / "web-labeled.jsonl"
        if default_web.exists():
            jsonl_paths = [default_web]
    for path in jsonl_paths:
        rows.extend(load_jsonl(path))
    if not rows:
        raise SystemExit("沒有標註樣本。請先跑 harvest 蒐集 YouTube 有 DUPR 標記的影片。")

    x = np.array([row["x"] for row in rows], dtype=np.float64)
    y = np.array([row["y"] for row in rows], dtype=np.float64)
    print(f"samples={len(rows)} y_mean={y.mean():.3f} y_min={y.min():.2f} y_max={y.max():.2f}")

    if len(rows) < args.min_samples:
        raise SystemExit(
            f"樣本只有 {len(rows)} 筆，少於 {args.min_samples}，先繼續收集再訓練。"
        )

    design = np.column_stack([np.ones(len(rows)), x])
    weights, _, _, _ = np.linalg.lstsq(design, y, rcond=None)
    pred = design @ weights
    mae = float(np.mean(np.abs(pred - y)))
    print(f"linear MAE={mae:.3f}")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "modelVersion": "supervised-v1",
        "featureOrder": list(FEATURE_KEYS),
        "intercept": float(weights[0]),
        "weights": {key: float(w) for key, w in zip(FEATURE_KEYS, weights[1:], strict=True)},
        "n": len(rows),
        "mae": round(mae, 4),
        "yMin": float(y.min()),
        "yMax": float(y.max()),
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"wrote {args.out}")
    print("已寫入監督模型，之後分析會與公開等級剖面混合計分。")


def load_jsonl(path: Path | None) -> list[dict]:
    if path is None or not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        rows.append(_normalize(item))
    return rows


def load_from_db() -> list[dict]:
    from skill_analyzer.db import connect

    rows = []
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT "featureVector", "labelRating"
                FROM "SkillTrainingSample"
                WHERE status = 'CONFIRMED'
                """
            )
            for features, label in cur.fetchall():
                rows.append(_normalize({"features": features, "y": float(label)}))
    return rows


def _normalize(item: dict) -> dict:
    if "x" in item and isinstance(item["x"], list) and len(item["x"]) == len(FEATURE_KEYS):
        x = [float(v) for v in item["x"]]
    else:
        features = item.get("features") or {}
        x = [float(features.get(key, 0)) for key in FEATURE_KEYS]
    return {"x": x, "y": float(item["y"])}


if __name__ == "__main__":
    main()
