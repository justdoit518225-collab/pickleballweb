# 雙打賽程報名名單 → Google 試算表（Sheets）

按「產生賽程」時，系統只會把**報名清單 + 時間戳**送到你的 Apps Script，由 Script 寫入指定試算表（不存賽程內容）。

> 若你用的是 `docs.google.com/spreadsheets/...`，請用本頁 **Sheets** 版 Script。  
> `DocumentApp` 只能寫 Google 文件，無法寫試算表。

## 1. 取得試算表 ID

網址例如：

```text
https://docs.google.com/spreadsheets/d/1_VOEp_YwG8iD6P4jde5FpdKTaCXNQANZnjHVoIiuPQI/edit?gid=0#gid=0
```

ID 是 `/d/` 與 `/edit` 中間**整段**（含前面的 `1_`）：

```text
1_VOEp_YwG8iD6P4jde5FpdKTaCXNQANZnjHVoIiuPQI
```

## 2. Apps Script（貼到試算表）

1. 打開該試算表 → **擴充功能 → Apps Script**
2. 貼上以下程式（確認 `SPREADSHEET_ID`、`SECRET`）：

```javascript
const SPREADSHEET_ID = "1_VOEp_YwG8iD6P4jde5FpdKTaCXNQANZnjHVoIiuPQI";
const SECRET = "playplay-roster-2026"; // 與 Vercel 環境變數相同
const SHEET_NAME = ""; // 空白 = 第一個工作表
const MAX_PLAYERS = 8; // 橫向展開欄位數量（D~K = #1~#8）

function getTargetSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (SHEET_NAME) {
    const named = ss.getSheetByName(SHEET_NAME);
    if (!named) throw new Error("sheet not found: " + SHEET_NAME);
    return named;
  }
  return ss.getSheets()[0];
}

function headerRow_() {
  const headers = ["時間", "人數", "名單"];
  for (var i = 1; i <= MAX_PLAYERS; i++) {
    headers.push("#" + i);
  }
  return headers;
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headerRow_());
    return;
  }
  // 若已有舊表頭（只有 3 欄），補上 #1~#8
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  if (lastCol < 3 + MAX_PLAYERS) {
    sheet.getRange(1, 1, 1, 3 + MAX_PLAYERS).setValues([headerRow_()]);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    if (SECRET && data.secret !== SECRET) {
      return json_({ ok: false, error: "unauthorized" });
    }

    const names = Array.isArray(data.names) ? data.names.filter(Boolean) : [];
    if (!names.length) {
      return json_({ ok: false, error: "empty names" });
    }

    const sheet = getTargetSheet_();
    ensureHeader_(sheet);

    const ts =
      data.timestamp ||
      Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");

    // A 時間 / B 人數 / C 名單（空白，改展開到 D 起）/ D=#1 / E=#2 ...
    const row = [ts, names.length, ""];
    for (var i = 0; i < MAX_PLAYERS; i++) {
      row.push(names[i] || "");
    }
    sheet.appendRow(row);

    return json_({ ok: true, count: names.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doGet() {
  return json_({ ok: true, service: "sheets-roster" });
}

/** 在編輯器按「執行」一次，完成試算表授權 */
function authorizeOnce() {
  const name = SpreadsheetApp.openById(SPREADSHEET_ID).getName();
  Logger.log("OK: " + name);
}
```

3. **先授權（重要）**
   - 函式選 `authorizeOnce` → **執行** → 允許存取試算表
4. **部署 → 管理部署作業 → 編輯 → 版本選「新版本」→ 部署**
   - 執行身分：我；存取權：**所有人**
5. 網頁應用程式 URL 通常不變，Vercel 不用改

### 若仍出現 spreadsheets 權限錯誤

專案設定 → 顯示 `appsscript.json`，加入：

```json
{
  "timeZone": "Asia/Taipei",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets"
  ]
}
```

再執行 `authorizeOnce`，並部署**新版本**。

## 3. Vercel 環境變數

```env
GOOGLE_DOCS_ROSTER_WEBHOOK_URL="https://script.google.com/macros/s/xxxx/exec"
GOOGLE_DOCS_ROSTER_SECRET="playplay-roster-2026"
GOOGLE_DOCS_ROSTER_ALERT_EMAIL="justdoit518225@gmail.com"

# Gmail SMTP（失敗通知信必填；密碼請用「應用程式密碼」）
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="justdoit518225@gmail.com"
SMTP_PASS="你的16碼應用程式密碼"
SMTP_FROM="PlayPlayPlay <justdoit518225@gmail.com>"
```

寫入失敗**不會**顯示在網站介面；會寄到 `justdoit518225@gmail.com`。

### Gmail 應用程式密碼

1. Google 帳戶開啟 [兩步驟驗證](https://myaccount.google.com/signinoptions/two-step-verification)  
2. 到 [應用程式密碼](https://myaccount.google.com/apppasswords) 建立一組（應用程式選「郵件」）  
3. 把 16 碼貼到 Vercel 的 `SMTP_PASS`（不要用一般 Gmail 登入密碼）

設完後 **Redeploy**。

## 4. 寫入格式（每一列一筆）

| 時間 | 人數 | 名單 | #1 | #2 | #3 | … |
|------|------|------|----|----|----|---|
| 2026/07/30 10:12:00 | 7 | （空白） | 建伸 | Lester | Ruby | … |

- **A** 時間、**B** 人數  
- **C** 保留「名單」欄但內容空白（不再塞整段名單）  
- **D 起** 橫向展開：`#1`、`#2`…最多 8 人  

## 常見問題

1. **用錯 ID**：一定要含 `1_` 的完整 ID  
2. **用 DocumentApp 寫試算表**：一定會失敗，請用 `SpreadsheetApp`  
3. **SECRET 不一致**：會回 `unauthorized`  
4. **沒發新版本**：改完 Script 忘記部署新版本  
5. **HTTP 405**：後端應對 302 Location 發 GET 取回傳內容  
6. **權限錯誤**：執行 `authorizeOnce` 並部署新版本；Web App 請用 `openById`（不要對 `getActiveSpreadsheet` 傳字串）
