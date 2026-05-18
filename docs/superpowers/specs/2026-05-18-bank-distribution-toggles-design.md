# 銀行分佈 Group Toggles

## Problem

The bank distribution donut chart on the Dashboard only shows active-deposit amounts grouped by bank. Users need to toggle between amount/interest and active/all.

## Design

Two `SegmentedControl` rows above the existing donut chart in the 銀行分佈 card (HomePage.tsx):

### Value toggle

- **Options**: `本金` | `利息`
- Default: `本金`
- Controls what value is summed per bank

### Scope toggle

- **Options**: `進行中` | `全部`
- Default: `進行中`
- Controls which deposits are included

### Logic

| groupBy    | scope    | Filter                   | Aggregation                |
| ---------- | -------- | ------------------------ | -------------------------- |
| `amount`   | `active` | `!isMatured(d.end_date)` | sum `d.amount`             |
| `amount`   | `all`    | none                     | sum `d.amount`             |
| `interest` | `active` | `!isMatured(d.end_date)` | sum `d.interest` (pending) |
| `interest` | `all`    | none                     | sum `d.interest` (total)   |

### UI layout

```
┌─────────────────────────────┐
│ 銀行分佈                     │
│ [本金 | 利息]               │
│ [進行中 | 全部]             │
│   ┌─────┐                  │
│   │donut│                  │
│   └─────┘                  │
│ 銀行A  $100,000  35%        │
│ 銀行B   $50,000  18%        │
│ ...                        │
└─────────────────────────────┘
```

The legend items now show the actual sum and a suffix ("利息" when in interest mode).

### Implementation scope

- **File**: `src/pages/HomePage.tsx` only
- **New state**: `groupBy` and `scope` useState hooks
- **Modified**: `bankDistribution` useMemo logic
- **Added**: 2 `SegmentedControl` from Mantine
