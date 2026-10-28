'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { usernameToEmail } from '@/lib/format';

export async function login(_: string | null, form: FormData): Promise<string | null> {
  const username = String(form.get('username') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  if (!username || !password) return 'צריך שם משתמש וסיסמה';

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (error || !data.user) return 'שם המשתמש או הסיסמה לא נכונים';

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', data.user.id)
    .single();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    return 'המשתמש הזה הושבת. פנה למנהל המחסן.';
  }
  redirect(profile.role === 'manager' ? '/manager' : '/employee');
}
