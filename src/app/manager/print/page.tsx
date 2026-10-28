import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { buildReport } from '@/lib/reports';
import { money } from '@/lib/format';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

export default async function PrintPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { supabase } = await requireProfile('manager');
  const params = new URLSearchParams(await searchParams);
  const report = await buildReport(supabase, params);

  if (!report) {
    return (
      <main className="print-page">
        <p>הדו״ח לא נמצא.</p>
        <Link href="/manager">חזרה</Link>
      </main>
    );
  }

  return (
    <main className="print-page">
      <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <PrintButton />
        <Link href="/manager" className="btn btn-outline">חזרה ללוח</Link>
      </div>
      <h1>עלמא · {report.title}</h1>
      <p className="muted" style={{ marginTop: 0 }}>{report.subtitle}</p>
      <table>
        <thead>
          <tr>{report.head.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {report.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={typeof c === 'number' ? 'num' : undefined} style={{ fontSize: 13 }}>
                  {j === report.valueCol && typeof c === 'number' ? money(c) : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="print-total">
        <span>{report.totalLabel}</span>
        <span className="mono">{money(report.total)}</span>
      </div>
    </main>
  );
}
