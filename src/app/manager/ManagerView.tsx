'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  CATEGORIES,
  type ActionResult,
  type Category,
  type Product,
  type Profile,
  type SummaryRow,
  type Transaction,
  type WeeklyReport,
} from '@/lib/types';
import { formatDay, formatWhen, money, qtyLabel, stockLabel, stockStatus, TZ, unitValue } from '@/lib/format';
import { BoxMinusIcon, BoxPlusIcon, DownloadIcon, ReportIcon, SearchIcon } from '@/components/Icons';
import { Dialog, Seg, Stepper, useToast } from '@/components/ui';
import { archiveProduct, createUser, resetPassword, restock, saveProduct, setActive, takeFor } from './actions';

type Tab = 'inv' | 'log' | 'users';
type Dlg =
  | { kind: 'product'; product?: Product }
  | { kind: 'take' }
  | { kind: 'restock'; product: Product }
  | { kind: 'report'; type?: ReportType }
  | { kind: 'password'; name: string; username: string; password: string }
  | null;
type ReportType = 'week' | 'category' | 'stock';

interface Props {
  me: Profile;
  products: Product[];
  txs: Transaction[];
  people: Profile[];
  reports: Omit<WeeklyReport, 'rows'>[];
  weekSummary: SummaryRow[];
  weekStart: string;
}

function nextThursday() {
  const now = new Date();
  const local = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  const day = local.getDay();
  let add = (4 - day + 7) % 7;
  if (add === 0 && local.getHours() >= 16) add = 7;
  local.setDate(local.getDate() + add);
  return `${String(local.getDate()).padStart(2, '0')}.${String(local.getMonth() + 1).padStart(2, '0')}`;
}

