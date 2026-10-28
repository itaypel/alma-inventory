import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildReport, reportToXlsx } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role, active').eq('id', user.id).single();
  if (!profile || profile.role !== 'manager' || !profile.active) {
    return NextResponse.json({ error: 'מנהל בלבד' }, { status: 403 });
  }

  const report = await buildReport(supabase, req.nextUrl.searchParams);
  if (!report) return NextResponse.json({ error: 'דו״ח לא נמצא' }, { status: 404 });

  const body = await reportToXlsx(report);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${report.filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
