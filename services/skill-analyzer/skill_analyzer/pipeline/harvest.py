"""從 YouTube 蒐集「標題有 DUPR／技能等級」的對打影片，抽特徵後寫入訓練 JSONL。

用法（在 services/skill-analyzer）：
  .\\.venv\\Scripts\\python.exe -m skill_analyzer.pipeline.harvest --discover-only
  .\\.venv\\Scripts\\python.exe -m skill_analyzer.pipeline.harvest --max-videos 12
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from skill_analyzer.config import settings
from skill_analyzer.pipeline.labels import parse_skill_label

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

QUERIES = [
    "DUPR 2.5 pickleball doubles",
    "DUPR 3.0 pickleball doubles gameplay",
    "DUPR 3.5 pickleball doubles match",
    "DUPR 4.0 pickleball doubles match",
    "DUPR 4.5 pickleball doubles",
    "DUPR 5.0 pickleball amateur doubles",
    "3.5 DUPR pickleball rec play",
    "4.0 pickleball tournament doubles DUPR",
    "3.0 3.5 DUPR reported doubles pickleball",
]

SEED_URLS = [
    "https://www.youtube.com/watch?v=x0uPiyt8-KU",
]

SKIP_TITLE = re.compile(
    r"how to|tips on|what does|formula|what's holding|based on ratings|explained|drill",
    re.I,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Harvest labeled pickleball videos from YouTube")
    parser.add_argument("--max-videos", type=int, default=18)
    parser.add_argument("--per-query", type=int, default=5)
    parser.add_argument("--discover-only", action="store_true")
    parser.add_argument("--out", type=Path, default=_default_jsonl())
    parser.add_argument("--work-dir", type=Path, default=_default_work())
    parser.add_argument("--max-duration-sec", type=int, default=180)
    args = parser.parse_args()

    args.work_dir.mkdir(parents=True, exist_ok=True)
    args.out.parent.mkdir(parents=True, exist_ok=True)

    catalog = discover(args.per_query)
    catalog_path = args.work_dir / "catalog.jsonl"
    _write_jsonl(catalog_path, catalog)
    print(f"discovered {len(catalog)} labeled videos → {catalog_path}")
    if args.discover_only:
        return

    done_ids = _existing_ids(args.out)
    written = 0
    for item in catalog:
        if written >= args.max_videos:
            break
        video_id = item["id"]
        if video_id in done_ids:
            print(f"skip existing {video_id}")
            continue
        try:
            row = harvest_one(item, args.work_dir, args.max_duration_sec)
        except Exception as exc:  # noqa: BLE001
            print(f"fail {video_id}: {exc}")
            continue
        if not row:
            continue
        with args.out.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
        done_ids.add(video_id)
        written += 1
        print(f"saved {video_id} y={row['y']} ({written}/{args.max_videos})")
    print(f"harvest complete written={written} jsonl={args.out}")


def discover(per_query: int) -> list[dict]:
    seen: set[str] = set()
    items: list[dict] = []
    for url in SEED_URLS:
        meta = _yt_meta(url)
        parsed = _accept(meta, seen)
        if parsed:
            items.append(parsed)
    for query in QUERIES:
        for meta in _yt_search(query, per_query):
            parsed = _accept(meta, seen)
            if parsed:
                items.append(parsed)
    items.sort(key=lambda i: (not i["hasDupr"], i["mixed"], abs(i["y"] - 3.8)))
    return items


def harvest_one(item: dict, work_dir: Path, max_duration_sec: int) -> dict | None:
    from skill_analyzer.pipeline.analyze import run_full_analysis
    from skill_analyzer.pipeline.score import observed_vector

    video_dir = work_dir / item["id"]
    video_dir.mkdir(parents=True, exist_ok=True)
    video = _download(item["url"], video_dir)
    if not video:
        return None
    result = run_full_analysis(
        video,
        video_dir,
        auto=True,
        max_duration_sec=max_duration_sec,
    )
    metrics = result.get("metrics") or {}
    observed = (metrics.get("rubricMatch") or {}).get("observed") or observed_vector(metrics)
    x = [float(observed.get(key, 0)) for key in FEATURE_KEYS]
    return {
        "id": item["id"],
        "jobId": f"yt:{item['id']}",
        "source": "youtube",
        "url": item["url"],
        "title": item["title"],
        "status": "CONFIRMED",
        "format": "DOUBLES",
        "y": item["y"],
        "labelConfidence": item["confidence"],
        "hasDupr": item["hasDupr"],
        "featureOrder": list(FEATURE_KEYS),
        "features": observed,
        "x": x,
        "modelVersion": result.get("modelVersion"),
        "estimatedMid": result.get("estimatedMid"),
        "storageKey": str(video),
    }


def _accept(meta: dict | None, seen: set[str]) -> dict | None:
    if not meta:
        return None
    video_id = str(meta.get("id") or "")
    title = str(meta.get("title") or "")
    if not video_id or video_id in seen:
        return None
    duration = meta.get("duration")
    if duration is not None and (duration < 90 or duration > 2400):
        return None
    if SKIP_TITLE.search(title):
        return None
    parsed = parse_skill_label(title, str(meta.get("description") or ""))
    if not parsed:
        return None
    if parsed["mixed"] and parsed["raw"] and abs(parsed["raw"][0] - parsed["raw"][-1]) >= 1.5:
        return None
    seen.add(video_id)
    return {
        "id": video_id,
        "url": meta.get("webpage_url") or f"https://www.youtube.com/watch?v={video_id}",
        "title": title,
        "duration": duration,
        **parsed,
    }


def _yt_search(query: str, limit: int) -> list[dict]:
    cmd = [
        sys.executable,
        "-m",
        "yt_dlp",
        f"ytsearch{limit}:{query}",
        "--flat-playlist",
        "--dump-json",
        "--no-warnings",
        "--skip-download",
    ]
    try:
        out = subprocess.check_output(cmd, text=True, timeout=120, stderr=subprocess.DEVNULL)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError) as exc:
        print(f"search fail [{query}]: {exc}")
        return []
    rows = []
    for line in out.splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def _yt_meta(url: str) -> dict | None:
    cmd = [
        sys.executable,
        "-m",
        "yt_dlp",
        url,
        "--dump-json",
        "--no-warnings",
        "--skip-download",
    ]
    try:
        out = subprocess.check_output(cmd, text=True, timeout=90, stderr=subprocess.DEVNULL)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        return None
    line = next((item for item in out.splitlines() if item.strip()), "")
    return json.loads(line) if line else None


def _download(url: str, dest_dir: Path) -> Path | None:
    existing = next(dest_dir.glob("clip.*"), None)
    if existing:
        return existing
    outtmpl = str(dest_dir / "clip.%(ext)s")
    cmd = [
        sys.executable,
        "-m",
        "yt_dlp",
        url,
        "-f",
        "bv*[height<=720][ext=mp4]/b[height<=720]/b",
        "--no-playlist",
        "--no-warnings",
        "-o",
        outtmpl,
        "--download-sections",
        "*0:00-3:00",
        "--force-keyframes-at-cuts",
    ]
    try:
        subprocess.run(cmd, check=True, timeout=240)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        cmd = [sys.executable, "-m", "yt_dlp", url, "-f", "b[height<=480]/b", "--no-playlist", "-o", outtmpl]
        try:
            subprocess.run(cmd, check=True, timeout=240)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            return None
    files = sorted(dest_dir.glob("clip.*"), key=lambda p: p.stat().st_size, reverse=True)
    return files[0] if files else None


def _default_work() -> Path:
    return settings.storage_path.parent / "web-training"


def _default_jsonl() -> Path:
    return _default_work() / "web-labeled.jsonl"


def _existing_ids(path: Path) -> set[str]:
    ids: set[str] = set()
    if not path.exists():
        return ids
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            ids.add(str(json.loads(line).get("id") or ""))
        except json.JSONDecodeError:
            continue
    ids.discard("")
    return ids


def _write_jsonl(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