export function ManagerView({ me, products, txs, people, reports, weekSummary, weekStart }: Props) {
  const [tab, setTab] = useState<Tab>('inv');
  const [dlg, setDlg] = useState<Dlg>(null);
  const toast = useToast();

  // inventory filters
  const [invCat, setInvCat] = useState<'הכל' | Category>('הכל');
  const [lowOnly, setLowOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [q, setQ] = useState('');
  // log filters
  const [logUser, setLogUser] = useState('all');
  const [logCat, setLogCat] = useState<'הכל' | Category>('הכל');
  const [logKind, setLogKind] = useState<'all' | 'take' | 'restock'>('all');

  const active = useMemo(() => products.filter((p) => !p.archived), [products]);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const stockValue = active.reduce((a, p) => a + p.stock_units * unitValue(p), 0);
  const weekValue = weekSummary.reduce((a, r) => a + Number(r.value), 0);
  const weekTakes = weekSummary.reduce((a, r) => a + Number(r.take_count), 0);
  const lowCount = active.filter((p) => stockStatus(p) !== 'ok').length;
  const outCount = active.filter((p) => p.stock_units === 0).length;

  const done = (res: ActionResult, close = true) => {
    toast.show(res.ok ? res.message : res.error, !res.ok);
    if (res.ok && close) setDlg(null);
  };

  const query = q.trim().toLowerCase();
  const inv = products
    .filter((p) => (showArchived ? p.archived : !p.archived))
    .filter((p) => invCat === 'הכל' || p.category === invCat)
    .filter((p) => !lowOnly || stockStatus(p) !== 'ok')
    .filter((p) => !query || p.name.toLowerCase().includes(query) || (p.sku ?? '').toLowerCase().includes(query) || p.shelf.toLowerCase().includes(query));

  const logRows = txs
    .filter((t) => logUser === 'all' || t.user_id === logUser)
    .filter((t) => logKind === 'all' || t.kind === logKind)
    .filter((t) => logCat === 'הכל' || productById.get(t.product_id)?.category === logCat);

  const weekStartMs = Date.parse(weekStart);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>לוח מנהל</h1>
          <p>אינסטלציה · מיזוג · חשמל – כל המחסן במקום אחד.</p>
        </div>
        <a className="btn btn-outline-ink" href="/api/reports?type=stock" download>
          <DownloadIcon size={18} />
          הורדת דוח מלאי עכשיו
        </a>
      </div>

      <section aria-label="פעולות מהירות" className="actions">
        <button type="button" className="action action-1" onClick={() => setDlg({ kind: 'product' })}>
          <BoxPlusIcon size={30} />
          <span><strong>הוספת מוצר</strong><small>מוצר חדש לקטלוג, מדף, מחיר ומארז</small></span>
        </button>
        <button type="button" className="action action-2" onClick={() => setDlg({ kind: 'take' })} disabled={active.length === 0}>
          <BoxMinusIcon size={30} />
          <span><strong>לקיחת מוצר</strong><small>רישום לקיחה על שם עובד או על שמך</small></span>
        </button>
        <button type="button" className="action action-3" onClick={() => setDlg({ kind: 'report' })}>
          <ReportIcon size={30} />
          <span><strong>הפקת דו״ח</strong><small>שבועי, לפי תחום, או מלאי נוכחי</small></span>
        </button>
      </section>

      <div className="split" style={{ gap: 16, alignItems: 'stretch' }}>
        <div className="kpis" style={{ flex: '999 1 640px', minWidth: 0 }}>
          <div className="kpi">
            <span>שווי המלאי</span>
            <b>{money(stockValue)}</b>
            <small>{active.length} מוצרים בקטלוג</small>
          </div>
          <div className="kpi">
            <span>נלקח השבוע</span>
            <b>{money(weekValue)}</b>
            <small>{weekTakes} לקיחות מאז יום ראשון</small>
          </div>
          <button type="button" className="kpi kpi-warn" onClick={() => { setTab('inv'); setInvCat('הכל'); setLowOnly(true); setShowArchived(false); }}>
            <span>צריך להשלים</span>
            <b>{lowCount}</b>
            <small>מתוכם {outCount} אזלו לגמרי ←</small>
          </button>
        </div>
        <div className="panel week-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div className="muted" style={{ fontSize: 13 }}>דו״ח שבועי אוטומטי</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>הבא: חמישי {nextThursday()} · 16:00</div>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setDlg({ kind: 'report', type: 'week' })}>צפייה בטיוטה</button>
          </div>
          <ul className="week-list">
            {reports.map((r) => (
              <li key={r.id}>
                <span>שבוע {formatDay(r.week_start)}–{formatDay(r.week_end)} · {money(Number(r.total_value))}</span>
                <span style={{ display: 'flex', gap: 4 }}>
                  <a className="btn-link" href={`/api/reports?type=weekly&id=${r.id}`} download aria-label={`הורדת דו״ח שבוע ${formatDay(r.week_start)} כ-Excel`}>Excel</a>
                  <a className="btn-link" href={`/manager/print?type=weekly&id=${r.id}`} target="_blank" rel="noreferrer">PDF</a>
                </span>
              </li>
            ))}
            {reports.length === 0 && <li className="muted">הדו״ח הראשון יישמר ביום חמישי הקרוב.</li>}
          </ul>
        </div>
      </div>

      <div role="tablist" aria-label="אזורי ניהול" className="tabs">
        {([['inv', 'מלאי'], ['log', 'יומן תנועות'], ['users', 'עובדים']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'inv' && (
        <section aria-label="מלאי" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="toolbar">
            <div className="chips">
              {(['הכל', ...CATEGORIES] as const).map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={invCat === c} onClick={() => setInvCat(c)}>{c}</button>
              ))}
              <button type="button" className="chip chip-warn" aria-pressed={lowOnly} onClick={() => setLowOnly((v) => !v)}>רק מה שצריך להשלים</button>
              <button type="button" className="chip" aria-pressed={showArchived} onClick={() => setShowArchived((v) => !v)}>
                הוסרו מהקטלוג ({products.length - active.length})
              </button>
            </div>
            <div className="search" style={{ flex: '0 1 300px' }}>
              <label htmlFor="iq" className="sr-only">חיפוש מוצר</label>
              <SearchIcon size={18} />
              <input id="iq" type="search" className="input" style={{ height: 44 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש: שם, מק״ט או מדף" />
            </div>
          </div>
          <div className="table-box">
            <table style={{ minWidth: 1120 }}>
              <thead>
                <tr><th>מוצר</th><th>תחום</th><th>מדף</th><th>יחידה</th><th>במלאי</th><th>מחיר</th><th>שווי במלאי</th><th>מצב</th><th><span className="sr-only">פעולות</span></th></tr>
              </thead>
              <tbody>
                {inv.map((p) => {
                  const st = stockLabel(p);
                  const status = stockStatus(p);
                  return (
                    <tr key={p.id}>
                      <td><b style={{ fontWeight: 600 }}>{p.name}</b><span className="sub mono">{p.sku ?? '—'}</span></td>
                      <td>{p.category}</td>
                      <td><span className="shelf-soft">{p.shelf}</span></td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 14 }}>{p.pack_size > 1 ? `מארז ${p.pack_size}` : 'יחידה'}</td>
                      <td className="num">{st.main}{st.sub && <span className="sub">{st.sub}</span>}</td>
                      <td className="num">
                        {money(Number(p.price))}{p.pack_size > 1 ? ' למארז' : ''}
                        {p.pack_size > 1 && <span className="sub">₪{unitValue(p).toFixed(2)} ליח׳</span>}
                      </td>
                      <td className="num">{money(p.stock_units * unitValue(p))}</td>
                      <td>
                        {status === 'out' && <span className="tag tag-out">אזל</span>}
                        {status === 'low' && <span className="tag tag-low">להשלים</span>}
                        {status === 'ok' && <span className="tag tag-ok">תקין</span>}
                      </td>
                      <td className="end">
                        <div className="row-actions">
                          {!p.archived && (
                            <button type="button" className={status === 'ok' ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm'} onClick={() => setDlg({ kind: 'restock', product: p })}>מילוי מלאי</button>
                          )}
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setDlg({ kind: 'product', product: p })}>עריכה</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {inv.length === 0 && <p className="muted" style={{ textAlign: 'center', padding: 24, margin: 0 }}>{products.length === 0 ? 'עוד אין מוצרים. התחילו מ״הוספת מוצר״.' : 'לא נמצאו מוצרים.'}</p>}
          </div>
        </section>
      )}

      {tab === 'log' && (
        <section aria-label="יומן תנועות" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="toolbar" style={{ justifyContent: 'flex-start' }}>
            <div className="field">
              <label htmlFor="logUser">עובד</label>
              <select id="logUser" className="input" style={{ height: 44, minWidth: 200 }} value={logUser} onChange={(e) => setLogUser(e.target.value)}>
                <option value="all">כל העובדים</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div className="chips">
              {(['הכל', ...CATEGORIES] as const).map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={logCat === c} onClick={() => setLogCat(c)}>{c}</button>
              ))}
            </div>
            <div className="chips">
              {([['all', 'הכל'], ['take', 'לקיחות'], ['restock', 'מילויים']] as const).map(([k, l]) => (
                <button key={k} type="button" className="chip" aria-pressed={logKind === k} onClick={() => setLogKind(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="table-box">
            <table style={{ minWidth: 960 }}>
              <thead><tr><th>מתי</th><th>מי</th><th>פעולה</th><th>מוצר</th><th>תחום</th><th>כמות</th><th>שווי</th><th>פרויקט / הערה</th></tr></thead>
              <tbody>
                {logRows.map((t) => {
                  const p = productById.get(t.product_id);
                  const who = personById.get(t.user_id);
                  return (
                    <tr key={t.id}>
                      <td className="num" style={{ fontSize: 14 }}>{formatWhen(t.created_at)}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{who?.full_name ?? '—'}</td>
                      <td>{t.kind === 'take' ? <span className="tag tag-take">לקיחה</span> : <span className="tag tag-restock">מילוי</span>}</td>
                      <td>{p?.name ?? '—'}</td>
                      <td>{p?.category}</td>
                      <td className="num" style={{ fontSize: 14 }}>{t.kind === 'take' ? '−' : '+'}{qtyLabel(t.units, p?.pack_size ?? 1)}</td>
                      <td className="num" style={{ fontSize: 14 }}>{money(t.units * Number(t.unit_value))}</td>
                      <td className="muted">{t.note ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {logRows.length === 0 && <p className="muted" style={{ textAlign: 'center', padding: 24, margin: 0 }}>אין תנועות שמתאימות לסינון.</p>}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>מוצגות 500 התנועות האחרונות. לתקופות ארוכות יותר – הדוחות השבועיים.</p>
        </section>
      )}

      {tab === 'users' && (
        <UsersTab
          me={me}
          people={people}
          txs={txs}
          weekStartMs={weekStartMs}
          onDone={done}
          onPassword={(name, username, password) => setDlg({ kind: 'password', name, username, password })}
          onShowLog={(id) => { setLogUser(id); setLogCat('הכל'); setLogKind('all'); setTab('log'); }}
        />
      )}

      {dlg?.kind === 'product' && <ProductDialog product={dlg.product} onClose={() => setDlg(null)} onDone={done} />}
      {dlg?.kind === 'take' && <TakeDialog products={active} people={people.filter((p) => p.active)} me={me} onClose={() => setDlg(null)} onDone={done} />}
      {dlg?.kind === 'restock' && <RestockDialog product={dlg.product} onClose={() => setDlg(null)} onDone={done} />}
      {dlg?.kind === 'report' && <ReportDialog initial={dlg.type ?? 'week'} products={active} weekSummary={weekSummary} onClose={() => setDlg(null)} />}
      {dlg?.kind === 'password' && (
        <Dialog
          title="סיסמה זמנית"
          kicker={dlg.name}
          onClose={() => setDlg(null)}
          footer={<button type="button" className="btn btn-dark btn-lg grow" onClick={() => setDlg(null)}>העברתי לעובד</button>}
        >
          <p style={{ margin: 0 }}>מסרו לעובד את פרטי הכניסה. הסיסמה מוצגת פעם אחת בלבד – כדאי לרשום אותה עכשיו.</p>
          <div className="panel" style={{ padding: 16, display: 'grid', gap: 8 }}>
            <div>שם משתמש: <b className="mono" dir="ltr">{dlg.username}</b></div>
            <div>סיסמה: <b className="mono" dir="ltr" style={{ fontSize: 20 }}>{dlg.password}</b></div>
          </div>
        </Dialog>
      )}
      {toast.node}
    </main>
  );
}

/* ---------------------------------------------------------------- users */

function UsersTab({
  me,
  people,
  txs,
  weekStartMs,
  onDone,
  onPassword,
  onShowLog,
}: {
  me: Profile;
  people: Profile[];
  txs: Transaction[];
  weekStartMs: number;
  onDone: (r: ActionResult, close?: boolean) => void;
  onPassword: (name: string, username: string, password: string) => void;
  onShowLog: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'employee' | 'manager'>('employee');
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = () =>
    start(async () => {
      const res = await createUser(name, username, role);
      onDone(res, false);
      if (res.ok && res.password) {
        onPassword(name, username.trim().toLowerCase(), res.password);
        setName('');
        setUsername('');
        setRole('employee');
      }
    });

  return (
    <section aria-label="עובדים" className="split" style={{ gap: 24 }}>
      <div className="table-box" style={{ flex: '999 1 560px', minWidth: 0 }}>
        <table style={{ minWidth: 820 }}>
          <thead><tr><th>שם</th><th>שם משתמש</th><th>הרשאה</th><th>לקיחות השבוע</th><th>שווי השבוע</th><th><span className="sr-only">פעולות</span></th></tr></thead>
          <tbody>
            {people.map((p) => {
              const week = txs.filter((t) => t.user_id === p.id && t.kind === 'take' && new Date(t.created_at).getTime() >= weekStartMs);
              return (
                <tr key={p.id} style={p.active ? undefined : { opacity: 0.6 }}>
                  <td style={{ fontWeight: 600 }}>{p.full_name}{!p.active && <span className="sub">מושבת</span>}</td>
                  <td className="num" style={{ fontSize: 14 }}>{p.username}</td>
                  <td><span className="tag tag-neutral">{p.role === 'manager' ? 'מנהל' : 'לקיחה בלבד'}</span></td>
                  <td><button type="button" className="btn-link mono" onClick={() => onShowLog(p.id)}>{week.length}</button></td>
                  <td className="num">{money(week.reduce((a, t) => a + t.units * Number(t.unit_value), 0))}</td>
                  <td className="end">
                    <div className="row-actions">
                      {confirmReset === p.id ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={pending}
                            onClick={() => start(async () => {
                              const res = await resetPassword(p.id);
                              setConfirmReset(null);
                              onDone(res, false);
                              if (res.ok && res.password) onPassword(p.full_name, p.username, res.password);
                            })}
                          >
                            לאפס? הסיסמה הנוכחית תפסיק לעבוד
                          </button>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmReset(null)}>ביטול</button>
                        </>
                      ) : (
                        <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => setConfirmReset(p.id)}>
                          איפוס סיסמה
                        </button>
                      )}
                      {p.id !== me.id && (
                        <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => onDone(await setActive(p.id, !p.active), false))}>
                          {p.active ? 'השבתה' : 'הפעלה'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <form className="panel" style={{ flex: '1 1 300px', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={(e) => { e.preventDefault(); add(); }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>משתמש חדש</h2>
        <div className="field">
          <label htmlFor="nName">שם מלא</label>
          <input id="nName" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="nUser">שם משתמש</label>
          <input id="nUser" className="input input-ltr mono" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="first.l" autoCapitalize="none" spellCheck={false} required />
          <span className="hint">באנגלית, בלי רווחים. למשל noa.levi</span>
        </div>
        <div className="field">
          <span className="label">הרשאה</span>
          <Seg label="הרשאה" value={role} onChange={setRole} options={[{ value: 'employee', label: 'עובד – לקיחה בלבד' }, { value: 'manager', label: 'מנהל' }]} />
        </div>
        <button type="submit" className="btn btn-dark" disabled={pending}>{pending ? 'יוצר…' : 'יצירת משתמש'}</button>
        <span className="hint">המערכת תיצור סיסמה זמנית ותציג אותה פעם אחת.</span>
      </form>
    </section>
  );
}

/* ---------------------------------------------------------------- product add / edit */

function ProductDialog({ product, onClose, onDone }: { product?: Product; onClose: () => void; onDone: (r: ActionResult) => void }) {
  const editing = !!product;
  const [category, setCategory] = useState<Category>(product?.category ?? 'מיזוג');
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [shelf, setShelf] = useState(product?.shelf ?? '');
  const [type, setType] = useState<'unit' | 'pack'>(product && product.pack_size > 1 ? 'pack' : 'unit');
  const [pack, setPack] = useState(product && product.pack_size > 1 ? product.pack_size : 20);
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [qty, setQty] = useState('0');
  const [min, setMin] = useState(product ? String(product.pack_size > 1 ? Math.round(product.min_units / product.pack_size) : product.min_units) : '0');
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');

  const isPack = type === 'pack';
  const packN = isPack ? Math.max(2, pack || 2) : 1;
  const priceN = parseFloat(price) || 0;
  const qtyN = Math.max(0, parseInt(qty || '0', 10) || 0);
  const minN = Math.max(0, parseInt(min || '0', 10) || 0);

  const submit = () =>
    start(async () => {
      setErr('');
      const res = await saveProduct({
        id: product?.id,
        category,
        name,
        sku,
        shelf,
        pack_size: packN,
        price: priceN,
        min_units: minN * packN,
        initial_units: editing ? 0 : qtyN * packN,
      });
      if (!res.ok) setErr(res.error);
      else onDone(res);
    });

  return (
    <Dialog
      title={editing ? `עריכה: ${product!.name}` : 'הוספת מוצר'}
      kicker={editing ? 'קטלוג' : 'מוצר חדש'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-primary btn-lg" disabled={pending} onClick={submit}>{pending ? 'שומר…' : editing ? 'שמירת שינויים' : 'הוספה לקטלוג'}</button>
          {editing && (
            <button
              type="button"
              className="btn btn-outline btn-lg"
              disabled={pending}
              onClick={() => start(async () => onDone(await archiveProduct(product!.id, !product!.archived)))}
            >
              {product!.archived ? 'החזרה לקטלוג' : 'הסרה מהקטלוג'}
            </button>
          )}
          <button type="button" className="btn btn-outline btn-lg" onClick={onClose}>ביטול</button>
        </>
      }
    >
      {err && <div className="form-error" role="alert">{err}</div>}
      <div className="field">
        <span className="label">תחום</span>
        <Seg label="תחום" value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
      </div>
      <div className="field">
        <label htmlFor="pName">שם המוצר</label>
        <input id="pName" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="pSku">מק״ט</label>
          <input id="pSku" className="input mono input-ltr" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="לא חובה" />
        </div>
        <div className="field">
          <label htmlFor="pShelf">מספר מדף</label>
          <input id="pShelf" className="input mono input-ltr" value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="B-10" />
        </div>
      </div>
      <div className="field">
        <span className="label">נלקח ונספר לפי</span>
        <Seg label="יחידה או מארז" value={type} onChange={setType} options={[{ value: 'unit', label: 'יחידה' }, { value: 'pack', label: 'מארז' }]} />
        {editing && product!.stock_units > 0 && <span className="hint">המלאי נשמר ביחידות ({product!.stock_units} יח׳), כך ששינוי גודל המארז לא משנה את הכמות.</span>}
      </div>
      {isPack && (
        <div className="field">
          <label htmlFor="pPack">כמה יחידות במארז?</label>
          <div className="chips" style={{ alignItems: 'center' }}>
            {[10, 20, 100].map((n) => (
              <button key={n} type="button" className="chip" aria-pressed={pack === n} onClick={() => setPack(n)}>{n}</button>
            ))}
            <input id="pPack" type="number" min={2} className="input mono" style={{ width: 100, height: 40 }} value={pack} onChange={(e) => setPack(parseInt(e.target.value || '0', 10))} />
          </div>
        </div>
      )}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="pPrice">{isPack ? 'מחיר למארז (₪)' : 'מחיר ליחידה (₪)'}</label>
          <input id="pPrice" type="number" min={0} step="0.01" className="input mono" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        {!editing && (
          <div className="field">
            <label htmlFor="pQty">{isPack ? 'מארזים במלאי' : 'יחידות במלאי'}</label>
            <input id="pQty" type="number" min={0} className="input mono" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
        )}
        <div className="field">
          <label htmlFor="pMin">{isPack ? 'מינימום (מארזים)' : 'מינימום (יח׳)'}</label>
          <input id="pMin" type="number" min={0} className="input mono" value={min} onChange={(e) => setMin(e.target.value)} />
        </div>
      </div>
      <span className="hint">
        {isPack
          ? `מארז של ${packN} יח׳ · ₪${(priceN / packN).toFixed(2)} ליחידה${editing ? '' : ` · ${qtyN * packN} יח׳ במלאי`}`
          : editing ? 'כדי לשנות כמות – השתמשו ב״מילוי מלאי״' : `שווי במלאי: ${money(priceN * qtyN)}`}
        {' · '}התראה כשנשארים {minN * packN} יח׳ או פחות
      </span>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- take for someone */

function TakeDialog({ products, people, me, onClose, onDone }: { products: Product[]; people: Profile[]; me: Profile; onClose: () => void; onDone: (r: ActionResult) => void }) {
  const [pid, setPid] = useState(String(products.find((p) => p.stock_units > 0)?.id ?? products[0]?.id ?? ''));
  const [uid, setUid] = useState(me.id);
  const [mode, setMode] = useState<'pack' | 'unit'>('unit');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const p = products.find((x) => String(x.id) === pid);
  if (!p) return null;
  const isPack = p.pack_size > 1;
  const byPack = isPack && mode === 'pack';
  const max = byPack ? Math.floor(p.stock_units / p.pack_size) : p.stock_units;
  const units = qty * (byPack ? p.pack_size : 1);
  const enough = units <= p.stock_units && units > 0;

  return (
    <Dialog
      title="לקיחת מוצר"
      kicker="רישום לקיחה"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={pending || !enough}
            onClick={() => start(async () => {
              const res = await takeFor(p.id, units, note, uid);
              if (!res.ok) setErr(res.error);
              else onDone({ ok: true, message: `נרשם: ${p.name} · ${qtyLabel(units, p.pack_size)} על שם ${people.find((x) => x.id === uid)?.full_name ?? ''}` });
            })}
          >
            {pending ? 'רושם…' : 'רישום לקיחה'}
          </button>
          <button type="button" className="btn btn-outline btn-lg" onClick={onClose}>ביטול</button>
        </>
      }
    >
      {err && <div className="form-error" role="alert">{err}</div>}
      <div className="field">
        <label htmlFor="tItem">מוצר</label>
        <select id="tItem" className="input" value={pid} onChange={(e) => { setPid(e.target.value); setQty(1); setMode('unit'); }}>
          {CATEGORIES.map((c) => (
            <optgroup key={c} label={c}>
              {products.filter((x) => x.category === c).map((x) => (
                <option key={x.id} value={x.id}>{x.name} · מדף {x.shelf}{x.stock_units === 0 ? ' (אזל)' : ''}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="hint">מדף {p.shelf} · במלאי {qtyLabel(p.stock_units, p.pack_size)}{isPack ? ` · מארז ${p.pack_size}` : ''}</span>
      </div>
      <div className="field">
        <label htmlFor="tUser">על שם</label>
        <select id="tUser" className="input" value={uid} onChange={(e) => setUid(e.target.value)}>
          {people.map((x) => <option key={x.id} value={x.id}>{x.full_name}{x.id === me.id ? ' (אני)' : ''}</option>)}
        </select>
      </div>
      {isPack && (
        <Seg label="לקיחה לפי" value={mode} onChange={(m) => { setMode(m); setQty(1); }} options={[{ value: 'pack', label: 'מארזים שלמים' }, { value: 'unit', label: 'יחידות בודדות' }]} />
      )}
      <div className="field">
        <span className="label" id="tq">{byPack ? 'כמה מארזים?' : 'כמה יחידות?'}</span>
        <Stepper value={qty} onChange={setQty} max={Math.max(1, max)} labelledBy="tq" />
        <span className="hint">סה״כ {units} יח׳ · שווי {money(units * unitValue(p))}{!enough ? ' · אין מספיק במלאי' : ''}</span>
      </div>
      <div className="field">
        <label htmlFor="tNote">פרויקט / אתר</label>
        <input id="tNote" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="לא חובה" maxLength={200} />
      </div>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- restock */

function RestockDialog({ product: p, onClose, onDone }: { product: Product; onClose: () => void; onDone: (r: ActionResult) => void }) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const units = qty * p.pack_size;
  return (
    <Dialog
      title={`מילוי: ${p.name}`}
      kicker={`${p.sku ? p.sku + ' · ' : ''}מדף ${p.shelf}`}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={pending}
            onClick={() => start(async () => {
              const res = await restock(p.id, units, note);
              if (!res.ok) setErr(res.error);
              else onDone({ ok: true, message: `המלאי עודכן: ${p.name} +${qtyLabel(units, p.pack_size)}` });
            })}
          >
            {pending ? 'שומר…' : 'אישור מילוי'}
          </button>
          <button type="button" className="btn btn-outline btn-lg" onClick={onClose}>ביטול</button>
        </>
      }
    >
      {err && <div className="form-error" role="alert">{err}</div>}
      <div className="field">
        <span className="label" id="rq">{p.pack_size > 1 ? `כמה מארזים נכנסו? (${p.pack_size} יח׳ במארז)` : 'כמה יחידות נכנסו?'}</span>
        <Stepper value={qty} onChange={setQty} labelledBy="rq" />
        <span className="hint">אחרי המילוי: {qtyLabel(p.stock_units + units, p.pack_size)} · עלות {money(qty * Number(p.price))}</span>
      </div>
      <div className="field">
        <label htmlFor="rNote">ספק / מספר חשבונית</label>
        <input id="rNote" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="לא חובה" maxLength={200} />
      </div>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- reports */

function ReportDialog({ initial, products, weekSummary, onClose }: { initial: ReportType; products: Product[]; weekSummary: SummaryRow[]; onClose: () => void }) {
  const [type, setType] = useState<ReportType>(initial);
  const [cat, setCat] = useState<Category>('מיזוג');

  let title: string, head: [string, string, string, string], rows: [string, string, string, string][], totalLabel: string, total: number;
  if (type === 'week') {
    title = 'דו״ח שבועי – מה נלקח מאז יום ראשון';
    head = ['מוצר', 'מי לקח', 'כמות', 'שווי'];
    rows = weekSummary.map((r) => [r.name, r.takers, qtyLabel(Number(r.units), r.pack_size), money(Number(r.value))]);
    totalLabel = 'סה״כ נלקח השבוע';
    total = weekSummary.reduce((a, r) => a + Number(r.value), 0);
  } else {
    const list = type === 'category' ? products.filter((p) => p.category === cat) : products;
    title = type === 'category' ? `דו״ח מלאי – ${cat}` : 'דו״ח מלאי מלא';
    head = ['מוצר', 'מדף', 'במלאי', 'שווי'];
    rows = list.map((p) => [p.name, p.shelf, qtyLabel(p.stock_units, p.pack_size), money(p.stock_units * unitValue(p))]);
    totalLabel = 'שווי מלאי כולל';
    total = list.reduce((a, p) => a + p.stock_units * unitValue(p), 0);
  }
  const qs = type === 'category' ? `type=category&cat=${encodeURIComponent(cat)}` : `type=${type}`;

  return (
    <Dialog
      wide
      title="איזה דו״ח להפיק?"
      kicker="הפקת דו״ח"
      onClose={onClose}
      footer={
        <>
          <a className="btn btn-primary btn-lg grow" href={`/api/reports?${qs}`} download>
            <DownloadIcon size={18} />
            הורדה כ־Excel
          </a>
          <a className="btn btn-outline-ink btn-lg" href={`/manager/print?${qs}`} target="_blank" rel="noreferrer">PDF / הדפסה</a>
        </>
      }
    >
      <Seg label="סוג דו״ח" value={type} onChange={setType} options={[{ value: 'week', label: 'שבועי' }, { value: 'category', label: 'לפי תחום' }, { value: 'stock', label: 'מלאי נוכחי' }]} />
      {type === 'category' && (
        <div className="chips" aria-label="תחום">
          {CATEGORIES.map((c) => <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
        </div>
      )}
      <div style={{ border: '1px solid var(--line)' }}>
        <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', fontWeight: 700 }}>{title}</div>
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          <table style={{ minWidth: 560 }}>
            <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}><td style={{ fontWeight: 600 }}>{r[0]}</td><td>{r[1]}</td><td className="num" style={{ fontSize: 14 }}>{r[2]}</td><td className="num" style={{ fontSize: 14 }}>{r[3]}</td></tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="muted" style={{ textAlign: 'center', padding: 20, margin: 0 }}>אין נתונים לדו״ח הזה עדיין.</p>}
        </div>
        <div className="print-total"><span>{totalLabel}</span><span className="mono">{money(total)}</span></div>
      </div>
    </Dialog>
  );
}
