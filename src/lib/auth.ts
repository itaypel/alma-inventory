import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile } from './types';

/** מחזיר את המשתמש המחובר והפרופיל שלו, או מפנה לכניסה */
export async function requireProfile(role?: 'manager') {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name, role, active')
    .eq('id', user.id)
    .single<Profile>();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    redirect('/login?error=inactive');
  }
  if (role === 'manager' && profile.role !== 'manager') redirect('/employee');
  return { supabase, profile };
}
