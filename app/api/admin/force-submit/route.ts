import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const teamId = typeof body?.teamId === 'string' ? body.teamId : '';
  if (!teamId) return NextResponse.json({ error: 'A team is required.' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: team, error: teamError } = await sb
    .from('teams')
    .select('id, final_submitted')
    .eq('id', teamId)
    .maybeSingle();
  if (teamError) return NextResponse.json({ error: teamError.message }, { status: 500 });
  if (!team) return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
  if (team.final_submitted) return NextResponse.json({ error: 'This registration has already been submitted for review.' }, { status: 409 });

  const { count, error: playersError } = await sb
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('status', 'approved');
  if (playersError) return NextResponse.json({ error: playersError.message }, { status: 500 });
  if (!count) return NextResponse.json({ error: 'This department has no registered players to submit.' }, { status: 400 });

  const { error: playersUpdateError } = await sb
    .from('players')
    .update({ included_in_final_submission: true })
    .eq('team_id', teamId)
    .eq('status', 'approved');
  if (playersUpdateError) return NextResponse.json({ error: playersUpdateError.message }, { status: 500 });

  const { error: updateError } = await sb
    .from('teams')
    .update({
      final_submitted: true,
      force_submitted: true,
      submitted_at: new Date().toISOString(),
      status: 'pending',
      rejection_reason: null,
    })
    .eq('id', teamId)
    .eq('final_submitted', false);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  return NextResponse.json({ ok: true, playerCount: count });
}
