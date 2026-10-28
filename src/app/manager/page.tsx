import { requireProfile } from '@/lib/auth';
import { TopBar } from '@/components/TopBar';
import type { Product, Profile, SummaryRow, Transaction, WeeklyReport } from '@/lib/types';
import { ManagerView } from './ManagerView';

export const dynamic = 'force-dynamic';

export default async function ManagerPage() {
  const { supabase, profile } = await requireProfile('manager');

  const [products, txs, people, reports, summary, weekStart] = await Promise.all([
    supabase
      .from('products')
      .select('id, category, name, sku, shelf, pack_size, price, stock_units, min_units, archived')
      .order('category')
      .order('shelf'),
    supabase
      .from('transactions')
      .select('id, created_at, kind, product_id, user_id, units, unit_value, note')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('profiles').select('id, username, full_name, role, active').order('full_name'),
    supabase
      .from('weekly_reports')
      .select('id, week_start, week_end, created_at, total_value, take_count')
      .order('week_start', { ascending: false })
      .limit(8),
    supabase.rpc('takes_summary'),
    supabase.rpc('current_week_start'),
  ]);

  return (
    <>
      <TopBar profile={profile} />
      <ManagerView
        me={profile}
        products={(products.data ?? []) as Product[]}
        txs={(txs.data ?? []) as Transaction[]}
        people={(people.data ?? []) as Profile[]}
        reports={(reports.data ?? []) as Omit<WeeklyReport, 'rows'>[]}
        weekSummary={(summary.data ?? []) as SummaryRow[]}
        weekStart={(weekStart.data as string) ?? new Date().toISOString()}
      />
    </>
  );
}
