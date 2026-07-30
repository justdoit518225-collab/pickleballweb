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
2. 貼上以下程式並修改 `SPREADSHEET_ID`、`SECRET`：

```javascript
const SPREADSHEET_ID = "1_VOEp_YwG8iD6P4jde5FpdKTaCXNQANZnjHVoIiuPQI";
const SECRET = "playplay-roster-2026"; // 與 Vercel 環境變數相同
const SHEET_NAME = ""; // 空白 = 使用第一個工作表；或填「工作表1」

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

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = SHEET_NAME
      ? ss.getSheetByName(SHEET_NAME)
      : ss.getSheets()[0];
    if (!sheet) {
      return json_({ ok: false, error: "sheet not found" });
    }

    // 若第一列是空的，寫入表頭
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["時間", "人數", "名單"]);
    }

    const ts =
      data.timestamp ||
      Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");
    const roster = names
      .map(function (name, i) {
        return i + 1 + ". " + name;
      })
      .join("\n");

    sheet.appendRow([ts, names.length, roster]);

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

// 瀏覽器直接打開 Web App URL 應看到 {"ok":true,"service":"sheets-roster"}
function doGet() {
  return json_({ ok: true, service: "sheets-roster" });
}
```

3. **部署 → 新增部署作業 → 網頁應用程式**
   - 執行身分：我
   - 具有存取權的使用者：**所有人**
4. 複製 **網頁應用程式** URL（不是部署作業 ID、不是資料庫 URL）

若之後有改 Script：  
**部署 → 管理部署作業 → 編輯 → 版本選「新版本」→ 部署**（URL 通常不變）

### 快速自測 Script（不經網站）

在 Apps Script 編輯器新增暫存函式，按執行：

```javascript
function testAppend() {
  const e = {
    postData: {
      contents: JSON.stringify({
        secret: SECRET,
        timestamp: "手動測試",
        names: ["測試A", "測試B"],
      }),
    },
  };
  Logger.log(doPost(e).getContent());
}
```

若執行後試算表有新增列，代表 Script 本身沒問題，問題在 Vercel URL／SECRET／是否 Redeploy。

## 3. Vercel 環境變數

```env
GOOGLE_DOCS_ROSTER_WEBHOOK_URL="https://script.google.com/macros/s/xxxx/exec"
GOOGLE_DOCS_ROSTER_SECRET="playplay-roster-2026"
```

設完後 **Redeploy**。

## 4. 寫入格式（每一列一筆）

| 時間 | 人數 | 名單 |
|------|------|------|
| 2026/07/30 10:12:00 | 7 | 1. 建伸<br>2. Lester<br>... |

## 常見問題

1. **用錯 ID**：一定要含 `1_` 的完整 ID  
2. **用 DocumentApp 寫試算表**：一定會失敗，請用上面的 `SpreadsheetApp`  
3. **SECRET 不一致**：會回 `unauthorized`，文件／表格不會新增  
4. **沒發新版本**：改完 Script 忘記部署新版本，網站仍打到舊程式  
5. **HTTP 405**：網站對 Apps Script 的 302 轉址誤用 POST 會出現；後端應對 Location 發 **GET** 取回傳內容（第一次 POST 已寫入）
