# YieldLog

個人定存記錄工具（Hong Kong Fixed Deposit Tracker）— 追蹤管理銀行定期存款，繁體中文介面，港幣結算。

## 功能

- **用戶認證** — Supabase Auth（Email/密碼）
- **銀行管理** — 自訂銀行清單，下拉選擇
- **定存記錄** — 金額、期限、利率、利息 auto-calc（可調整）
- **到期管理** — 到期日 auto-calc（可調整），自動標記已期滿
- **儀表板** — 總資產、平均利率、利息收益、本月到期
- **PWA** — 可安裝至手機主畫面

## 技術棧

| 層級 | 技術                                |
| ---- | ----------------------------------- |
| 框架 | VitePlus + React 19 + TypeScript 6  |
| UI   | Mantine UI v7 + Material Symbols    |
| 狀態 | Zustand 5                           |
| 後端 | Supabase（PostgreSQL + Auth + RLS） |
| PWA  | vite-plugin-pwa                     |
| 日期 | dayjs                               |

## 開始

### 前置需求

- Node.js >= 18
- npm >= 11
- [Supabase](https://supabase.com) 專案

### 安裝

```bash
npm install
```

### 環境變數

```bash
cp .env.example .env
```

在 `.env` 填入 Supabase 專案的 URL 和 Anon Key。

### 資料庫設定

1. 前往 Supabase Dashboard → **SQL Editor**
2. 將 `supabase/schema.sql` 全部貼上並執行
3. 前往 **Authentication → Settings** → 關閉 **Confirm email**

### 啟動

```bash
vp dev
```

## 使用

1. **註冊帳戶** — 註冊後自動建立 6 間預設銀行（HSBC、渣打、中銀、恒生、ZA、Mox）
2. **新增定存** — 點擊右下角 FAB（+），填寫銀行、金額、期限、利率
3. **自動計算** — 系統自動算利息和到期日，可手動修改
4. **儀表板** — 查看總資產、平均利率、利息收益、定存列表
5. **銀行管理** — 新增/編輯/刪除銀行名稱

## 資料模型

### banks

| 欄位       | 型別      | 說明            |
| ---------- | --------- | --------------- |
| id         | uuid      | 主鍵            |
| user_id    | uuid (FK) | 關聯 auth.users |
| name       | text      | 銀行名稱        |
| created_at | timestamp | 建立時間        |

### fixed_deposits

| 欄位          | 型別      | 說明                        |
| ------------- | --------- | --------------------------- |
| id            | uuid      | 主鍵                        |
| user_id       | uuid (FK) | 關聯 auth.users             |
| bank_id       | uuid (FK) | 關聯 banks                  |
| amount        | numeric   | 存款金額                    |
| period_value  | integer   | 期限數值                    |
| period_unit   | text      | 單位（day/week/month/year） |
| interest_rate | numeric   | 年利率                      |
| interest      | numeric   | 利息（可修改）              |
| start_date    | date      | 起息日                      |
| end_date      | date      | 到期日（可修改）            |
| created_at    | timestamp | 建立時間                    |

## 截圖

<!-- 未來可放截圖 -->

## License

MIT
