import { requireProfile } from '@/lib/auth';
import { TopBar } from '@/components/TopBar';
import type { Product, Transaction } from '@/lib/types';
import { EmployeeView } from './EmployeeView';

export const dynamic = 'force-dynamic';

export default async function EmployeePage() {
  const { supabase, profile } = await requireProfile();

  const { data: weekStart } = await supabase.rpc('current_week_start');

  const [{ data: products }, { data: mine }] = await Promise.all([
    supabase
      .from('products')
      .select('id, category, name, sku, shelf, pack_size, price, stock_units, min_units, archived')
      .eq('archived', false)
      .order('shelf'),
    supabase
      .from('transactions')
      .select('id, created_at, kind, product_id, user_id, units, unit_value, note')
      .eq('user_id', profile.id)
      .eq('kind', 'take')
      .gte('created_at', weekStart as string)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return (
    <>
      <TopBar profile={profile} />
      <EmployeeView products={(products ?? []) as Product[]} mine={(mine ?? []) as Transaction[]} />
    </>
  );
}
