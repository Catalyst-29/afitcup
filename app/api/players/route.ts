import { NextResponse } from 'next/server'; import { getTeamSession } from '@/lib/session'; import { supabaseAdmin } from '@/lib/supabase'; import { playerSchema } from '@/lib/validation';
export async function POST(req: Request){
 const departmentId=await getTeamSession(); if(!departmentId) return NextResponse.json({error:'Session expired.'},{status:401}); const sb=supabaseAdmin(); const {data:team}=await sb.from('teams').select('*').eq('department_id',departmentId).maybeSingle(); if(!team) return NextResponse.json({error:'Register the team logo first.'},{status:400}); if(team.final_submitted) return NextResponse.json({error:'Registration is locked.'},{status:403});
 const {count}=await sb.from('players').select('*',{count:'exact',head:true}).eq('team_id',team.id); if((count||0)>=25) return NextResponse.json({error:'Maximum of 25 players reached.'},{status:400});
 const form=await req.formData(); const parsed=playerSchema.safeParse(Object.fromEntries(['first_name','last_name','date_of_birth','jersey_number','position','height_cm','preferred_foot'].map(k=>[k,form.get(k)]))); if(!parsed.success) return NextResponse.json({error:parsed.error.issues[0]?.message||'Invalid player details.'},{status:400});
 const file=form.get('photo'); if(!(file instanceof File)) return NextResponse.json({error:'JPEG player photo is required.'},{status:400}); if(!['image/jpeg','image/jpg'].includes(file.type)) return NextResponse.json({error:'Player photo must be JPEG/JPG.'},{status:400}); if(file.size>5*1024*1024) return NextResponse.json({error:'Player photo must be 5MB or smaller.'},{status:400});
 const dup=await sb.from('players').select('id').eq('team_id',team.id).eq('jersey_number',parsed.data.jersey_number).maybeSingle(); if(dup.data) return NextResponse.json({error:'This jersey number is already assigned to another player.'},{status:409});
 const ext='jpg'; const path=`teams/${departmentId}/players/${crypto.randomUUID()}.${ext}`; const up=await sb.storage.from('competition-files').upload(path,Buffer.from(await file.arrayBuffer()),{contentType:'image/jpeg'}); if(up.error) return NextResponse.json({error:up.error.message},{status:500});
 const {data,error}=await sb.from('players').insert({...parsed.data,nationality:'Nigeria',team_id:team.id,photo_path:path,status:'pending'}).select().single(); if(error){await sb.storage.from('competition-files').remove([path]); return NextResponse.json({error:error.message},{status:error.code==='23505'?409:500});} await sb.from('teams').update({status:'pending',rejection_reason:null}).eq('id',team.id).neq('status','rejected'); return NextResponse.json({ok:true,player:data});
}
export async function PATCH(req: Request){
 const departmentId=await getTeamSession(); if(!departmentId)return NextResponse.json({error:'Session expired.'},{status:401});
 const form=await req.formData(); const id=String(form.get('id')||''); const sb=supabaseAdmin();
 const {data:player}=await sb.from('players').select('*,teams!inner(department_id)').eq('id',id).maybeSingle();
 if(!player||player.teams.department_id!==departmentId)return NextResponse.json({error:'Player not found.'},{status:404});
 const parsed=playerSchema.safeParse(Object.fromEntries(['first_name','last_name','date_of_birth','jersey_number','position','height_cm','preferred_foot'].map(k=>[k,form.get(k)])));
 if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||'Invalid player details.'},{status:400});
 const duplicate=await sb.from('players').select('id').eq('team_id',player.team_id).eq('jersey_number',parsed.data.jersey_number).neq('id',id).maybeSingle();
 if(duplicate.data)return NextResponse.json({error:'This jersey number is already assigned to another player.'},{status:409});
 const photo=form.get('photo'); let photoPath=player.photo_path; let uploadedPath:string|null=null;
 if(photo instanceof File&&photo.size>0){
  if(!['image/jpeg','image/jpg'].includes(photo.type))return NextResponse.json({error:'Player photo must be JPEG/JPG.'},{status:400});
  if(photo.size>5*1024*1024)return NextResponse.json({error:'Player photo must be 5MB or smaller.'},{status:400});
  uploadedPath=`teams/${departmentId}/players/${crypto.randomUUID()}.jpg`;
  const upload=await sb.storage.from('competition-files').upload(uploadedPath,Buffer.from(await photo.arrayBuffer()),{contentType:'image/jpeg'});
  if(upload.error)return NextResponse.json({error:upload.error.message},{status:500}); photoPath=uploadedPath;
 }
 const {data,error}=await sb.from('players').update({...parsed.data,nationality:'Nigeria',photo_path:photoPath,status:'pending',rejection_reason:null}).eq('id',id).select().single();
 if(error){if(uploadedPath)await sb.storage.from('competition-files').remove([uploadedPath]);return NextResponse.json({error:error.message},{status:error.code==='23505'?409:500});}
 await sb.from('teams').update({status:'pending',rejection_reason:null}).eq('id',player.team_id).neq('status','rejected');
 if(uploadedPath&&player.photo_path)await sb.storage.from('competition-files').remove([player.photo_path]);
 return NextResponse.json({ok:true,player:data});
}
export async function DELETE(req: Request){ const departmentId=await getTeamSession(); if(!departmentId)return NextResponse.json({error:'Session expired.'},{status:401}); const {id}=await req.json(); const sb=supabaseAdmin(); const {data:p}=await sb.from('players').select('*,teams!inner(department_id,final_submitted)').eq('id',id).maybeSingle(); if(!p||p.teams.department_id!==departmentId)return NextResponse.json({error:'Not found.'},{status:404}); if(p.teams.final_submitted||p.status==='approved')return NextResponse.json({error:'This player cannot be deleted.'},{status:403}); await sb.from('players').delete().eq('id',id); if(p.photo_path)await sb.storage.from('competition-files').remove([p.photo_path]); return NextResponse.json({ok:true}); }
