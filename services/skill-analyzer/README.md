# 影片估算實力等級 — 本機分析服務

Next.js 網站負責登入與報告；此服務負責影片直傳、人體/球追蹤與 heuristic 等級估算。

產出是 **Estimated Skill Level**，非正式 DUPR。

## 正式站（最少維護）：Railway

不必自己管 Linux / SSL / 重開機。網站仍在 Vercel，分析服務交給 Railway 常開容器。

**不必填 Root Directory。** 專案根目錄已有 `railway.toml` + `Dockerfile.railway`，Railway 會自動拿來建置。

1. 到 [railway.app](https://railway.app) 用 GitHub 登入
2. **New Project** → **Deploy from GitHub repo** → 選 `pickleballweb`
3. 若問 Framework / Build，維持用 repo 設定即可；**不要**去填 Root Directory
4. 點畫布上的**服務方塊**（不是左下角 Project Settings）
5. **Settings → Volume**：**Add Volume**，掛載路徑填 `/data`
6. **Settings → Resources**：記憶體建議 **8 GB**
7. **Variables** 新增：

| 變數 | 值 |
|------|-----|
| `DATABASE_URL` | 與 Vercel 相同的 Neon **Pooled** 連線 |
| `SKILL_ANALYZER_SECRET` | 自訂長隨機字串（之後貼到 Vercel 同一組） |
| `SKILL_ANALYZER_INLINE` | `1` |
| `STORAGE_DIR` | `/data` |
| `CORS_ORIGINS` | `https://www.playplayplay.fun,https://playplayplay.fun` |

8. 部署完成後複製公開網址（`https://xxxx.up.railway.app`，不要結尾斜線）
9. 到 Vercel 專案環境變數新增：
   - `SKILL_ANALYZER_URL` = 上一步網址
   - `SKILL_ANALYZER_SECRET` = 與 Railway 相同
10. Redeploy 一次 Vercel（讓正式站吃到新變數）

若剛才已經建了服務、建置失敗或建成 Next.js：刪掉該服務再 Deploy 一次即可（GitHub 現在有根目錄設定檔）。

之後平常不用管機器；程式有更新時 push `main`，Railway 會自動重建。單次分析可能要數分鐘，請用 3–5 分鐘、約 100MB 以內的精華片。

## 家裡電腦 + 免費 Tunnel（不加雲端月費）

電腦要開著才能分析。正式站（Vercel）把影片送到你家，經 Cloudflare 免費網址。

第一次：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-home-skill-analyzer.ps1
```

之後每次要提供分析：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-home-skill-analyzer.ps1
```

畫面上會出現 `https://xxxx.trycloudflare.com`。到 Vercel → pickleballwebx → Settings → Environment Variables：

| 變數 | 值 |
|------|-----|
| `SKILL_ANALYZER_URL` | 那串 `https://xxxx.trycloudflare.com`（不要結尾斜線） |
| `SKILL_ANALYZER_SECRET` | 與本機 `.env` 的 `SKILL_ANALYZER_SECRET` 完全相同 |

存檔後 **Redeploy** 一次 Production。Tunnel 每次重開會換網址，換了就要改 `SKILL_ANALYZER_URL` 再 Redeploy。


## 本機開發

- Python 3.11+
- PostgreSQL（與網站同一 `DATABASE_URL`）
- 建議安裝 [FFmpeg](https://ffmpeg.org/)（截成 720p / 30fps / 最長 5 分鐘）
- Redis（可選；沒有時會在 API 行程內同步分析）
- 第一次執行會下載 `yolov8n-pose.pt`

Windows 上 Celery 請用 `--pool=solo`。

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


## 流程

1. 會員上傳 mp4/webm/mov（≤200MB、建議 3–5 分鐘、後場高處拍攝）
2. 服務抽幀並標出人物框
3. 使用者點選目標球員與球場四角（近端左→近端右→遠端右→遠端左）
4. YOLOv8-Pose + ByteTrack + 黃球顏色追蹤 + 四點 homography
5. 依失誤代理、廚房區停留、動作流暢度輸出 2.0–5.5 區間（`heuristic-v1`）
