import 'server-only';
import { createClient } from '@supabase/supabase-js';

// מפתח service role – עוקף הרשאות. רק בשרת, רק אחרי שווידאנו שהמשתמש מנהל.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
