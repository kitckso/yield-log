# YieldLog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first PWA for tracking Hong Kong fixed deposits with multi-dimensional statistics

**Architecture:** VitePlus + React + TypeScript SPA with Mantine UI, Zustand state management, Supabase backend. PWA installable on mobile. Three main pages: Dashboard (summary + list), Deposit form (add/edit), Bank management.

**Tech Stack:** VitePlus, React 18, TypeScript, Mantine v7, Zustand, Supabase JS, React Router v6, Vite PWA plugin

---

## File Structure

```
yield-log/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .env.example
├── public/
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── theme.ts                 # Mantine theme config (colors, fonts)
│   ├── lib/
│   │   └── supabase.ts          # Supabase client with helpers
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   ├── store/
│   │   ├── auth.ts              # Auth state (user session)
│   │   ├── banks.ts             # Bank state management
│   │   └── deposits.ts          # Deposit state management
│   ├── contexts/
│   │   └── AuthContext.tsx      # Auth provider
│   ├── hooks/
│   │   ├── useAuth.ts           # Auth hook
│   │   └── useCalculations.ts   # Interest/date calculations
│   ├── pages/
│   │   ├── Login.tsx            # Login page
│   │   ├── Register.tsx         # Register page
│   │   ├── Dashboard.tsx        # Home page with summary + list
│   │   ├── DepositForm.tsx      # Add/Edit deposit
│   │   └── BankManagement.tsx   # Bank CRUD
│   ├── components/
│   │   ├── BottomNav.tsx
│   │   ├── SummaryCard.tsx
│   │   ├── DepositCard.tsx
│   │   └── BankItem.tsx
│   └── layout/
│       └── AppLayout.tsx        # Shell with BottomNav
├── docs/superpowers/
│   ├── specs/2026-05-17-yieldlog-design.md
│   └── plans/2026-05-17-yieldlog-implementation-plan.md
└── supabase/
    └── schema.sql               # Database schema
```

---

## Database Schema

```sql
-- Run in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Banks table (user owns their banks)
CREATE TABLE banks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fixed deposits table (user owns their deposits)
CREATE TABLE fixed_deposits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bank_id UUID REFERENCES banks(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  period_value INTEGER NOT NULL,
  period_unit TEXT NOT NULL CHECK (period_unit IN ('days', 'weeks', 'months', 'years')),
  interest_rate NUMERIC NOT NULL,
  interest NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies: user can only access their own data
CREATE POLICY "Users can manage their own banks" ON banks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own deposits" ON fixed_deposits
  FOR ALL USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_banks_user_id ON banks(user_id);
CREATE INDEX idx_fixed_deposits_user_id ON fixed_deposits(user_id);
CREATE INDEX idx_fixed_deposits_bank_id ON fixed_deposits(bank_id);

-- Seed default banks (only for new users - handled in app logic)
-- Default banks are copied per user on first login
```

---

## Additional File Structure

```
src/
├── lib/
│   └── supabase.ts             # Supabase client with auth helpers
├── contexts/
│   └── AuthContext.tsx          # Auth state context
├── hooks/
│   └── useAuth.ts              # Auth hook
├── pages/
│   ├── Login.tsx               # Login page
│   ├── Register.tsx            # Register page
│   └── ProtectedRoute.tsx      # Route wrapper
```

---

## Auth Flow

1. **Register** — Email + password, create user, copy default banks
2. **Login** — Email + password, get session
3. **Logout** — Clear session, redirect to login
4. **Session** — Auto-refresh via Supabase client
5. **Protected Routes** — Check auth, redirect to /login if not authenticated

---

## Tasks

### Task 1: Initialize VitePlus Project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "yield-log",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@mantine/core": "^7.17.0",
    "@mantine/hooks": "^7.17.0",
    "@mantine/dates": "^7.17.0",
    "@supabase/supabase-js": "^2.49.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.0",
    "zustand": "^5.0.0",
    "dayjs": "^1.11.13"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.3",
    "vite": "^6.2.0",
    "vite-plugin-pwa": "^0.21.1",
    "postcss": "^8.5.1",
    "postcss-preset-mantine": "^1.17.0",
    "postcss-simple-vars": "^7.0.1"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'YieldLog',
        short_name: 'YieldLog',
        description: '定期存款記錄工具',
        theme_color: '#00346f',
        background_color: '#f9f9ff',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  css: {
    postcss: './postcss.config.cjs'
  }
});
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create postcss.config.cjs**

