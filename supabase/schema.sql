-- YieldLog Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Banks table
CREATE TABLE banks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fixed deposits table
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

-- set guest user metadata (app_metadata is secure, user_metadata is user-editable)
-- UPDATE auth.users
-- SET
--   raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"is_guest": true}'::jsonb
-- WHERE email = 'guest@example.com';

-- RLS Policies
-- Allow both normal users AND guests to READ their own banks
CREATE POLICY "Users can view their own banks"
ON banks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow ONLY non-guests to INSERT, UPDATE, or DELETE banks
CREATE POLICY "Non-guests can modify their own banks"
ON banks
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id
  AND (auth.jwt() -> 'app_metadata' ->> 'is_guest')::boolean IS NOT TRUE
);

-- Allow both normal users AND guests to READ their own deposits
CREATE POLICY "Users can view their own deposits"
ON fixed_deposits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow ONLY non-guests to INSERT, UPDATE, or DELETE deposits
CREATE POLICY "Non-guests can modify their own deposits"
ON fixed_deposits
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id
  AND (auth.jwt() -> 'app_metadata' ->> 'is_guest')::boolean IS NOT TRUE
);

-- Triggers to auto-set user_id on insert
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_banks_user_id
  BEFORE INSERT ON banks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER set_fixed_deposits_user_id
  BEFORE INSERT ON fixed_deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

-- Indexes
CREATE INDEX idx_banks_user_id ON banks(user_id);
CREATE INDEX idx_fixed_deposits_user_id ON fixed_deposits(user_id);
CREATE INDEX idx_fixed_deposits_bank_id ON fixed_deposits(bank_id);
