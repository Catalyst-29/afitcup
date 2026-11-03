import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { isAdmin } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import { GET as generatePlayerCard } from '../player-card/route';

export const runtime = 'nodejs';
// A complete team export can include 25 photos and 25 generated player cards.
// Keep this above the default serverless request duration where the host supports it.
export const maxDuration = 60;

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function safeName(value: unknown) {
  return String(value ?? '').trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

async function runWithConcurrency<T>(items: T[], limit: number, work: (item: T) => Promise<void>) {
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      await work(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const teamId = new URL(req.url).searchParams.get('team');
  if (!teamId) return NextResponse.json({ error: 'Missing team.' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: team, error: teamError } = await sb
    .from('teams')
    .select('id,departments(name)')
    .eq('id', teamId)
    .maybeSingle();
  if (teamError || !team) return NextResponse.json({ error: teamError?.message || 'Team not found.' }, { status: 404 });
  const departmentRelation = Array.isArray(team.departments) ? team.departments[0] : team.departments;
  const departmentName = departmentRelation?.name || 'Department';

  const { data: players, error: playersError } = await sb
    .from('players')
    .select('id,first_name,last_name,nationality,date_of_birth,jersey_number,position,height_cm,preferred_foot,status,rejection_reason,photo_path,created_at')
    .eq('team_id', teamId)
    .order('jersey_number');
  if (playersError) return NextResponse.json({ error: playersError.message }, { status: 500 });

  const registeredPlayers = players || [];
  const zip = new JSZip();
  const cardsFolder = zip.folder('player-cards');
  const photosFolder = zip.folder('player-photos');
  const informationFolder = zip.folder('registered-player-information');
  const headers = ['Player ID', 'First Name', 'Last Name', 'Nationality', 'Date of Birth', 'Jersey Number', 'Position', 'Height (cm)', 'Preferred Foot', 'Status', 'Rejection Reason', 'Registered At', 'Photo Filename', 'Card Filename'];
  const rows = registeredPlayers.map((player) => [
    player.id, player.first_name, player.last_name, player.nationality, player.date_of_birth,
    player.jersey_number, player.position, player.height_cm, player.preferred_foot, player.status,
    player.rejection_reason || '', player.created_at,
    `${String(player.jersey_number).padStart(2, '0')}-${safeName(player.first_name)}-${safeName(player.last_name)}.${String(player.photo_path).toLowerCase().endsWith('.png') ? 'png' : 'jpg'}`,
    `${String(player.jersey_number).padStart(2, '0')}-${safeName(player.first_name)}-${safeName(player.last_name)}-player-card.png`,
  ].map(csvCell).join(','));
  const notes: string[] = [];

  await runWithConcurrency(registeredPlayers, 4, async (player) => {
    const baseName = `${String(player.jersey_number).padStart(2, '0')}-${safeName(player.first_name)}-${safeName(player.last_name)}`;
    const extension = String(player.photo_path).toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    const photoFilename = `${baseName}.${extension}`;
    const cardFilename = `${baseName}-player-card.png`;
    informationFolder?.file(`${baseName}.txt`, [
      `Player ID: ${player.id}`,
      `Name: ${player.first_name} ${player.last_name}`,
      `Department: ${departmentName}`,
      `Nationality: ${player.nationality}`,
      `Date of Birth: ${player.date_of_birth}`,
      `Jersey Number: ${player.jersey_number}`,
      `Position: ${player.position}`,
      `Height: ${player.height_cm} cm`,
      `Preferred Foot: ${player.preferred_foot}`,
      `Status: ${player.status}`,
      `Rejection Reason: ${player.rejection_reason || 'None'}`,
      `Registered At: ${player.created_at}`,
    ].join('\r\n'));

    const { data: photo, error: photoError } = await sb.storage.from('competition-files').download(player.photo_path);
    if (photoError || !photo) notes.push(`${player.first_name} ${player.last_name}: ${photoError?.message || 'Photo unavailable'}`);
    else photosFolder?.file(photoFilename, Buffer.from(await photo.arrayBuffer()));

    const cardUrl = new URL('/api/player-card', req.url); cardUrl.searchParams.set('id', player.id);
    const cardResponse = await generatePlayerCard(new Request(cardUrl, { headers: req.headers }));
    if (cardResponse.ok) cardsFolder?.file(cardFilename, Buffer.from(await cardResponse.arrayBuffer()));
    else notes.push(`${player.first_name} ${player.last_name}: player card could not be generated`);
  });

  informationFolder?.file('all-registered-players.csv', [headers.map(csvCell).join(','), ...rows].join('\r\n'));
  informationFolder?.file('README.txt', `${departmentName}\r\nRegistered player information export\r\n\r\nRegistered players: ${registeredPlayers.length}\r\nGenerated: ${new Date().toISOString()}\r\n${notes.length ? `\r\nExport notes:\r\n${notes.join('\r\n')}` : ''}`);

  const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const filename = `${safeName(departmentName)}-registered-player-information.zip`;
  return new NextResponse(new Uint8Array(archive), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
