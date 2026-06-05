# 樂活板橋：試算表預約明細匯入

## 什麼是 slug？（對應您第 1 點「不懂」）

**slug** 就是網址裡代表「哪一家場館」的英文代號。

| 項目 | 值 |
|------|-----|
| 場館名稱 | 樂活匹克球板橋館 |
| **slug** | **`loho2`** |
| 前台網址 | https://www.playplayplay.fun/t/loho2 |
| 當日看板 | https://www.playplayplay.fun/t/loho2/board?date=2026-06-06 |

匯入腳本預設會找 **顯示名稱含「樂活」** 的租戶；您的場館已是 `loho2`，無需再記 slug。

## 球場（您第 2 點：是 A/B/C）

系統內已有：**A 場、B 場、C場**（共 3 面）。  
試算表寫「租 1 面」→ 佔 1 面；「3 面」→ 依序佔 A/B/C 三面。

## 匯入步驟（整張試算表）

### 1. 從 Excel 匯出 CSV

1. 開啟「預約明細」工作表  
2. **另存新檔** → **CSV UTF-8（逗號分隔）**  
3. 存成：`data/import-loho-reservations.csv`  
4. 欄位請保留（與試算表相同）：

```text
姓名,臨打人數,日期,時段,數
```

（第 5 欄「數」可留空；有值會寫入備註）

### 2. 本機執行（先預覽）

```powershell
cd c:\Users\user\PickleballWeb
# 預覽，不寫入資料庫
npx tsx scripts/import-reservations.mjs data/import-loho-reservations.csv --dry-run
# 確認無誤後正式匯入
npx tsx scripts/import-reservations.mjs data/import-loho-reservations.csv
```

`.env` 的 `DATABASE_URL` 須指向 **Neon 正式庫**（與 Vercel 相同），匯入後正式站才看得到。

### 3. 匯入後檢查

開看板對照試算表：

https://www.playplayplay.fun/t/loho2/board?date=2026-06-06

## 試算表 → 系統怎麼判斷

| 試算表 | 系統 |
|--------|------|
| 臨打人數含 **租**、**N面** | 場地租借 `RentalSlot`（已預約） |
| **樂活○○班**、DUPR、教練課 | 球敘/課程 `Activity`（容量=人數欄） |
| 租1面/5 | 租 1 面，備註 5 人 |
| 姓名欄的人名 | 建立匯入用帳號（之後可改由本人登入綁定） |

## 注意

- 試算表裡的人**未必是網站會員**；匯入會建立 `import-xxx@import.playplayplay.local` 佔位帳號，名單才顯示得出來。  
- 與現有時段**時間重疊**的列會跳過並列出。  
- 之後新預約請改在網站操作，避免與試算表雙軌。
