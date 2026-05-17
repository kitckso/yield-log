<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

<!--VITE PLUS END-->

# YieldLog

個人定存記錄工具（Hong Kong Fixed Deposit Tracker），繁體中文介面，港幣結算。

## 架構

```
Pages:    Login → Register → Dashboard → DepositForm → BankManagement
                                 ↕            ↕              ↕
Stores:   useAuthStore ←── useBanksStore ←── useDepositsStore
                                 ↕              ↕
Lib:                         supabase client
```

## 關鍵檔案

| 路徑                           | 用途                              |
| ------------------------------ | --------------------------------- |
| `src/App.tsx`                  | 路由 + 登入保護                   |
| `src/store/auth.ts`            | 認證（註冊/登入/登出/session）    |
| `src/store/banks.ts`           | 銀行 CRUD                         |
| `src/store/deposits.ts`        | 定存 CRUD（含 banks join）        |
| `src/hooks/useCalculations.ts` | 利息/到期日 auto-calc             |
| `src/pages/Dashboard.tsx`      | 首頁：摘要卡 + 定存列表 + FAB     |
| `src/pages/DepositForm.tsx`    | 新增/編輯：auto-calc 利息與到期日 |
| `src/pages/BankManagement.tsx` | 銀行管理                          |
| `supabase/schema.sql`          | 資料庫定義 + RLS + triggers       |

## 開始

```bash
# 安裝依賴
npm install

# 設定 Supabase
cp .env.example .env
# 編輯 .env，填入 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY

# 資料庫設定
# 1. 到 Supabase Dashboard → SQL Editor
# 2. 貼上 supabase/schema.sql 執行
# 3. 到 Authentication → Settings → 關閉 "Confirm email"

# 啟動
vp dev
```

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
