// יצירת המנהל הראשון. מריצים פעם אחת מהמחשב:
//   node --env-file=.env.local scripts/create-manager.mjs <username> "<שם מלא>" <password>
// לדוגמה:
//   node --env-file=.env.local scripts/create-manager.mjs admin "יוסי כהן" MyStrongPass123

import { createClient } from '@supabase/supabase-js';

const [username, fullName, password] = process.argv.slice(2);
if (!username || !fullName || !password) {
  console.error('שימוש: node --env-file=.env.local scripts/create-manager.mjs <username> "<שם מלא>" <password>');
  process.exit(1);
}
if (password.length < 8) {
  console.error('הסיסמה צריכה להיות לפחות 8 תווים');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('חסרים NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY בקובץ .env.local');
  process.exit(1);
}

const domain = process.env.NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN || 'alma.local';
const u = username.trim().toLowerCase();
const admin = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await admin.auth.admin.createUser({ email: `${u}@${domain}`, password, email_confirm: true });
if (error) {
  console.error('יצירת המשתמש נכשלה:', error.message);
  process.exit(1);
}
const { error: e2 } = await admin.from('profiles').insert({ id: data.user.id, username: u, full_name: fullName, role: 'manager' });
if (e2) {
  console.error('יצירת הפרופיל נכשלה:', e2.message, '\nהאם הרצת את supabase/schema.sql?');
  await admin.auth.admin.deleteUser(data.user.id);
  process.exit(1);
}
console.log(`✓ נוצר מנהל: ${u}. אפשר להיכנס למערכת.`);
