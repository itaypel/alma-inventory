'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckIcon, CloseIcon } from './Icons';

export function Dialog({
  title,
  kicker,
  wide,
  onClose,
  children,
  footer,
}: {
  title: string;
  kicker?: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return closeRef.current();
      if (e.key !== 'Tab' || !ref.current) return;
      // הפוקוס נשאר בתוך הדיאלוג
      const items = ref.current.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])');
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const first = ref.current?.querySelector<HTMLElement>('input, select, button:not([aria-label="סגירה"])');
    first?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      opener?.focus?.();
    };
  }, []);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dlg-title" className={wide ? 'dialog dialog-wide' : 'dialog'}>
        <div className="dialog-head">
          <div>
            {kicker && <small>{kicker}</small>}
            <h2 id="dlg-title">{title}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="סגירה" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        <div className="dialog-foot">{footer}</div>
      </div>
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max,
  labelledBy,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  labelledBy: string;
}) {
  const clamp = (n: number) => Math.max(min, max !== undefined ? Math.min(max, n) : n);
  return (
    <div className="stepper" role="group" aria-labelledby={labelledBy}>
      <button type="button" aria-label="פחות" onClick={() => onChange(clamp(value - 1))}>−</button>
      <input
        type="number"
        inputMode="numeric"
        aria-labelledby={labelledBy}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(clamp(parseInt(e.target.value || '0', 10) || min))}
      />
      <button type="button" aria-label="יותר" onClick={() => onChange(clamp(value + 1))}>+</button>
    </div>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((msg: string, err = false) => {
    setToast({ msg, err });
    clearTimeout(timer.current);
    // שגיאה נשארת עד שסוגרים אותה – לא נעלמת לפני שהספיקו לקרוא
    if (!err) timer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = toast ? (
    toast.err ? (
      <div role="alert" className="toast err">
        {toast.msg}
        <button type="button" className="icon-btn" aria-label="סגירה" onClick={() => setToast(null)}>
          <CloseIcon size={18} />
        </button>
      </div>
    ) : (
      <div role="status" className="toast">
        <span className="toast-ok"><CheckIcon size={18} /></span>
        {toast.msg}
      </div>
    )
  ) : null;
  return { show, node };
}

export function StatusTag({ status }: { status: 'ok' | 'low' | 'out' }) {
  if (status === 'out') return <span className="tag tag-out">אזל</span>;
  if (status === 'low') return <span className="tag tag-low">מלאי נמוך</span>;
  return <span className="tag tag-ok">במלאי</span>;
}
