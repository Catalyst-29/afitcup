import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { setRulesAccepted, setTeamSession } from '@/lib/session';
export async function POST(req: Request) {
  const { token } = await req.json();
  const clean = String(token || '').trim().toUpperCase();
  if (!clean) return NextResponse.json({ error: 'Enter your registration token.' }, { status: 400 });
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('departments').select('id,name').eq('token', clean).maybeSingle();
  if (error) {
    console.error('Department token verification failed:', error.code, error.message);
    return NextResponse.json({ error: 'Token verification is temporarily unavailable. Please try again.' }, { status: 503 });
  }
  if (!data) return NextResponse.json({ error: 'Invalid registration token.' }, { status: 401 });

  // Check the optional activation flag separately so older database schemas can
  // still verify valid tokens. A missing flag never blocks the core login query.
  const activation = await sb.from('departments').select('is_active').eq('id', data.id).maybeSingle();
  if (!activation.error && activation.data?.is_active === false) {
    return NextResponse.json({ error: 'This registration token has been deactivated.' }, { status: 403 });
  }
  await setTeamSession(data.id);
  const { data: team } = await sb.from('teams').select('id').eq('department_id', data.id).maybeSingle();
  if (team) await setRulesAccepted(data.id);
  return NextResponse.json(
    { ok: true, department: data.name, hasTeam: !!team },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