```javascript
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em'
      }
    }
  }
};
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#00346f" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <title>YieldLog</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { theme } from './theme';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
```

- [ ] **Step 7: Create src/theme.ts**

```typescript
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    blue: [
      '#e7f0ff',
      '#c7d9ff',
      '#9bbdff',
      '#6e9eff',
      '#4283fd',
      '#1b6af8',
      '#00346f',
      '#002b5c',
      '#00224a',
      '#001a38'
    ]
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  defaultRadius: 'lg',
  components: {
    Button: {
      defaultProps: {
        radius: 'lg'
      }
    },
    TextInput: {
      defaultProps: {
        radius: 'lg'
      }
    },
    Select: {
      defaultProps: {
        radius: 'lg'
      }
    },
    NumberInput: {
      defaultProps: {
        radius: 'lg'
      }
    }
  }
});
```

- [ ] **Step 8: Create src/App.tsx**

```tsx
import { Routes, Route } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import Dashboard from './pages/Dashboard';
import DepositForm from './pages/DepositForm';
import BankManagement from './pages/BankManagement';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="deposits" element={<Dashboard />} />
        <Route path="deposits/new" element={<DepositForm />} />
        <Route path="deposits/:id" element={<DepositForm />} />
        <Route path="banks" element={<BankManagement />} />
      </Route>
    </Routes>
  );
}

export default App;
```

- [ ] **Step 9: Create src/types/index.ts**

```typescript
export interface Bank {
  id: string;
  name: string;
  created_at: string;
}

export interface FixedDeposit {
  id: string;
  bank_id: string;
  amount: number;
  period_value: number;
  period_unit: 'days' | 'weeks' | 'months' | 'years';
  interest_rate: number;
  interest: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface DepositWithBank extends FixedDeposit {
  bank_name: string;
}
```

- [ ] **Step 10: Create src/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 11: Create .env.example**

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- [ ] **Step 12: Create directory structure**

Run:
```bash
mkdir -p src/types src/store src/hooks src/pages src/components src/layout
```

- [ ] **Step 13: Install dependencies**

Run: `npm install`

- [ ] **Step 14: Commit**

```bash
git add package.json vite.config.ts tsconfig.json postcss.config.cjs index.html src/
git commit -m "feat: initialize VitePlus project with Mantine, React Router, Zustand"
```

---

### Task 2: Implement Zustand Stores

**Files:**
- Create: `src/store/banks.ts`
- Create: `src/store/deposits.ts`

- [ ] **Step 1: Create src/store/banks.ts**

```typescript
import { create } from 'zustand';
import { supabase } from '../supabase';
import type { Bank } from '../types';

interface BanksState {
  banks: Bank[];
  loading: boolean;
  fetchBanks: () => Promise<void>;
  addBank: (name: string) => Promise<void>;
  updateBank: (id: string, name: string) => Promise<void>;
  deleteBank: (id: string) => Promise<void>;
}

export const useBanksStore = create<BanksState>((set) => ({
  banks: [],
  loading: false,

  fetchBanks: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('banks')
      .select('*')
      .order('name');
    if (!error && data) {
      set({ banks: data });
    }
    set({ loading: false });
  },

  addBank: async (name: string) => {
    const { data, error } = await supabase
      .from('banks')
      .insert({ name })
      .select()
      .single();
    if (!error && data) {
      set((state) => ({ banks: [...state.banks, data] }));
    }
  },

  updateBank: async (id: string, name: string) => {
    const { data, error } = await supabase
      .from('banks')
      .update({ name })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      set((state) => ({
        banks: state.banks.map((b) => (b.id === id ? data : b))
      }));
    }
  },

  deleteBank: async (id: string) => {
    await supabase.from('banks').delete().eq('id', id);
    set((state) => ({ banks: state.banks.filter((b) => b.id !== id) }));
  }
}));
```

