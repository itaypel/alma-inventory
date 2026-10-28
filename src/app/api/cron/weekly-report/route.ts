import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SummaryRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Vercel מפעיל את הנתיב הזה כל יום חמישי (ראו vercel.json).
 * שומר תמונת מצב של כל מה שנלקח מאז יום ראשון בטבלה weekly_reports.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: start, error: e1 } = await admin.rpc('current_week_start');
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const end = new Date().toISOString();
  const { data, error } = await admin.rpc('takes_summary', { p_from: start, p_to: end });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as SummaryRow[];
  const record = {
    week_start: start as string,
    week_end: end,
    total_value: rows.reduce((a, r) => a + Number(r.value), 0),
    take_count: rows.reduce((a, r) => a + Number(r.take_count), 0),
    rows,
  };

  // אם הקרון רץ פעמיים באותו שבוע – מעדכנים את אותה רשומה
  const { data: existing } = await admin.from('weekly_reports').select('id').eq('week_start', record.week_start).maybeSingle();
  const res = existing
    ? await admin.from('weekly_reports').update(record).eq('id', existing.id)
    : await admin.from('weekly_reports').insert(record);
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, products: rows.length, total: record.total_value });
}
