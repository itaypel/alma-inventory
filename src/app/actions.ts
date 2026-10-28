'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types';

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function changePassword(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const pass = String(form.get('password') || '');
  const again = String(form.get('again') || '');
  if (pass.length < 8) return { ok: false, error: 'הסיסמה צריכה להיות לפחות 8 תווים' };
  if (pass !== again) return { ok: false, error: 'הסיסמאות לא זהות' };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pass });
  if (error) return { ok: false, error: 'לא הצלחנו לעדכן: ' + error.message };
  return { ok: true, message: 'הסיסמה עודכנה' };
}