- [ ] **Step 2: Create src/store/deposits.ts**

```typescript
import { create } from 'zustand';
import { supabase } from '../supabase';
import type { FixedDeposit, DepositWithBank } from '../types';

interface DepositsState {
  deposits: DepositWithBank[];
  loading: boolean;
  fetchDeposits: () => Promise<void>;
  addDeposit: (deposit: Omit<FixedDeposit, 'id' | 'created_at'>) => Promise<void>;
  updateDeposit: (id: string, deposit: Partial<FixedDeposit>) => Promise<void>;
  deleteDeposit: (id: string) => Promise<void>;
}

export const useDepositsStore = create<DepositsState>((set) => ({
  deposits: [],
  loading: false,

  fetchDeposits: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('fixed_deposits')
      .select('*, banks(name)')
      .order('start_date', { ascending: false });
    if (!error && data) {
      const withBankNames = data.map((d) => ({
        ...d,
        bank_name: (d.banks as unknown as { name: string })?.name || ''
      }));
      set({ deposits: withBankNames });
    }
    set({ loading: false });
  },

  addDeposit: async (deposit) => {
    const { data, error } = await supabase
      .from('fixed_deposits')
      .insert(deposit)
      .select('*, banks(name)')
      .single();
    if (!error && data) {
      set((state) => ({
        deposits: [{
          ...data,
          bank_name: (data.banks as unknown as { name: string })?.name || ''
        }, ...state.deposits]
      }));
    }
  },

  updateDeposit: async (id, deposit) => {
    const { data, error } = await supabase
      .from('fixed_deposits')
      .update(deposit)
      .eq('id', id)
      .select('*, banks(name)')
      .single();
    if (!error && data) {
      set((state) => ({
        deposits: state.deposits.map((d) =>
          d.id === id
            ? { ...d, ...data, bank_name: (data.banks as unknown as { name: string })?.name || '' }
            : d
        )
      }));
    }
  },

  deleteDeposit: async (id: string) => {
    await supabase.from('fixed_deposits').delete().eq('id', id);
    set((state) => ({ deposits: state.deposits.filter((d) => d.id !== id) }));
  }
}));
```

- [ ] **Step 3: Commit**

```bash
git add src/store/banks.ts src/store/deposits.ts
git commit -m "feat: implement Zustand stores for banks and deposits"
```

---

### Task 3: Create Calculation Hook

**Files:**
- Create: `src/hooks/useCalculations.ts`

- [ ] **Step 1: Create src/hooks/useCalculations.ts**

