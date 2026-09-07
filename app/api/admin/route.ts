import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import { statusSchema } from '@/lib/validation';

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const status = statusSchema.safeParse(body.status);
  if (!status.success || status.data === 'pending') {
    return NextResponse.json({ error: 'Invalid approval decision.' }, { status: 400 });
  }

  const table = body.type === 'team' ? 'teams' : body.type === 'player' ? 'players' : null;
  if (!table) return NextResponse.json({ error: 'Invalid type.' }, { status: 400 });

  const sb = supabaseAdmin();
  if (table === 'teams') {
    const { data: team, error: teamError } = await sb.from('teams').select('final_submitted').eq('id', body.id).maybeSingle();
    if (teamError) return NextResponse.json({ error: teamError.message }, { status: 500 });
    if (!team) return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    if (!team.final_submitted) return NextResponse.json({ error: 'This team has not submitted its registration for review.' }, { status: 403 });
  } else {
    const { data: player, error: playerError } = await sb.from('players').select('teams!inner(final_submitted)').eq('id', body.id).maybeSingle();
    if (playerError) return NextResponse.json({ error: playerError.message }, { status: 500 });
    if (!player) return NextResponse.json({ error: 'Player not found.' }, { status: 404 });
    const playerTeam = Array.isArray(player.teams) ? player.teams[0] : player.teams;
    if (!playerTeam?.final_submitted) return NextResponse.json({ error: 'This player’s team has not submitted its registration for review.' }, { status: 403 });
  }

  if (table === 'teams' && status.data === 'approved') {
    const { count, error: countError } = await sb.from('players').select('*', { count: 'exact', head: true }).eq('team_id', body.id).neq('status', 'approved');
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
    if ((count || 0) > 0) return NextResponse.json({ error: 'Every player must be approved before the team can be approved.' }, { status: 400 });
  }

  const payload = {
    status: status.data,
    rejection_reason:
      status.data === 'rejected' ? String(body.reason || '').trim() || 'Registration needs correction.' : null,
  };
  const { data: updated, error } = await sb
    .from(table)
    .update(payload)
    .eq('id', body.id)
    .eq('status', 'pending')
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json({ error: 'This item has already been reviewed.' }, { status: 409 });
  }

  if (table === 'players' && updated.team_id) {
    await sb.from('teams').update({ status: 'pending', rejection_reason: null }).eq('id', updated.team_id).neq('status', 'rejected');
  }

  // Rejections reopen editing but do not overwrite the team's independent decision.
  let warning: string | undefined;
  if (status.data === 'rejected') {
    const teamId = table === 'teams' ? updated.id : updated.team_id;
    const { error: unlockError } = await sb.from('teams').update({ final_submitted: false }).eq('id', teamId);
    if (unlockError) warning = `Decision saved, but the registration could not be reopened: ${unlockError.message}`;
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  return NextResponse.json({ ok: true, warning });
}
