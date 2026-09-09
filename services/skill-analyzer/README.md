# 影片估算實力等級 — 本機分析服務

Next.js 網站負責登入與報告；此服務負責影片直傳、人體/球追蹤與 heuristic 等級估算。

產出是 **Estimated Skill Level**，非正式 DUPR。

## 需求

- Python 3.11+
- PostgreSQL（與網站同一 `DATABASE_URL`）
- 建議安裝 [FFmpeg](https://ffmpeg.org/)（截成 720p / 30fps / 最長 5 分鐘）
- Redis（可選；沒有時會在 API 行程內同步分析）
- 第一次執行會下載 `yolov8n-pose.pt`

Windows 上 Celery 請用 `--pool=solo`。

## 啟動

在專案根目錄的 `.env` 加上：

```
SKILL_ANALYZER_URL=http://127.0.0.1:8090
SKILL_ANALYZER_SECRET=請填與網站相同的密鑰
REDIS_URL=redis://127.0.0.1:6379/0
```

也可設 `SKILL_ANALYZER_INLINE=1` 略過 Celery。

```powershell
cd services/skill-analyzer
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# 終端 1：Redis（或 docker compose -f docker-compose.skill.yml up）
# 終端 2：API
uvicorn skill_analyzer.main:app --host 127.0.0.1 --port 8090

# 終端 3（可選）：worker
celery -A skill_analyzer.celery_app worker --loglevel=info --pool=solo
```

網站：`npm run dev` 後到 `/me/skill-estimate`。

正式站（https://www.playplayplay.fun）只部署 Next.js。分析服務需有**公開 HTTPS**，並在 Vercel 設定：

- `SKILL_ANALYZER_URL`：worker 網址
- `SKILL_ANALYZER_SECRET`：與 worker 相同

Worker 環境變數另需 `CORS_ORIGINS=https://www.playplayplay.fun,https://playplayplay.fun` 與同一個 `DATABASE_URL`（Neon）。

## 流程

1. 會員上傳 mp4/webm/mov（≤200MB、建議 3–5 分鐘、後場高處拍攝）
2. 服務抽幀並標出人物框
3. 使用者點選目標球員與球場四角（近端左→近端右→遠端右→遠端左）
4. YOLOv8-Pose + ByteTrack + 黃球顏色追蹤 + 四點 homography
5. 依失誤代理、廚房區停留、動作流暢度輸出 2.0–5.5 區間（`heuristic-v1`）