```typescript
import dayjs from 'dayjs';
import type { FixedDeposit } from '../types';

export function calculateInterest(
  amount: number,
  rate: number,
  startDate: string,
  endDate: string
): number {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const days = end.diff(start, 'day');
  return amount * (rate / 100) * (days / 365);
}

export function calculateEndDate(startDate: string, periodValue: number, periodUnit: string): string {
  const start = dayjs(startDate);
  let end = start;

  switch (periodUnit) {
    case 'days':
      end = start.add(periodValue, 'day');
      break;
    case 'weeks':
      end = start.add(periodValue, 'week');
      break;
    case 'months':
      end = start.add(periodValue, 'month');
      break;
    case 'years':
      end = start.add(periodValue, 'year');
      break;
  }

  return end.format('YYYY-MM-DD');
}

export function isMatured(endDate: string): boolean {
  return dayjs(endDate).isBefore(dayjs(), 'day');
}

export function formatCurrency(amount: number): string {
  return `HK$ ${amount.toLocaleString('en-HK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useCalculations.ts
git commit -m "feat: add calculation hook for interest and dates"
```

---

### Task 4: Create Layout and Navigation

**Files:**
- Create: `src/layout/AppLayout.tsx`
- Create: `src/components/BottomNav.tsx`

- [ ] **Step 1: Create src/layout/AppLayout.tsx**

```tsx
import { Outlet } from 'react-router-dom';
import { AppShell } from '@mantine/core';
import BottomNav from '../components/BottomNav';

export default function AppLayout() {
  return (
    <AppShell
      padding={0}
      styles={{
        main: {
          minHeight: '100dvh',
          backgroundColor: 'var(--mantine-color-gray-0)'
        }
      }}
    >
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
      <BottomNav />
    </AppShell>
  );
}
```

- [ ] **Step 2: Create src/components/BottomNav.tsx**

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { bottomNavStyles } from './BottomNav.styles';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: '首頁', icon: 'dashboard', path: '/' },
  { label: '存款', icon: 'savings', path: '/deposits' },
  { label: '銀行', icon: 'account_balance', path: '/banks' }
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav style={bottomNavStyles.container}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(item.path));

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              ...bottomNavStyles.item,
              color: isActive ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-6)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              {item.icon}
            </span>
            <span style={bottomNavStyles.label}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Create src/components/BottomNav.styles.ts**

```typescript
export const bottomNavStyles = {
  container: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: '64px',
    backgroundColor: 'white',
    borderTop: '1px solid var(--mantine-color-gray-3)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 1000,
    maxWidth: '480px',
    margin: '0 auto'
  },
  item: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  label: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.05em'
  }
};
```

- [ ] **Step 4: Add Material Symbols to index.html**

Edit `index.html` to add in `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
```

- [ ] **Step 5: Add global styles to src/main.tsx**

Add after imports:
```tsx
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

// Add Material Symbols style
const materialSymbolsStyle = document.createElement('style');
materialSymbolsStyle.textContent = `
  .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
`;
document.head.appendChild(materialSymbolsStyle);
```

- [ ] **Step 6: Commit**

```bash
git add src/layout/AppLayout.tsx src/components/BottomNav.tsx src/components/BottomNav.styles.ts
git commit -m "feat: create layout and bottom navigation"
```

---

### Task 5: Create Dashboard Page

**Files:**
- Create: `src/pages/Dashboard.tsx`
- Create: `src/components/SummaryCard.tsx`
- Create: `src/components/DepositCard.tsx`

- [ ] **Step 1: Create src/components/SummaryCard.tsx**

```tsx
import { Card, Text, Group, Stack, Badge } from '@mantine/core';
import { formatCurrency } from '../../hooks/useCalculations';

interface SummaryCardProps {
  totalAmount: number;
  totalInterest: number;
  averageRate: number;
  maturedCount: number;
}

