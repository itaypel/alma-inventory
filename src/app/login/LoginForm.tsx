'use client';

import { useActionState } from 'react';
import { login } from './actions';

export function LoginForm({ initialError }: { initialError?: string }) {
  const [error, action, pending] = useActionState(login, initialError ?? null);
  return (
    <form action={action} className="login-form">
      <div>
        <h2>כניסה למערכת</h2>
        <p className="muted" style={{ margin: '6px 0 0' }}>כל עובד נכנס עם שם המשתמש האישי שלו.</p>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="field">
        <label htmlFor="username">שם משתמש</label>
        <input id="username" name="username" className="input input-ltr mono" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
      </div>
      <div className="field">
        <label htmlFor="password">סיסמה</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? 'נכנס…' : 'כניסה'}
      </button>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>שכחת סיסמה? פנה למנהל המחסן – הוא יכול לאפס אותה.</p>
    </form>
  );
}
