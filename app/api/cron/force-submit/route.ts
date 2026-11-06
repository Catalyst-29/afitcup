import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { data: teams, error: teamsError } = await sb.from('teams').select('id').eq('final_submitted', false);
  if (teamsError) return NextResponse.json({ error: teamsError.message }, { status: 500 });

  let submitted = 0;
  for (const team of teams || []) {
    const { count, error: countError } = await sb.from('players').select('*', { count: 'exact', head: true }).eq('team_id', team.id).eq('status', 'approved');
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
    if (!count) continue;
    const { error: playersError } = await sb.from('players').update({ included_in_final_submission: true }).eq('team_id', team.id).eq('status', 'approved');
    if (playersError) return NextResponse.json({ error: playersError.message }, { status: 500 });
    const { error: updateError } = await sb.from('teams').update({ final_submitted: true, force_submitted: true, submitted_at: new Date().toISOString(), status: 'pending', rejection_reason: null }).eq('id', team.id).eq('final_submitted', false);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    submitted += 1;
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  return NextResponse.json({ ok: true, submitted });
}
