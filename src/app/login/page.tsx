import { BoxIcon } from '@/components/Icons';
import { LoginForm } from './LoginForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <section className="login-hero">
        <div className="brand">
          <span className="brand-mark"><BoxIcon size={24} /></span>
          <div className="login-brand">
            <b>עלמא</b>
            <span>הנדסת מיזוג אוויר</span>
          </div>
        </div>
        <div className="login-pitch">
          <h1>כל מכשיר וכל בלון גז – יודעים אצל מי הם.</h1>
          <p>
            אינסטלציה, מיזוג וחשמל במחסן אחד. הטכנאי רושם מה לקח ולאיזה אתר, והמנהל רואה הכל, ממלא מלאי ומקבל
            דו״ח שבועי בכל יום חמישי.
          </p>
        </div>
        <div className="login-cats">
          <span>אינסטלציה</span>
          <span>מיזוג</span>
          <span>חשמל</span>
        </div>
      </section>
      <section className="login-form-wrap">
        <LoginForm initialError={error === 'inactive' ? 'המשתמש הזה הושבת. פנה למנהל המחסן.' : undefined} />
      </section>
    </main>
  );
}
