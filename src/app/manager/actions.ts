'use server';

import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CATEGORIES, type ActionResult, type Category } from '@/lib/types';
import { isValidUsername, usernameToEmail } from '@/lib/format';

async function requireManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('צריך להתחבר מחדש');
  const { data: profile } = await supabase.from('profiles').select('id, role, active').eq('id', user.id).single();
  if (!profile || profile.role !== 'manager' || !profile.active) throw new Error('פעולה למנהל בלבד');
  return { supabase, me: profile.id as string };
}

async function run(fn: () => Promise<string>): Promise<ActionResult> {
  try {
    const message = await fn();
    revalidatePath('/manager');
    revalidatePath('/employee');
    return { ok: true, message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'משהו השתבש' };
  }
}

function tempPassword() {
  const words = ['mazgan', 'kerur', 'tzinor', 'kvel', 'migan', 'ventil', 'mafsek', 'sheker'];
  return `${words[randomInt(words.length)]}-${randomInt(1000, 9999)}-${randomInt(10, 99)}`;
}

export interface ProductInput {
  id?: number;
  category: Category;
  name: string;
  sku: string;
  shelf: string;
  pack_size: number;
  price: number;
  min_units: number;
  initial_units?: number;
}

export async function saveProduct(input: ProductInput): Promise<ActionResult> {
  return run(async () => {
    const { supabase } = await requireManager();
    const name = input.name.trim();
    const shelf = input.shelf.trim().toUpperCase();
    if (!name) throw new Error('צריך שם מוצר');
    if (!shelf) throw new Error('צריך מספר מדף');
    if (!CATEGORIES.includes(input.category)) throw new Error('תחום לא תקין');
    const pack = Math.max(1, Math.floor(input.pack_size || 1));
    const row = {
      category: input.category,
      name,
      sku: input.sku.trim() || null,
      shelf,
      pack_size: pack,
      price: Math.max(0, Number(input.price) || 0),
      min_units: Math.max(0, Math.floor(input.min_units || 0)),
    };

    if (input.id) {
      const { error } = await supabase.from('products').update(row).eq('id', input.id);
      if (error) throw new Error(error.code === '23505' ? 'המק״ט הזה כבר קיים' : error.message);
      return `עודכן: ${name}`;
    }

    const { data, error } = await supabase.from('products').insert(row).select('id').single();
    if (error) throw new Error(error.code === '23505' ? 'המק״ט הזה כבר קיים' : error.message);
    const units = Math.floor(input.initial_units || 0);
    if (units > 0) {
      const { error: e2 } = await supabase.rpc('restock_product', { p_product_id: data.id, p_units: units, p_note: 'מלאי פתיחה' });
      if (e2) throw new Error(e2.message);
    }
    return `נוסף ל${row.category}: ${name}`;
  });
}

export async function archiveProduct(id: number, archived: boolean): Promise<ActionResult> {
  return run(async () => {
    const { supabase } = await requireManager();
    const { error } = await supabase.from('products').update({ archived }).eq('id', id);
    if (error) throw new Error(error.message);
    return archived ? 'המוצר הוסר מהקטלוג (ההיסטוריה נשמרת)' : 'המוצר הוחזר לקטלוג';
  });
}

export async function restock(productId: number, units: number, note: string): Promise<ActionResult> {
  return run(async () => {
    const { supabase } = await requireManager();
    const { error } = await supabase.rpc('restock_product', { p_product_id: productId, p_units: units, p_note: note.slice(0, 200) });
    if (error) throw new Error(error.message);
    return 'המלאי עודכן';
  });
}

export async function takeFor(productId: number, units: number, note: string, userId: string): Promise<ActionResult> {
  return run(async () => {
    const { supabase } = await requireManager();
    const { error } = await supabase.rpc('take_product', {
      p_product_id: productId,
      p_units: units,
      p_note: note.slice(0, 200),
      p_for_user: userId,
    });
    if (error) throw new Error(error.message);
    return 'הלקיחה נרשמה';
  });
}

export async function createUser(fullName: string, username: string, role: 'employee' | 'manager'): Promise<ActionResult & { password?: string }> {
  let password = '';
  const res = await run(async () => {
    await requireManager();
    const u = username.trim().toLowerCase();
    if (!fullName.trim()) throw new Error('צריך שם מלא');
    if (!isValidUsername(u)) throw new Error('שם משתמש: אותיות באנגלית, מספרים, נקודה או מקף (לפחות 2 תווים)');
    const admin = createAdminClient();
    const { data: exists } = await admin.from('profiles').select('id').eq('username', u).maybeSingle();
    if (exists) throw new Error('שם המשתמש הזה כבר תפוס');
    password = tempPassword();
    const { data, error } = await admin.auth.admin.createUser({ email: usernameToEmail(u), password, email_confirm: true });
    if (error || !data.user) throw new Error('יצירת המשתמש נכשלה: ' + (error?.message ?? ''));
    const { error: e2 } = await admin.from('profiles').insert({ id: data.user.id, username: u, full_name: fullName.trim(), role });
    if (e2) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw new Error('יצירת המשתמש נכשלה: ' + e2.message);
    }
    return `נוצר משתמש: ${u}`;
  });
  return res.ok ? { ...res, password } : res;
}

export async function resetPassword(userId: string): Promise<ActionResult & { password?: string }> {
  let password = '';
  const res = await run(async () => {
    await requireManager();
    password = tempPassword();
    const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password });
    if (error) throw new Error(error.message);
    return 'נוצרה סיסמה זמנית';
  });
  return res.ok ? { ...res, password } : res;
}

export async function setActive(userId: string, active: boolean): Promise<ActionResult> {
  return run(async () => {
    const { me } = await requireManager();
    if (userId === me && !active) throw new Error('אי אפשר להשבית את עצמך');
    const admin = createAdminClient();
    const { error } = await admin.from('profiles').update({ active }).eq('id', userId);
    if (error) throw new Error(error.message);
    await admin.auth.admin.updateUserById(userId, { ban_duration: active ? 'none' : '876000h' });
    return active ? 'המשתמש הופעל מחדש' : 'המשתמש הושבת – הוא לא יוכל להיכנס';
  });
}
