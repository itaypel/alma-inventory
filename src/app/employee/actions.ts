'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types';

export async function takeProduct(productId: number, units: number, note: string): Promise<ActionResult> {
  if (!Number.isInteger(units) || units < 1) return { ok: false, error: 'כמות לא תקינה' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('take_product', {
    p_product_id: productId,
    p_units: units,
    p_note: note.slice(0, 200),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/employee');
  revalidatePath('/manager');
  return { ok: true, message: 'הלקיחה נרשמה על שמך' };
}
