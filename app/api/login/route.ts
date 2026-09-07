import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { setRulesAccepted, setTeamSession } from '@/lib/session';
export async function POST(req: Request) {
  const { token } = await req.json();
  const clean = String(token || '').trim().toUpperCase();
  if (!clean) return NextResponse.json({ error: 'Enter your registration token.' }, { status: 400 });
  const { data, error } = await supabaseAdmin().from('departments').select('id,name,is_active').eq('token', clean).maybeSingle();
  if (error) {
    console.error('Department token verification failed:', error.code);
    return NextResponse.json({ error: 'Token verification is temporarily unavailable. Please try again.' }, { status: 503 });
  }
  if (!data) return NextResponse.json({ error: 'Invalid registration token.' }, { status: 401 });
  if (!data.is_active) return NextResponse.json({ error: 'This registration token has been deactivated.' }, { status: 403 });
  await setTeamSession(data.id);
  const { data: team } = await supabaseAdmin().from('teams').select('id').eq('department_id', data.id).maybeSingle();
  if (team) await setRulesAccepted(data.id);
  return NextResponse.json(
    { ok: true, department: data.name, hasTeam: !!team },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
