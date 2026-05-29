# Google 登入設定（justdoit518225@gmail.com）

1. 開啟 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立專案（或選現有專案）
3. **API 和服務** → **OAuth 同意畫面** → 類型選「外部」→ 填寫應用程式名稱 `playplayplay`
4. **憑證** → **建立憑證** → **OAuth 用戶端 ID** → 類型「網頁應用程式」
5. **已授權的 JavaScript 來源**：`http://localhost:3000`
6. **已授權的重新導向 URI**：`http://localhost:3000/api/auth/callback/google`
7. 複製「用戶端 ID」與「用戶端密鑰」到 `.env`：

```env
GOOGLE_CLIENT_ID="你的用戶端ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="你的密鑰"
ALLOW_DEV_LOGIN="false"
```

8. 重啟 `npm run dev`，到 http://localhost:3000/login 用 Google 登入

登入後若需超級管理員，確認 `.env` 有 `SEED_SUPER_ADMIN_EMAIL="justdoit518225@gmail.com"` 並執行 `npm run db:seed`。
