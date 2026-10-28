'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { changePassword } from '../actions';

export function PasswordForm({ back }: { back: string }) {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {state && !state.ok && <div className="form-error" role="alert">{state.error}</div>}
      {state && state.ok && <div className="form-ok" role="status">{state.message}</div>}
      <div className="field">
        <label htmlFor="password">סיסמה חדשה</label>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} required />
        <span className="hint">לפחות 8 תווים</span>
      </div>
      <div className="field">
        <label htmlFor="again">שוב, לאימות</label>
        <input id="again" name="again" type="password" className="input" autoComplete="new-password" required />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? 'שומר…' : 'עדכון סיסמה'}</button>
        <Link href={back} className="btn btn-outline">חזרה</Link>
      </div>
    </form>
  );
}
