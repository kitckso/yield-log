-- Seed data for YieldLog
-- Run this in Supabase SQL Editor after schema.sql
-- User: 21f4e7ac-c7a8-44ca-9d4b-c4ae49abe929
--
-- NOTE: Requires the updated set_user_id() function from schema.sql
-- that only fills user_id when null:
--   IF NEW.user_id IS NULL THEN NEW.user_id = auth.uid(); END IF;
-- Re-run schema.sql first if you haven't updated the function yet.

DO $$
DECLARE
  uid UUID := '21f4e7ac-c7a8-44ca-9d4b-c4ae49abe929';
  hsbc UUID;
  sc    UUID;
  boc   UUID;
  hase  UUID;
  citi  UUID;
  dbs   UUID;
BEGIN

-- Banks
INSERT INTO banks (id, user_id, name) VALUES
  (uuid_generate_v4(), uid, '滙豐銀行'),
  (uuid_generate_v4(), uid, '渣打銀行'),
  (uuid_generate_v4(), uid, '中銀香港'),
  (uuid_generate_v4(), uid, '恒生銀行'),
  (uuid_generate_v4(), uid, '花旗銀行'),
  (uuid_generate_v4(), uid, '星展銀行');

-- Capture bank IDs
SELECT id INTO hsbc FROM banks WHERE user_id = uid AND name = '滙豐銀行';
SELECT id INTO sc   FROM banks WHERE user_id = uid AND name = '渣打銀行';
SELECT id INTO boc  FROM banks WHERE user_id = uid AND name = '中銀香港';
SELECT id INTO hase FROM banks WHERE user_id = uid AND name = '恒生銀行';
SELECT id INTO citi FROM banks WHERE user_id = uid AND name = '花旗銀行';
SELECT id INTO dbs  FROM banks WHERE user_id = uid AND name = '星展銀行';

-- Fixed deposits
-- interest = amount * (rate / 100) * (days / 365)
-- All dates in 2025-2026 range

INSERT INTO fixed_deposits (user_id, bank_id, amount, period_value, period_unit, interest_rate, interest, start_date, end_date) VALUES

-- HSBC: HKD 200k @ 3.8% 6m (184 days)
(uid, hsbc, 200000, 6, 'months', 3.8,  floor(200000 * 0.038 * 184 / 365 * 100) / 100, '2025-11-01', '2026-05-04'),

-- HSBC: HKD 100k @ 3.5% 3m (91 days)
(uid, hsbc, 100000, 3, 'months', 3.5,  floor(100000 * 0.035 *  91 / 365 * 100) / 100, '2026-03-01', '2026-05-31'),

-- HSBC: HKD 80k  @ 4.2% 6m — matured
(uid, hsbc, 80000,  6, 'months', 4.2,  floor(80000  * 0.042 * 184 / 365 * 100) / 100, '2025-01-15', '2025-07-18'),

-- SC: HKD 500k @ 4.0% 12m (365 days)
(uid, sc,   500000, 12, 'months', 4.0,  floor(500000 * 0.04  * 365 / 365 * 100) / 100, '2025-12-01', '2026-12-01'),

-- SC: HKD 150k @ 3.6% 3m (91 days)
(uid, sc,   150000, 3,  'months', 3.6,  floor(150000 * 0.036 *  91 / 365 * 100) / 100, '2026-04-01', '2026-07-01'),

-- SC: HKD 60k  @ 4.5% 1m  (30 days) — matured
(uid, sc,   60000,  1,  'months', 4.5,  floor(60000  * 0.045 *  30 / 365 * 100) / 100, '2025-06-01', '2025-07-01'),

-- BOCHK: HKD 300k @ 3.9% 6m (182 days)
(uid, boc,  300000, 6,  'months', 3.9,  floor(300000 * 0.039 * 182 / 365 * 100) / 100, '2026-02-15', '2026-08-16'),

-- BOCHK: HKD 120k @ 3.3% 3m (91 days)
(uid, boc,  120000, 3,  'months', 3.3,  floor(120000 * 0.033 *  91 / 365 * 100) / 100, '2026-05-01', '2026-07-31'),

-- BOCHK: HKD 200k @ 4.1% 12m — matured 2025
(uid, boc,  200000, 12, 'months', 4.1,  floor(200000 * 0.041 * 365 / 365 * 100) / 100, '2024-12-01', '2025-12-01'),

-- Hang Seng: HKD 400k @ 3.7%  6m (181 days)
(uid, hase, 400000, 6,  'months', 3.7,  floor(400000 * 0.037 * 181 / 365 * 100) / 100, '2025-12-15', '2026-06-14'),

-- Hang Seng: HKD 90k  @ 4.3%  3m (92 days)
(uid, hase, 90000,  3,  'months', 4.3,  floor(90000  * 0.043 *  92 / 365 * 100) / 100, '2026-04-10', '2026-07-11'),

-- Hang Seng: HKD 50k  @ 3.5%  12m — matured mid-2025
(uid, hase, 50000,  12, 'months', 3.5,  floor(50000  * 0.035 * 365 / 365 * 100) / 100, '2024-06-15', '2025-06-15'),

-- Citibank: HKD 250k @ 4.4%  12m (365 days)
(uid, citi, 250000, 12, 'months', 4.4,  floor(250000 * 0.044 * 365 / 365 * 100) / 100, '2026-01-01', '2027-01-01'),

-- Citibank: HKD 70k  @ 3.2%  3m (91 days) — matured
(uid, citi, 70000,  3,  'months', 3.2,  floor(70000  * 0.032 *  91 / 365 * 100) / 100, '2025-03-01', '2025-05-31'),

-- DBS: HKD 180k @ 3.9%  6m (184 days)
(uid, dbs,  180000, 6,  'months', 3.9,  floor(180000 * 0.039 * 184 / 365 * 100) / 100, '2026-03-20', '2026-09-20'),

-- DBS: HKD 100k @ 4.0%  1m (31 days)
(uid, dbs,  100000, 1,  'months', 4.0,  floor(100000 * 0.04  *  31 / 365 * 100) / 100, '2026-05-01', '2026-06-01');

END $$;
