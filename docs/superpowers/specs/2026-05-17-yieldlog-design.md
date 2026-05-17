# YieldLog 設計規格

## 概述

YieldLog 是一個個人定存記錄工具，幫助用戶追蹤和管理銀行的定期存款，包含多維度統計分析。介面語言為繁體中文，貨幣為港幣（HKD）。

## 功能需求

### 1. 銀行管理
- 獨立銀行 lookup table
- 新增、編輯、刪除銀行名稱
- 銀行下拉選單（ComboBox），預設常見銀行 + 用戶自訂

### 2. 定存記錄 CRUD
**新增/編輯欄位：**
- 銀行（ComboBox，選自 banks table）
- 金額（港幣）
- 期限：數字 + 單位（天/週/月/年）
- 利率（年利率）
- 利息（自動計算，可手動修改）
- 開始日期
- 結束日期（自動計算，可手動修改）

**邏輯：**
- 利息 = 金額 × 利率 × (期限 / 365)（簡化計算，忽略複利）
- 結束日期 = 開始日期 + 期限
- 用戶可修改利息和結束日期，系統不再自動覆蓋

### 3. 記錄列表
- 顯示所有定存記錄（含已期滿）
- 可編輯/刪除記錄
- 已期滿判斷：由 end_date 與系統日期比較決定

### 4. 摘要統計
- 總定存金額、總利息、平均利率
- 按銀行別分組統計
- 按期限別分組統計
- 按期間（月份/年度）分組統計

## 技術棧

- **VitePlus + React + TypeScript**
- **Mantine UI** — ，元件完整，中文支援佳
- **Zustand** — 狀態管理
- **Supabase** — 後端儲存（PostgreSQL + Realtime）

## 資料模型

### banks
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | uuid | 主鍵 |
| name | text | 銀行名稱 |
| created_at | timestamp | 建立時間 |

### fixed_deposits
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | uuid | 主鍵 |
| bank_id | uuid (FK) | 關聯 banks |
| amount | numeric | 存款金額 |
| period_value | integer | 期限數值 |
| period_unit | text | 期限單位（day/week/month/year） |
| interest_rate | numeric | 年利率 |
| interest | numeric | 利息（計算後可修改） |
| start_date | date | 開始日期 |
| end_date | date | 結束日期（計算後可修改） |
| created_at | timestamp | 建立時間 |

## UI/UX

- 全繁體中文介面
- 港幣格式（HKD）
- 貨幣格式：HK$1,234.56
- 日期格式：yyyy-MM-dd
- ComboBox 選擇銀行（支援搜尋）
- 數字 + 單位 輸入期限
- 表單驗證
- 響應式設計