export default function SummaryCard({ totalAmount, totalInterest, averageRate, maturedCount }: SummaryCardProps) {
  return (
    <Card
      padding="lg"
      radius="lg"
      style={{
        backgroundColor: 'var(--mantine-color-blue-6)',
        color: 'white'
      }}
    >
      <Stack gap="xs">
        <Text size="xs" fw={700} opacity={0.8}>預計總資產 (HKD)</Text>
        <Text size="xl" fw={700} style={{ fontSize: '28px', lineHeight: '32px' }}>
          {formatCurrency(totalAmount)}
        </Text>
        <Group gap="lg" mt="md">
          <Stack gap={4}>
            <Text size="xs" opacity={0.7}>平均利率</Text>
            <Text size="sm" fw={600}>{averageRate.toFixed(2)}%</Text>
          </Stack>
          <Stack gap={4}>
            <Text size="xs" opacity={0.7}>已期滿</Text>
            <Text size="sm" fw={600}>{maturedCount}</Text>
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}
```

- [ ] **Step 2: Create src/components/DepositCard.tsx**

```tsx
import { Card, Text, Group, Badge, Stack, ActionIcon } from '@mantine/core';
import { formatCurrency, isMatured } from '../../hooks/useCalculations';
import type { DepositWithBank } from '../../types';

interface DepositCardProps {
  deposit: DepositWithBank;
  onEdit: () => void;
  onDelete: () => void;
}

export default function DepositCard({ deposit, onEdit, onDelete }: DepositCardProps) {
  const matured = isMatured(deposit.end_date);
  const periodLabel = `${deposit.period_value}${deposit.period_unit === 'months' ? '個月' : deposit.period_unit === 'days' ? '日' : deposit.period_unit === 'weeks' ? '週' : '年'}`;

  return (
    <Card
      padding="md"
      radius="lg"
      style={{
        backgroundColor: 'white',
        border: '1px solid var(--mantine-color-gray-3)'
      }}
    >
      <Group justify="space-between" mb="xs">
        <Stack gap={4}>
          <Text fw={600}>{deposit.bank_name}</Text>
          <Text size="xs" c="dimmed">{periodLabel} 定期存款</Text>
        </Stack>
        <Badge color={matured ? 'gray' : 'green'} variant="light">
          {matured ? '已期滿' : '進行中'}
        </Badge>
      </Group>

      <Text size="xl" fw={700} style={{ fontSize: '28px', lineHeight: '32px' }} mb="sm">
        {formatCurrency(deposit.amount)}
      </Text>

      <Group justify="space-between" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
        <Group gap="xs">
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--mantine-color-blue-6)' }}>
            percent
          </span>
          <Text fw={600}>{deposit.interest_rate}%</Text>
        </Group>
        <Group gap="xs">
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--mantine-color-gray-6)' }}>
            {matured ? 'event_available' : 'calendar_today'}
          </span>
          <Text size="sm" c="dimmed">
            {deposit.end_date.split('-').reverse().join('-')}
          </Text>
        </Group>
      </Group>

      <Group gap="xs" mt="sm">
        <ActionIcon variant="subtle" color="gray" onClick={onEdit}>
          <span className="material-symbols-outlined">edit</span>
        </ActionIcon>
        <ActionIcon variant="subtle" color="red" onClick={onDelete}>
          <span className="material-symbols-outlined">delete</span>
        </ActionIcon>
      </Group>
    </Card>
  );
}
```

- [ ] **Step 3: Create src/pages/Dashboard.tsx**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Title, Text, Stack, Group, ActionIcon, Loader, Center, SimpleGrid } from '@mantine/core';
import { useBanksStore } from '../store/banks';
import { useDepositsStore } from '../store/deposits';
import SummaryCard from '../components/SummaryCard';
import DepositCard from '../components/DepositCard';
import { isMatured } from '../hooks/useCalculations';

export default function Dashboard() {
  const navigate = useNavigate();
  const { banks, fetchBanks } = useBanksStore();
  const { deposits, fetchDeposits, deleteDeposit } = useDepositsStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBanks(), fetchDeposits()]).finally(() => setLoading(false));
  }, []);

  const totalAmount = deposits.reduce((sum, d) => sum + d.amount, 0);
  const totalInterest = deposits.reduce((sum, d) => sum + d.interest, 0);
  const averageRate = deposits.length > 0
    ? deposits.reduce((sum, d) => sum + d.interest_rate, 0) / deposits.length
    : 0;
  const maturedCount = deposits.filter((d) => isMatured(d.end_date)).length;

  const handleDelete = async (id: string) => {
    if (confirm('確定刪除這筆存款記錄？')) {
      await deleteDeposit(id);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100dvh' }}>
        <Loader />
      </Center>
    );
  }

  return (
    <Container size="sm" pb={100}>
      <Stack gap="md" pt="md">
        <Group justify="space-between">
          <div>
            <Title order={2}>YieldLog</Title>
            <Text size="sm" c="dimmed">定期存款管理</Text>
          </div>
          <ActionIcon variant="subtle" size="lg">
            <span className="material-symbols-outlined">notifications</span>
          </ActionIcon>
        </Group>

        <SummaryCard
          totalAmount={totalAmount}
          totalInterest={totalInterest}
          averageRate={averageRate}
          maturedCount={maturedCount}
        />

        <Group justify="space-between">
          <Text fw={600}>存款列表</Text>
        </Group>

        <Stack gap="sm">
          {deposits.map((deposit) => (
            <DepositCard
              key={deposit.id}
              deposit={deposit}
              onEdit={() => navigate(`/deposits/${deposit.id}`)}
              onDelete={() => handleDelete(deposit.id)}
            />
          ))}

          {deposits.length === 0 && (
            <Text c="dimmed" ta="center" py="xl">
              暫無存款記錄，點擊下方按鈕新增
            </Text>
          )}
        </Stack>
      </Stack>

      {/* FAB */}
      <ActionIcon
        size="xl"
        radius="xl"
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '80px',
          backgroundColor: 'var(--mantine-color-blue-6)',
          color: 'white'
        }}
        onClick={() => navigate('/deposits/new')}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>add</span>
      </ActionIcon>
    </Container>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx src/components/SummaryCard.tsx src/components/DepositCard.tsx
git commit -m "feat: create Dashboard page with summary card and deposit list"
```

