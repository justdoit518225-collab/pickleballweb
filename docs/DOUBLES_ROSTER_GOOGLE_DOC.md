# 雙打賽程報名名單 → Google 文件

按「產生賽程」時，系統只會把**報名清單 + 時間戳**追加到指定 Google 文件（不存賽程內容）。

## 1. 建立 Google 文件

1. 到 [Google 文件](https://docs.google.com/) 開一份新文件，例如標題：`雙打賽程報名紀錄`
2. 複製網址中的文件 ID：  
   `https://docs.google.com/document/d/【這裡是 DOCUMENT_ID】/edit`

## 2. 建立 Apps Script

1. 開啟該文件 → **擴充功能** → **Apps Script**
2. 貼上以下程式，並把 `DOCUMENT_ID`、`SECRET` 改成你的值：

```javascript
const DOCUMENT_ID = "把文件ID貼這裡";
const SECRET = "自訂一組密鑰字串"; // 可空白，但建議設定

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

    const doc = DocumentApp.openById(DOCUMENT_ID);
    const body = doc.getBody();
    const ts = data.timestamp || new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });

    body.appendParagraph("────────────────");
    body.appendParagraph("時間：" + ts);
    body.appendParagraph("人數：" + names.length);
    names.forEach(function (name, i) {
      body.appendParagraph(i + 1 + ". " + name);
    });
    body.appendParagraph("");

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
```

3. **部署** → **新增部署作業** → 類型選 **網頁應用程式**
   - 執行身分：我
   - 具有存取權的使用者：**所有人**
4. 部署後複製 **網頁應用程式 URL**

## 3. 設定 Vercel / 本機環境變數

```env
GOOGLE_DOCS_ROSTER_WEBHOOK_URL="https://script.google.com/macros/s/xxxx/exec"
GOOGLE_DOCS_ROSTER_SECRET="與 Script 內 SECRET 相同"
```

正式站請到 Vercel → Settings → Environment Variables 新增後 **Redeploy**。

## 4. 文件內容範例

```
────────────────
時間：2026/07/30 09:45:12
人數：7
1. 建伸
2. Lester
3. Ruby
...
```

## 常見問題：網站按了但文件沒資料

多數是 **Apps Script 302 轉址** 造成 POST 內容遺失，或 Script 回傳 HTML 卻被當成成功。

請確認：
1. 部署類型是 **網頁應用程式**，存取權 **所有人**
2. 程式有 `doPost(e)`，且改過程式後有發佈 **新版本**
3. Vercel 環境變數 `GOOGLE_DOCS_ROSTER_SECRET` 與 Script 的 `SECRET` 一致
4. 打開的是 Script 裡 `DOCUMENT_ID` 那份文件（不要開錯檔）

伺服器會驗證 Script 回傳的 JSON 必須含 `"ok": true` 才算成功。
