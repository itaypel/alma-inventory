import { requireProfile } from '@/lib/auth';
import { TopBar } from '@/components/TopBar';
import { PasswordForm } from './PasswordForm';

export default async function PasswordPage() {
  const { profile } = await requireProfile();
  return (
    <>
      <TopBar profile={profile} />
      <main className="page" style={{ maxWidth: 520 }}>
        <div className="page-head">
          <div>
            <h1>שינוי סיסמה</h1>
            <p>אם קיבלת סיסמה זמנית מהמנהל – החלף אותה כאן.</p>
          </div>
        </div>
        <PasswordForm back={profile.role === 'manager' ? '/manager' : '/employee'} />
      </main>
    </>
  );
}