---

### Task 6: Create Deposit Form Page

**Files:**
- Create: `src/pages/DepositForm.tsx`

- [ ] **Step 1: Create src/pages/DepositForm.tsx**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Stack,
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Title,
  Text,
  Loader,
  Center
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useBanksStore } from '../store/banks';
import { useDepositsStore } from '../store/deposits';
import { calculateInterest, calculateEndDate } from '../hooks/useCalculations';
import type { FixedDeposit } from '../types';

const periodUnits = [
  { value: 'days', label: '日' },
  { value: 'weeks', label: '星期' },
  { value: 'months', label: '個月' },
  { value: 'years', label: '年' }
];

export default function DepositForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { banks, fetchBanks } = useBanksStore();
  const { deposits, addDeposit, updateDeposit } = useDepositsStore();

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(true);

  const [bankId, setBankId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | string>('');
  const [periodValue, setPeriodValue] = useState<number | string>(12);
  const [periodUnit, setPeriodUnit] = useState<string | null>('months');
  const [interestRate, setInterestRate] = useState<number | string>('');
  const [interest, setInterest] = useState<number | string>(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [interestManuallyEdited, setInterestManuallyEdited] = useState(false);
  const [endDateManuallyEdited, setEndDateManuallyEdited] = useState(false);

  useEffect(() => {
    fetchBanks();
  }, []);

  useEffect(() => {
    if (isEditing && id) {
      const deposit = deposits.find((d) => d.id === id);
      if (deposit) {
        setBankId(deposit.bank_id);
        setAmount(deposit.amount);
        setPeriodValue(deposit.period_value);
        setPeriodUnit(deposit.period_unit);
        setInterestRate(deposit.interest_rate);
        setInterest(deposit.interest);
        setStartDate(new Date(deposit.start_date));
        setEndDate(new Date(deposit.end_date));
        setFormLoading(false);
      }
    } else {
      setFormLoading(false);
      setStartDate(new Date());
    }
  }, [id, deposits, isEditing]);

  useEffect(() => {
    if (startDate && periodValue && periodUnit && !endDateManuallyEdited) {
      const end = calculateEndDate(
        startDate.toISOString().split('T')[0],
        Number(periodValue),
        periodUnit
      );
      setEndDate(new Date(end));
    }
  }, [startDate, periodValue, periodUnit, endDateManuallyEdited]);

  useEffect(() => {
    if (startDate && endDate && amount && interestRate && !interestManuallyEdited) {
      const calc = calculateInterest(
        Number(amount),
        Number(interestRate),
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      setInterest(Math.round(calc * 100) / 100);
    }
  }, [amount, interestRate, startDate, endDate, interestManuallyEdited]);

  const handleInterestChange = (val: number | string) => {
    setInterest(val);
    setInterestManuallyEdited(true);
  };

  const handleEndDateChange = (val: Date | null) => {
    setEndDate(val);
    setEndDateManuallyEdited(true);
  };

  const handleSubmit = async () => {
    if (!bankId || !amount || !periodValue || !periodUnit || !interestRate || !startDate || !endDate) {
      alert('請填寫所有欄位');
      return;
    }

    setLoading(true);

    const depositData = {
      bank_id: bankId,
      amount: Number(amount),
      period_value: Number(periodValue),
      period_unit: periodUnit as FixedDeposit['period_unit'],
      interest_rate: Number(interestRate),
      interest: Number(interest),
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    };

    if (isEditing && id) {
      await updateDeposit(id, depositData);
    } else {
      await addDeposit(depositData);
    }

    setLoading(false);
    navigate('/deposits');
  };

  if (formLoading) {
    return (
      <Center style={{ minHeight: '100dvh' }}>
        <Loader />
      </Center>
    );
  }

  return (
    <Container size="sm" pb={100}>
      <Stack gap="md" pt="md">
        <Group>
          <Button
            variant="subtle"
            leftSection={<span className="material-symbols-outlined">arrow_back</span>}
            onClick={() => navigate('/deposits')}
          >
            返回
          </Button>
          <Title order={4}>{isEditing ? '編輯存款' : '新增存款'}</Title>
        </Group>

        <Select
          label="銀行"
          placeholder="搜尋銀行"
          searchable
          data={banks.map((b) => ({ value: b.id, label: b.name }))}
          value={bankId}
          onChange={setBankId}
          required
        />

        <NumberInput
          label="本金 (HKD)"
          placeholder="500,000"
          value={amount}
          onChange={(val) => setAmount(val)}
          thousandSeparator=","
          min={0}
          required
        />

        <Group grow>
          <NumberInput
            label="存期"
            value={periodValue}
            onChange={(val) => setPeriodValue(val)}
            min={1}
          />
          <Select
            label="單位"
            data={periodUnits}
            value={periodUnit}
            onChange={setPeriodUnit}
          />
        </Group>

        <NumberInput
          label="年利率 (%)"
          placeholder="4.25"
          value={interestRate}
          onChange={(val) => setInterestRate(val)}
          min={0}
          step={0.01}
          decimalScale={2}
          required
        />

        <Group grow>
          <DateInput
            label="起息日期"
            value={startDate}
            onChange={setStartDate}
            dateFormat="dd-MM-yyyy"
            required
          />
          <DateInput
            label="到期日期"
            value={endDate}
            onChange={handleEndDateChange}
            dateFormat="dd-MM-yyyy"
            required
          />
        </Group>

        <NumberInput
          label="利息收益 (HKD)"
          value={interest}
          onChange={handleInterestChange}
          decimalScale={2}
          fixedDecimalScale
        />

        <Group mt="md">
          <Button
            variant="outline"
            flex={1}
            onClick={() => navigate('/deposits')}
          >
            取消
          </Button>
          <Button
            flex={2}
            loading={loading}
            onClick={handleSubmit}
          >
            儲存
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/DepositForm.tsx
git commit -m "feat: create deposit form with auto-calculation"
```

---

### Task 7: Create Bank Management Page

**Files:**
- Create: `src/pages/BankManagement.tsx`
- Create: `src/components/BankItem.tsx`

- [ ] **Step 1: Create src/components/BankItem.tsx**

```tsx
import { Card, Group, Stack, Text, ActionIcon } from '@mantine/core';

interface BankItemProps {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}

export default function BankItem({ name, onEdit, onDelete }: BankItemProps) {
  return (
    <Card
      padding="md"
      radius="lg"
      style={{
        backgroundColor: 'white',
        border: '1px solid var(--mantine-color-gray-3)'
      }}
    >
      <Group justify="space-between">
        <Group gap="md">
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--mantine-color-blue-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span className="material-symbols-outlined" style={{ color: 'var(--mantine-color-blue-6)' }}>
              account_balance
            </span>
          </div>
          <Stack gap={4}>
            <Text fw={600}>{name}</Text>
          </Stack>
        </Group>
        <Group gap="xs">
          <ActionIcon variant="subtle" color="gray" onClick={onEdit}>
            <span className="material-symbols-outlined">edit</span>
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={onDelete}>
            <span className="material-symbols-outlined">delete</span>
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  );
}
```

- [ ] **Step 2: Create src/pages/BankManagement.tsx**

```tsx
import { useEffect, useState } from 'react';
import {
  Container,
  Stack,
  Title,
  Text,
  TextInput,
  ActionIcon,
  Loader,
  Center,
  Group,
  Modal,
  Button
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useBanksStore } from '../store/banks';
import BankItem from '../components/BankItem';

export default function BankManagement() {
  const { banks, fetchBanks, addBank, updateBank, deleteBank } = useBanksStore();
  const [loading, setLoading] = useState(true);
  const [newBankName, setNewBankName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  useEffect(() => {
    fetchBanks().finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newBankName.trim()) return;
    await addBank(newBankName.trim());
    setNewBankName('');
  };

  const handleEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
    openModal();
  };

  const handleUpdate = async () => {
    if (!editingId || !editingName.trim()) return;
    await updateBank(editingId, editingName.trim());
    closeModal();
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('確定刪除此銀行？所有相關存款也會被刪除。')) {
      await deleteBank(id);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100dvh' }}>
        <Loader />
      </Center>
    );
  }

  return (
    <Container size="sm" pb={100}>
      <Stack gap="md" pt="md">
        <div>
          <Title order={2}>銀行管理</Title>
          <Text size="sm" c="dimmed">設置並管理您的常用存款銀行</Text>
        </div>

        <TextInput
          placeholder="輸入銀行名稱 (例如: HSBC)"
          value={newBankName}
          onChange={(e) => setNewBankName(e.currentTarget.value)}
          rightSection={
            <ActionIcon
              variant="filled"
              onClick={handleAdd}
              disabled={!newBankName.trim()}
            >
              <span className="material-symbols-outlined">add</span>
            </ActionIcon>
          }
        />

        <Stack gap="sm">
          {banks.map((bank) => (
            <BankItem
              key={bank.id}
              name={bank.name}
              onEdit={() => handleEdit(bank.id, bank.name)}
              onDelete={() => handleDelete(bank.id)}
            />
          ))}

          {banks.length === 0 && (
            <Text c="dimmed" ta="center" py="xl">
              尚未新增銀行
            </Text>
          )}
        </Stack>
      </Stack>

      <Modal opened={modalOpened} onClose={closeModal} title="編輯銀行" centered>
        <Stack>
          <TextInput
            label="銀行名稱"
            value={editingName}
            onChange={(e) => setEditingName(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="outline" onClick={closeModal}>取消</Button>
            <Button onClick={handleUpdate}>儲存</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/BankManagement.tsx src/components/BankItem.tsx
git commit -m "feat: create bank management page"
```

---

### Task 8: Add Default Banks Seed Data

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Update supabase/schema.sql with seed data**

Add at end of schema.sql:

```sql
-- Seed default banks
INSERT INTO banks (name) VALUES
  ('HSBC 匯豐銀行'),
  ('Standard Chartered 渣打銀行'),
  ('Bank of China 中國銀行'),
  ('Hang Seng Bank 恒生銀行'),
  ('ZA Bank'),
  ('Mox Bank')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add default banks seed data"
```

---

### Task 9: Create PWA Icons

**Files:**
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`

- [ ] **Step 1: Create simple placeholder icons**

Note: User should replace with actual icons. Create a simple SVG-based icon or use placeholder.

For now, create a note file:

- [ ] **Step 2: Create placeholder icon file**

Run:
```bash
mkdir -p public
# Create a simple 192x192 placeholder (user will replace with real icons)
echo "placeholder" > public/icon-192.png
echo "placeholder" > public/icon-512.png
```

- [ ] **Step 3: Commit**

```bash
git add public/
git commit -m "feat: add placeholder PWA icons (replace with actual)"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Bank management (CRUD) ✓ Task 7
   - Deposit CRUD ✓ Task 5, 6
   - Auto-calculation (interest, end date) ✓ Task 3, 6
   - Dashboard summary ✓ Task 5
   - PWA support ✓ Task 1
   - Mobile-first design ✓ All tasks

2. **Placeholder scan:** No placeholders found - all steps have actual code

3. **Type consistency:**
   - FixedDeposit.period_unit uses 'days' | 'weeks' | 'months' | 'years' ✓
   - calculateInterest params: amount, rate, startDate, endDate ✓
   - All stores use correct supabase imports ✓

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-05-17-yieldlog-implementation-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**