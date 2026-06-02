# LINE 登入設定（從零開始）

PlayPlayPlay 已內建 LINE Login。你現在看到「LINE 登入需設定 LINE_CLIENT_ID」，代表還沒在 **LINE Developers** 建立 Channel，也還沒把 ID / Secret 填進 `.env` 與 Vercel。

官方參考：[Getting started with LINE Login](https://developers.line.biz/en/docs/line-login/getting-started/) · [整合網頁登入](https://developers.line.biz/en/docs/line-login/integrate-line-login/)

---

## 事前準備

| 需要 | 說明 |
|------|------|
| LINE 帳號 | 手機上的 LINE（用來測試登入） |
| 瀏覽器 | 建議 Chrome / Edge |
| 電子郵件 | 接收 Channel 通知（可用 Gmail） |

---

## 第一步：註冊 LINE 開發者

1. 開啟 **[LINE Developers Console](https://developers.line.biz/console/)**
2. 用 LINE 帳號或 Business ID 登入
3. 若第一次使用，畫面會要求同意 **LINE Developers 條款** → 勾選同意 → 完成註冊

---

## 第二步：建立 Provider（提供者）

Provider 代表「誰在營運這個 App」（你或你的公司）。一個 Provider 底下可以有多個 Channel。

1. 登入後在首頁點 **Create a new provider**（建立新的 Provider）
2. 填寫：
   - **Provider name**：例如 `PlayPlayPlay` 或你的名字
   - **Provider description**：簡短說明，例如「匹克球預約平台」
3. 送出建立

> 之後 Channel **不能**搬到別的 Provider，名稱想清楚再建即可。

---

## 第三步：建立 LINE Login Channel

1. 點進剛建立的 **Provider**
2. 上方或側邊選 **Channels**（頻道）分頁
3. 點 **Create a new channel**（建立新頻道）
4. **Channel type** 選 **LINE Login**（不要選 Messaging API，那是推播用）

### 建立表單怎麼填（建議值）

| 欄位 | 必填 | 建議填法 |
|------|------|----------|
| Provider | ✅ | 選剛建立的 Provider |
| Region to provide the service | ✅ | **Taiwan**（台灣服務） |
| Company or owner's country or region | ✅ | **Taiwan** |
| Channel name | ✅ | `PlayPlayPlay`（名稱勿含「LINE」字樣） |
| Channel description | ✅ | `匹克球多場館預約平台` |
| App types | ✅ | 勾選 **Web app**（網頁應用程式） |
| Email address | ✅ | 你的信箱（如 `justdoit518225@gmail.com`） |
| Privacy policy URL | 視帳號 | 見下方說明 |
| Terms of use URL | 選填 | 可留空或填官網 |
| LINE Developers Agreement | ✅ | 勾選同意 |

**Privacy policy URL（隱私權政策）**

- 正式上線建議使用：`https://www.playplayplay.fun` 或未來的隱私權專頁
- 若表單暫時要求網址：可先用官網首頁；之後再補獨立隱私權頁

5. 按 **Create** 建立 Channel

---

## 第四步：Channel 狀態「開發中」與測試帳號

新 Channel 預設為 **Developing（開發中）**：

- 只有被加入 **Admin / Tester** 的開發者，能用 LINE 登入測試
- 一般民眾要等改成 **Published（已發布）** 才能用

### 4-1 確認你的 LINE 有綁開發者帳號

1. Console 右上角頭像 → **Account** 或 **Settings**
2. 確認 **Business ID** 已與你測試用的 **LINE 帳號** 連結  
   （官方說明：[Link Business ID with LINE account](https://developers.line.biz/en/docs/line-developers-console/login-account/)）
3. 測試登入時，請用 **這支已連結的 LINE App** 掃碼／同意，不要用 Business ID 的 email 密碼登入

### 4-2 之後要給所有人用（選做）

1. 進入 Channel 首頁
2. 頂部狀態 **Developing** → 點選改為 **Published**  
   （發布後通常無法改回 Developing，確認功能完成再發布）

---

## 第五步：設定 Callback URL（非常重要）

Callback 是 LINE 登入成功後，導回你網站的網址。**少一個字都會失敗。**

1. 在 Channel 左側或上方分頁點 **LINE Login**
2. 找到 **Callback URL**（或 **Callback URL list**）
3. 按 **Edit** / **Add**，**每一行一個** URL，建議全加：

```
http://localhost:3000/api/auth/callback/line
https://playplayplay.fun/api/auth/callback/line
https://www.playplayplay.fun/api/auth/callback/line
```

4. **Save** 儲存

注意：

- 路徑必須是 **`/api/auth/callback/line`**（與程式一致）
- 你平常用 `www` 開站，`AUTH_URL` 也要用 `https://www.playplayplay.fun`
- 不要用尾端 `/`

### 確認 App type 是 Web app

1. 點 **Basic settings** 分頁
2. **App types** 應顯示 **Web app**  
   若不是，在 LINE Login 相關設定中改為 Web app

---

## 第六步：複製 Channel ID 與 Channel secret

1. 仍在該 Channel → **Basic settings**
2. 找到並複製：

| LINE 畫面上的名稱 | 貼到專案環境變數 |
|------------------|------------------|
| **Channel ID** | `LINE_CLIENT_ID` |
| **Channel secret** | `LINE_CLIENT_SECRET` |

3. **Channel secret** 若沒顯示，按 **Issue** / **顯示**（只顯示一次，請立刻存到密碼管理器）

---

## 第七步：Email 權限（選填，建議之後再開）

若希望 LINE 登入能取得 email（與 Google 帳號合併較方便）：

1. Channel → **LINE Login** → **OpenID Connect** 或 **Email address permission**
2. 申請 **email** 權限並等待審核

未申請也能登入，只是可能沒有 email，系統會用 LINE 使用者 ID 建立帳號。

---

## 第八步：寫入本機 `.env`

編輯 `c:\Users\user\PickleballWeb\.env`：

```env
LINE_CLIENT_ID="貼上 Channel ID（純數字）"
LINE_CLIENT_SECRET="貼上 Channel secret"
```

同時確認已有：

```env
AUTH_SECRET="你的隨機密鑰"
AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

儲存後**重啟**開發伺服器：

```powershell
cd c:\Users\user\PickleballWeb
npm run dev
```

瀏覽 http://localhost:3000/login → 應出現綠色 **「使用 LINE 登入」**。

本機檢查：http://localhost:3000/api/auth/providers 應包含 `"line": { ... }`。

---

## 第九步：Vercel 正式站（pickleballwebx）

1. [vercel.com](https://vercel.com) → 專案 **pickleballwebx**
2. **Settings** → **Environment Variables**
3. 新增（或編輯）：

| Name | Value |
|------|--------|
| `LINE_CLIENT_ID` | 與本機相同 Channel ID |
| `LINE_CLIENT_SECRET` | 與本機相同 Channel secret |
| `AUTH_URL` | `https://www.playplayplay.fun`（與你實際網址一致） |

4. 勾選 **Production**（建議 Preview 也勾）
5. **Save**
6. **Deployments** → **Redeploy**（建議**取消** Use existing Build Cache）

正式站檢查：

- https://www.playplayplay.fun/api/auth/providers 有 `"line"`
- https://www.playplayplay.fun/login 有 LINE 按鈕

---

## 第十步：實際測試登入

1. 用**無痕視窗**開登入頁
2. 點 **使用 LINE 登入**
3. 用手機 LINE 或網頁 QR 登入 → **同意**授權
4. 成功應導向 **https://www.playplayplay.fun/me**（會員中心）

若 Channel 仍是 **Developing**，請用**已加入 Tester 的 LINE** 測試。

---

## 常見錯誤

| 現象 | 原因與處理 |
|------|------------|
| `OAuthCallbackError` | **最常見**：用 `www.playplayplay.fun` 開站，但 Vercel `AUTH_URL` 填 `https://playplayplay.fun`（少 www）。兩者必須完全一致，LINE Callback 也要同一個網域 |
| 登入頁仍寫「需設定 LINE_CLIENT_ID」 | 未填 `.env` / Vercel 變數，或未 Redeploy |
| `redirect_uri` / Callback 錯誤 | Callback URL 與網址不一致；檢查 `www`、路徑、https |
| 按 LINE 後立刻回登入頁 | `AUTH_URL` 錯、或 `AUTH_SECRET` 未設；看 Vercel Logs |
| `OAuthAccountNotLinked` | 同 email 曾用 Google；再試一次（程式已允許連結） |
| 一般使用者無法登入 | Channel 還在 Developing → 改 Published 或加入 Tester |
| 開發者自己也登不進 | Business ID 未連結測試用 LINE 帳號 |

---

## LINE 登入 vs LINE 推播（不要搞混）

| 功能 | 需要 | 環境變數 |
|------|------|----------|
| **LINE 登入** | LINE **Login** Channel | `LINE_CLIENT_ID`、`LINE_CLIENT_SECRET` |
| **LINE 推播通知** | **Messaging API** Channel | `LINE_CHANNEL_ACCESS_TOKEN` |

登入只要完成本文件即可；推播是另一個 Channel，見 `.env.example`。

---

## 檢查清單（可逐項打勾）

- [ ] 已建立 Provider
- [ ] 已建立 **LINE Login** Channel（App type = Web app）
- [ ] Callback URL 已加 localhost + 正式網域（含 `/api/auth/callback/line`）
- [ ] 已複製 Channel ID、Channel secret
- [ ] 本機 `.env` 已填並重啟 `npm run dev`
- [ ] Vercel 已填相同變數並 Redeploy
- [ ] `AUTH_URL` 與瀏覽器網址一致（含不含 www）
- [ ] `/api/auth/providers` 有 `line`
- [ ] 測試 LINE 登入可進入 `/me`
