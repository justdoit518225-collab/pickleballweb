# 部署到 Vercel

## 架構

| 項目 | 服務 |
|------|------|
| 網站 | Vercel（Next.js） |
| 資料庫 | Neon 或 Supabase（PostgreSQL） |
| 網域 | Vercel 子網域或自訂網域 |
| 登入 | Google / LINE OAuth |

本地 `npx prisma dev` **不要**用在正式環境。

---

## 1. 建立雲端資料庫（Neon 建議）

1. 至 [neon.tech](https://neon.tech) 註冊，建立專案
2. 複製 **Pooled connection** 字串（適合 Vercel serverless）
3. 格式類似：
   ```
   postgresql://user:pass@ep-xxx.pooler.region.aws.neon.tech/neondb?sslmode=require
   ```

---

## 2. 同步資料庫結構（在本機執行一次）

在專案目錄，暫時把正式 `DATABASE_URL` 設到環境（勿 commit）：

```powershell
$env:DATABASE_URL="你的 Neon 連線字串"
npx prisma db push
```

若要示範資料與超級管理員（選填）：

```powershell
$env:SEED_SUPER_ADMIN_EMAIL="你的@gmail.com"
npm run db:seed
```

---

## 3. 推送程式碼到 GitHub

```bash
git init   # 若尚未
git add .
git commit -m "Prepare for Vercel deploy"
git remote add origin https://github.com/你的帳號/PickleballWeb.git
git push -u origin main
```

`.env` 已在 `.gitignore`，勿推送密鑰。

---

## 4. Vercel 匯入專案

1. [vercel.com](https://vercel.com) → **Add New Project** → 選 GitHub repo
2. Framework：**Next.js**（自動偵測）
3. Build Command：預設 `npm run build` 即可（已含 `prisma generate`）
4. **Environment Variables** 新增下表（Production）

### 必填環境變數

| 變數 | 值 |
|------|-----|
| `DATABASE_URL` | Neon **Pooled** 連線字串 |
| `AUTH_SECRET` | 新產生：`openssl rand -base64 32` |
| `AUTH_URL` | `https://你的專案.vercel.app` 或自訂網域 |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `ALLOW_DEV_LOGIN` | `false` |
| `SEED_SUPER_ADMIN_EMAIL` | 你的 Gmail（僅 seed 用，可部署後刪） |

### 選填

| 變數 | 說明 |
|------|------|
| `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET` | LINE 登入 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE 推播 |
| `CRON_SECRET` | 開課提醒 API 驗證（見 `vercel.json`） |
| `SMTP_*` | Email 通知 |
| `DUPR_*` | DUPR API |

5. **Deploy**

---

## 5. OAuth 回調網址（部署成功後必改）

將 `https://你的正式網域` 加入（保留 localhost 方便本機開發）：

**Google Cloud Console**

- 已授權 JavaScript 來源：`https://你的網域`
- 重新導向 URI：`https://你的網域/api/auth/callback/google`

**LINE Developers**

- Callback URL：`https://你的網域/api/auth/callback/line`

更新後到 Vercel 確認 `AUTH_URL` 與網域一致。

---

## 6. 自訂網域（選填）

Vercel → Project → **Settings** → **Domains** → 新增網域 → 依指示設定 DNS。

完成後：

1. 更新 `AUTH_URL` 為 `https://你的網域`
2. 更新 Google / LINE 回調網址

---

## 7. 開課提醒 Cron（選填）

專案含 `vercel.json`，每小時呼叫 `/api/cron/reminders`。

1. 在 Vercel 設 `CRON_SECRET`（隨機字串）
2. Vercel Cron 會帶 `Authorization: Bearer <CRON_SECRET>`（需 Pro 方案才支援完整 Cron；Hobby 可改用手動或外部 cron 打 API）

---

## 8. 部署後檢查清單

- [ ] 首頁可開啟
- [ ] `/t/active-pickleball` 活動列表正常
- [ ] Google 登入成功
- [ ] 預約／取消可寫入資料庫
- [ ] `/admin/active-pickleball` 管理員可進入
- [ ] `ALLOW_DEV_LOGIN` 為 `false`（正式站不應出現開發信箱登入）

---

## 常見問題

**Build 失敗：Prisma**

確認 Vercel 有 `DATABASE_URL`（Build 時 prisma generate 需要讀 schema，部分設定需 URL 存在）。

**登入後跳轉錯誤**

檢查 `AUTH_URL` 是否與瀏覽器網址完全一致（含 `https`、無尾端 `/`）。

**資料庫連線過多**

務必使用 Neon 的 **Pooled** 連線字串，不要用 Direct。

**重新部署**

Push 到 GitHub 主分支 → Vercel 自動重新部署。
