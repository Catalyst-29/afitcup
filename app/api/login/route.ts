import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { setRulesAccepted, setTeamSession } from '@/lib/session';
export async function POST(req: Request) {
  const { token } = await req.json();
  const clean = String(token || '').trim().toUpperCase();
  if (!clean) return NextResponse.json({ error: 'Enter your registration token.' }, { status: 400 });
  const sb = supabaseAdmin();
  let { data, error } = await sb.from('departments').select('id,name,is_active').eq('token', clean).maybeSingle();

  // Older deployed databases may not have received the is_active migration yet.
  // Keep token login available there, while honoring deactivation where supported.
  if (error && (error.code === '42703' || error.code === 'PGRST204') && error.message.includes('is_active')) {
    const legacyResult = await sb.from('departments').select('id,name').eq('token', clean).maybeSingle();
    data = legacyResult.data ? { ...legacyResult.data, is_active: true } : null;
    error = legacyResult.error;
  }

  if (error) {
    console.error('Department token verification failed:', error.code, error.message);
    return NextResponse.json({ error: 'Token verification is temporarily unavailable. Please try again.' }, { status: 503 });
  }
  if (!data) return NextResponse.json({ error: 'Invalid registration token.' }, { status: 401 });
  if (!data.is_active) return NextResponse.json({ error: 'This registration token has been deactivated.' }, { status: 403 });
  await setTeamSession(data.id);
  const { data: team } = await sb.from('teams').select('id').eq('department_id', data.id).maybeSingle();
  if (team) await setRulesAccepted(data.id);
  return NextResponse.json(
    { ok: true, department: data.name, hasTeam: !!team },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
