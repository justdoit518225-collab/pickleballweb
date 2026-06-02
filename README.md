# PlayPlayPlay

匹克球多租戶、多場館預約平台。

## 功能一覽

### 會員
- Google / LINE 登入
- 球敘、課程：預約、取消、候補、參與名單（暱稱+頭像）
- 場地租借：30 天月曆、多球場
- DUPR：手動連結、API 同步（選填）
- 站內通知收件匣 + LINE 推播 + Email（SMTP 選填）
- 個人資料：各場館暱稱/頭像
- 場館評價

### 場主後台 `/admin/[slug]`
- 建立 **球敘** / **課程** / **場地租借** 時段
- 活動：編輯、停課、名單與候補、DUPR 戰績上傳
- 場館與球場管理
- 會員停權
- 員工權限（Email 指派）

### 平台 `/platform/tenants`
- 超級管理員建立租戶（自動建立主館 + A/B 場）

## 快速開始

```bash
npm install
cp .env.example .env
npx prisma dev   # 另開終端
npm run db:push
npm run db:seed
npm run dev
```

- 首頁 http://localhost:3000
- 場館前台 http://localhost:3000/t/active-pickleball
- 管理後台 http://localhost:3000/admin/active-pickleball

### 超級管理員

`.env` 設 `SEED_SUPER_ADMIN_EMAIL=你的信箱` → 登入一次 → `npm run db:seed`

## 環境變數

見 `.env.example`：`DATABASE_URL`、`AUTH_SECRET`、Google/LINE OAuth、`LINE_CHANNEL_ACCESS_TOKEN`、`DUPR_API_KEY`、`SMTP_*`、`CRON_SECRET`

### 開課提醒 Cron

```bash
curl -H "Authorization: Bearer 你的CRON_SECRET" http://localhost:3000/api/cron/reminders
```

## 指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 開發 |
| `npm run db:push` | 同步 schema |
| `npm run db:seed` | 初始租戶與範例活動 |
