import Link from 'next/link';
import { signOut } from '@/app/actions';
import { BoxIcon, KeyIcon, LogoutIcon, PersonIcon } from './Icons';
import type { Profile } from '@/lib/types';

export function TopBar({ profile }: { profile: Profile }) {
  const isManager = profile.role === 'manager';
  const initials = profile.full_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
  return (
    <header className="topbar">
      <div className="topbar-in">
        <div className="brand">
          <span className="brand-mark"><BoxIcon /></span>
          <span className="brand-name">עלמא</span>
          {isManager ? <span className="brand-badge">מנהל</span> : <span className="brand-tag">לקיחה מהמחסן</span>}
        </div>
        <div className="who">
          <div className="who-id" title={`${profile.full_name} · ${profile.username}`}>
            <span aria-hidden="true" className="avatar">{initials}</span>
            <span className="who-name">
              <span>{profile.full_name}</span>
              <small>{profile.username}</small>
            </span>
          </div>
          {isManager && (
            <Link href="/employee" className="btn-ghost-dark" aria-label="מסך עובד">
              <PersonIcon size={18} />
              <span className="lbl">מסך עובד</span>
            </Link>
          )}
          <Link href="/password" className="btn-ghost-dark" aria-label="שינוי סיסמה">
            <KeyIcon size={18} />
            <span className="lbl">סיסמה</span>
          </Link>
          <form action={signOut}>
            <button type="submit" className="btn-ghost-dark" aria-label="יציאה">
              <LogoutIcon size={18} />
              <span className="lbl">יציאה</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
