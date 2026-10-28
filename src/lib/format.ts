import type { Product } from './types';

export const TZ = 'Asia/Jerusalem';

export function usernameToEmail(username: string) {
  const domain = process.env.NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN || 'alma.local';
  return `${username.trim().toLowerCase()}@${domain}`;
}

export function isValidUsername(u: string) {
  return /^[a-z0-9][a-z0-9._-]{1,30}$/.test(u.trim().toLowerCase());
}

export function money(n: number) {
  return '₪' + Math.round(n).toLocaleString('he-IL');
}

export function unitValue(p: Pick<Product, 'price' | 'pack_size'>) {
  return Number(p.price) / p.pack_size;
}

/** "2 מארזים (40 יח׳)" או "7 יח׳" */
export function qtyLabel(units: number, pack: number) {
  if (pack > 1 && units % pack === 0) {
    const n = units / pack;
    return `${n} ${n === 1 ? 'מארז' : 'מארזים'} (${units} יח׳)`;
  }
  return `${units} יח׳`;
}

export function stockLabel(p: Pick<Product, 'stock_units' | 'pack_size'>) {
  if (p.pack_size > 1) {
    const packs = Math.floor(p.stock_units / p.pack_size);
    const rest = p.stock_units % p.pack_size;
    return {
      main: `${packs} מארזים`,
      sub: `${p.stock_units} יח׳` + (rest ? ` (מארז פתוח: ${rest})` : ''),
    };
  }
  return { main: `${p.stock_units} יח׳`, sub: '' };
}

export type StockStatus = 'ok' | 'low' | 'out';
export function stockStatus(p: Pick<Product, 'stock_units' | 'min_units'>): StockStatus {
  if (p.stock_units === 0) return 'out';
  if (p.stock_units <= p.min_units) return 'low';
  return 'ok';
}

const dtFmt = new Intl.DateTimeFormat('he-IL', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
const dFmt = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, day: '2-digit', month: '2-digit' });
const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });

export function formatWhen(iso: string) {
  const d = new Date(iso);
  const today = keyFmt.format(new Date());
  const yesterday = keyFmt.format(new Date(Date.now() - 86400000));
  const key = keyFmt.format(d);
  const time = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(d);
  if (key === today) return `היום ${time}`;
  if (key === yesterday) return `אתמול ${time}`;
  return dtFmt.format(d);
}

export function formatDay(iso: string) {
  return dFmt.format(new Date(iso));
}

export function errorMessage(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: string }).message);
  return 'משהו השתבש. נסו שוב.';
}
