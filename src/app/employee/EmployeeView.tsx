'use client';

import { useMemo, useState, useTransition } from 'react';
import { CATEGORIES, type Category, type Product, type Transaction } from '@/lib/types';
import { formatWhen, qtyLabel, stockLabel, stockStatus } from '@/lib/format';
import { CATEGORY_ICON, PlusIcon, SearchIcon } from '@/components/Icons';
import { Dialog, Seg, StatusTag, Stepper, useToast } from '@/components/ui';
import { takeProduct } from './actions';

export function EmployeeView({ products, mine }: { products: Product[]; mine: Transaction[] }) {
  const [cat, setCat] = useState<Category>('מיזוג');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Product | null>(null);
  const toast = useToast();

  const query = q.trim().toLowerCase();
  const shown = useMemo(
    () =>
      query
        ? products.filter(
            (p) =>
              p.name.toLowerCase().includes(query) ||
              (p.sku ?? '').toLowerCase().includes(query) ||
              p.shelf.toLowerCase().includes(query),
          )
        : products.filter((p) => p.category === cat),
    [products, cat, query],
  );
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  return (
    <main className="page" style={{ maxWidth: 1240 }}>
      <div className="page-head">
        <div>
          <h1>מה לוקחים היום?</h1>
          <p>בוחרים תחום, מוצאים את המוצר לפי המדף ומאשרים כמות. הלקיחה נרשמת על שמך.</p>
        </div>
      </div>

      <nav aria-label="תחומים" className="cat-tiles">
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICON[c];
          return (
            <button key={c} type="button" className="cat-tile" aria-pressed={!query && cat === c} onClick={() => { setCat(c); setQ(''); }}>
              <Icon size={28} />
              <span>
                <strong>{c}</strong>
                <span>{products.filter((p) => p.category === c).length} מוצרים</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="split">
        <section aria-label="מוצרים" className="split-main">
          <div className="field">
            <label htmlFor="q">חיפוש בכל המחסן</label>
            <div className="search">
              <SearchIcon />
              <input id="q" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="שם מוצר, מק״ט או מדף – למשל B-03" />
            </div>
            <span className="hint">
              {query ? `מחפש בכל שלושת התחומים · ${shown.length} תוצאות` : `מציג: ${cat} · ${shown.length} מוצרים`}
            </span>
          </div>

          <div className="grid-cards">
            {shown.map((p) => {
              const st = stockLabel(p);
              const status = stockStatus(p);
              return (
                <article key={p.id} className="pcard">
                  <div className="pcard-top">
                    <span className="shelf">מדף {p.shelf}</span>
                    <StatusTag status={status} />
                  </div>
                  <div>
                    <h3>{p.name}</h3>
                    <span className="pcard-meta">{[p.sku, p.category].filter(Boolean).join(' · ')}</span>
                  </div>
                  <span className="pcard-unit">{p.pack_size > 1 ? `מארז · ${p.pack_size} יח׳ במארז` : 'נלקח ביחידה'}</span>
                  <div className="pcard-bottom">
                    <div className="pcard-stock">
                      <small>במלאי</small>
                      <b>{st.main}</b>
                      {st.sub && <small>{st.sub}</small>}
                    </div>
                    {p.stock_units > 0 ? (
                      <button type="button" className="btn btn-dark" onClick={() => setPicked(p)}>
                        <PlusIcon size={18} />
                        לקחתי
                      </button>
                    ) : (
                      <span className="pcard-out">אזל – עדכנו את המנהל</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {shown.length === 0 && <p className="empty">לא נמצאו מוצרים. נסו שם אחר, מק״ט או מספר מדף.</p>}
        </section>

        <aside className="split-side panel">
          <div className="panel-head">
            <h2>מה לקחתי השבוע</h2>
            <span className="count">{mine.length}</span>
          </div>
          <ol className="mine">
            {mine.map((t) => {
              const p = byId.get(t.product_id);
              return (
                <li key={t.id}>
                  <div className="mine-row">
                    <span>{p?.name ?? 'מוצר'}</span>
                    <span className="mine-qty">{qtyLabel(t.units, p?.pack_size ?? 1)}</span>
                  </div>
                  <span className="muted" style={{ fontSize: 13 }}>{formatWhen(t.created_at)}{t.note ? ` · ${t.note}` : ''}</span>
                </li>
              );
            })}
            {mine.length === 0 && <li className="muted" style={{ padding: '20px' }}>עוד לא לקחת כלום השבוע.</li>}
          </ol>
          <p className="muted" style={{ margin: 0, padding: '14px 20px', fontSize: 13 }}>טעית ברישום? פנה למנהל המחסן – רק הוא יכול לתקן או למלא מלאי.</p>
        </aside>
      </div>

      {picked && (
        <TakeDialog
          product={picked}
          onClose={() => setPicked(null)}
          onDone={(msg) => { toast.show(msg); setPicked(null); }}
        />
      )}
      {toast.node}
    </main>
  );
}

function TakeDialog({ product: p, onClose, onDone }: { product: Product; onClose: () => void; onDone: (msg: string) => void }) {
  const isPack = p.pack_size > 1;
  const [mode, setMode] = useState<'pack' | 'unit'>(isPack && p.stock_units >= p.pack_size ? 'pack' : 'unit');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const byPack = isPack && mode === 'pack';
  const max = byPack ? Math.floor(p.stock_units / p.pack_size) : p.stock_units;
  const units = qty * (byPack ? p.pack_size : 1);

  const submit = () =>
    start(async () => {
      setErr('');
      const res = await takeProduct(p.id, units, note);
      if (!res.ok) setErr(res.error);
      else onDone(`נרשם על שמך: ${p.name} · ${qtyLabel(units, p.pack_size)}`);
    });

  return (
    <Dialog
      title={p.name}
      kicker={`${p.sku ? p.sku + ' · ' : ''}מדף ${p.shelf}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-primary btn-lg" disabled={pending || units < 1 || units > p.stock_units} onClick={submit}>
            {pending ? 'רושם…' : 'רשום לקיחה על שמי'}
          </button>
          <button type="button" className="btn btn-outline btn-lg" onClick={onClose}>ביטול</button>
        </>
      }
    >
      {err && <div className="form-error" role="alert">{err}</div>}
      {isPack && (
        <div className="field">
          <span className="label">לוקח</span>
          <Seg
            label="לוקח לפי"
            value={mode}
            onChange={(m) => { setMode(m); setQty(1); }}
            options={[
              { value: 'pack', label: `מארזים שלמים (${p.pack_size} יח׳)` },
              { value: 'unit', label: 'יחידות בודדות' },
            ]}
          />
        </div>
      )}
      <div className="field">
        <span className="label" id="qty-lbl">{byPack ? 'כמה מארזים?' : 'כמה יחידות?'}</span>
        <Stepper value={qty} onChange={setQty} max={Math.max(1, max)} labelledBy="qty-lbl" />
        <span className="hint">סה״כ {units} יח׳ · נשארים במלאי {p.stock_units - units} יח׳</span>
      </div>
      <div className="field">
        <label htmlFor="note">לאיזה פרויקט / אתר?</label>
        <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="למשל: התקנת VRF – קומה 3" maxLength={200} />
      </div>
    </Dialog>
  );
}
