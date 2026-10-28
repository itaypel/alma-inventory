export const CATEGORIES = ['אינסטלציה', 'מיזוג', 'חשמל'] as const;
export type Category = (typeof CATEGORIES)[number];

export type Role = 'manager' | 'employee';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  active: boolean;
}

export interface Product {
  id: number;
  category: Category;
  name: string;
  sku: string | null;
  shelf: string;
  pack_size: number;
  price: number;
  stock_units: number;
  min_units: number;
  archived: boolean;
}

export interface Transaction {
  id: number;
  created_at: string;
  kind: 'take' | 'restock';
  product_id: number;
  user_id: string;
  units: number;
  unit_value: number;
  note: string | null;
}

export interface SummaryRow {
  product_id: number;
  name: string;
  category: Category;
  shelf: string;
  pack_size: number;
  units: number;
  value: number;
  takers: string;
  take_count: number;
}

export interface WeeklyReport {
  id: number;
  week_start: string;
  week_end: string;
  created_at: string;
  total_value: number;
  take_count: number;
  rows: SummaryRow[];
}

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };
