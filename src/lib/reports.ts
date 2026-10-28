import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CATEGORIES, type Category, type Product, type SummaryRow, type WeeklyReport } from './types';
import { formatDay, qtyLabel, TZ, unitValue } from './format';

export interface Report {
  title: string;
  subtitle: string;
  filename: string;
  head: string[];
  rows: (string | number)[][];
  /** אינדקס העמודה של השווי (לסיכום) */
  valueCol: number;
  totalLabel: string;
  total: number;
}

const nowLabel = () =>
  new Intl.DateTimeFormat('he-IL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());
const fileDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

function stockReport(products: Product[], cat?: Category): Report {
  const list = products.filter((p) => !p.archived && (!cat || p.category === cat));
  const rows = list.map((p) => [
    p.category,
    p.shelf,
    p.name,
    p.sku ?? '',
    p.pack_size > 1 ? `מארז ${p.pack_size}` : 'יחידה',
    p.stock_units,
    qtyLabel(p.stock_units, p.pack_size),
    Number(p.price),
    Math.round(p.stock_units * unitValue(p) * 100) / 100,
    p.stock_units === 0 ? 'אזל' : p.stock_units <= p.min_units ? 'להשלים' : 'תקין',
  ]);
  const total = list.reduce((a, p) => a + p.stock_units * unitValue(p), 0);
  return {
    title: cat ? `דו״ח מלאי – ${cat}` : 'דו״ח מלאי מלא',
    subtitle: `נכון ל־${nowLabel()} · ${list.length} מוצרים`,
    filename: `alma-${cat ? 'category' : 'stock'}-${fileDate()}.xlsx`,
    head: ['תחום', 'מדף', 'מוצר', 'מק״ט', 'יחידה', 'יחידות במלאי', 'כמות', 'מחיר (מארז/יח׳)', 'שווי ₪', 'מצב'],
    rows,
    valueCol: 8,
    totalLabel: 'שווי מלאי כולל',
    total,
  };
}

function weekReport(rows: SummaryRow[], from: string, to: string, saved: boolean): Report {
  const total = rows.reduce((a, r) => a + Number(r.value), 0);
  const count = rows.reduce((a, r) => a + Number(r.take_count), 0);
  return {
    title: `דו״ח שבועי · ${formatDay(from)}–${formatDay(to)}`,
    subtitle: `${saved ? 'הופק' : 'טיוטה נכון ל־' + nowLabel()} · ${count} לקיחות`,
    filename: `alma-weekly-${new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(from))}.xlsx`,
    head: ['תחום', 'מוצר', 'מדף', 'מי לקח', 'מספר לקיחות', 'יחידות', 'כמות', 'שווי ₪'],
    rows: rows.map((r) => [r.category, r.name, r.shelf, r.takers, Number(r.take_count), Number(r.units), qtyLabel(Number(r.units), r.pack_size), Number(r.value)]),
    valueCol: 7,
    totalLabel: 'סה״כ נלקח בשבוע',
    total,
  };
}

/** בונה דו"ח לפי פרמטרים מה-URL. מניח ש-supabase הוא לקוח של מנהל (RLS מגן) */
export async function buildReport(supabase: SupabaseClient, params: URLSearchParams): Promise<Report | null> {
  const type = params.get('type');

  if (type === 'stock' || type === 'category') {
    const cat = params.get('cat') as Category | null;
    if (type === 'category' && (!cat || !CATEGORIES.includes(cat))) return null;
    const { data, error } = await supabase
      .from('products')
      .select('id, category, name, sku, shelf, pack_size, price, stock_units, min_units, archived')
      .order('category')
      .order('shelf');
    if (error) return null;
    return stockReport(data as Product[], type === 'category' ? cat! : undefined);
  }

  if (type === 'week') {
    const [{ data, error }, { data: start }] = await Promise.all([
      supabase.rpc('takes_summary'),
      supabase.rpc('current_week_start'),
    ]);
    if (error) return null;
    return weekReport(data as SummaryRow[], start as string, new Date().toISOString(), false);
  }

  if (type === 'weekly') {
    const id = Number(params.get('id'));
    const { data, error } = await supabase.from('weekly_reports').select('*').eq('id', id).single<WeeklyReport>();
    if (error || !data) return null;
    return weekReport(data.rows, data.week_start, data.week_end, true);
  }

  return null;
}

export async function reportToXlsx(r: Report): Promise<Buffer> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'עלמא – ניהול מלאי';
  const ws = wb.addWorksheet('דו״ח', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 4 }] });

  ws.addRow([r.title]).font = { bold: true, size: 16 };
  ws.addRow([r.subtitle]).font = { color: { argb: 'FF5B5F66' } };
  ws.addRow([]);
  const head = ws.addRow(r.head);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17191C' } };
    c.alignment = { vertical: 'middle' };
  });
  r.rows.forEach((row) => ws.addRow(row));
  ws.addRow([]);
  const totalRow = ws.addRow([]);
  totalRow.getCell(1).value = r.totalLabel;
  totalRow.getCell(r.valueCol + 1).value = Math.round(r.total * 100) / 100;
  totalRow.font = { bold: true };

  ws.getColumn(r.valueCol + 1).numFmt = '₪#,##0.00';
  ws.columns.forEach((col, i) => {
    let w = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      if (Number(cell.row) <= 2) return;
      w = Math.max(w, String(cell.value ?? '').length + 2);
    });
    col.width = Math.min(w, i === 1 || i === 2 ? 40 : 28);
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}
