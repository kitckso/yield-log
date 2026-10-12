import type { PeriodUnit } from "../lib/period";

export interface User {
  id: string;
  email: string;
}

export interface Bank {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface FixedDeposit {
  id: string;
  user_id: string;
  bank_id: string;
  amount: number;
  period_value: number;
  period_unit: PeriodUnit;
  interest_rate: number;
  interest: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface DepositWithBank extends FixedDeposit {
  bank_name: string;
}
