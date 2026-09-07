'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronRight, ClipboardCheck, Download, Footprints, Hand, LayoutDashboard, LogOut, Menu, Search, Shield, ShieldCheck, Shirt, UserCheck, Users, X } from 'lucide-react';
import BrandLink from '../components/BrandLink';
import DashboardBrand from '../components/DashboardBrand';

const Status = ({ value }: { value: string }) => <span className={`status ${value}`}>{value}</span>;
const UserCheckIcon = UserCheck;
const effectiveTeamStatus = (team: any) => team.status === 'rejected' ? 'rejected' : team.status === 'approved' && team.players.length > 0 && team.players.every((player: any) => player.status === 'approved') ? 'approved' : 'pending';

export default function AdminClient({ authenticated, teams }: { authenticated: boolean; teams: any[] }) {
  const router = useRouter();
  const [departments, setDepartments] = useState(teams);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [reason, setReason] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'departments' | 'players' | 'approvals'>('dashboard');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [playerStatusFilter, setPlayerStatusFilter] = useState('all');
  const [playerPositionFilter, setPlayerPositionFilter] = useState('all');
  const [playerDepartmentFilter, setPlayerDepartmentFilter] = useState('all');
  const [approvalTab, setApprovalTab] = useState<'players' | 'teams'>('players');
  const [approvalPlayer, setApprovalPlayer] = useState<any | null>(null);

  useEffect(() => {
    setDepartments(teams);
    setSelectedId((current) => current && teams.some((team) => team.id === current) ? current : null);
  }, [teams]);
  useEffect(() => { setSelectedId(null); }, [activeView]);
  useEffect(() => {
    if (!approvalPlayer) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setApprovalPlayer(null); };
    document.addEventListener('keydown', closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.style.overflow = previousOverflow; };
  }, [approvalPlayer]);

  const visibleDepartments = useMemo(
    () => departments.filter((team) => team.departments.name.toLowerCase().includes(query.trim().toLowerCase()) && (activeView !== 'approvals' || (team.final_submitted && (effectiveTeamStatus(team) === 'pending' || team.players.some((player: any) => player.status === 'pending'))))).sort((a, b) => a.departments.name.localeCompare(b.departments.name)),
    [departments, query, activeView],
  );
  const selected = departments.find((team) => team.id === selectedId) || null;
  const selectedApproved = selected?.players.filter((player: any) => player.status === 'approved').length || 0;
  const selectedPending = selected?.players.filter((player: any) => player.status === 'pending').length || 0;
  const selectedRejected = selected?.players.filter((player: any) => player.status === 'rejected').length || 0;
  const selectedPositions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'].map((position) => ({ position, count: selected?.players.filter((player: any) => player.position === position).length || 0 }));
  const pendingTeams = departments.filter((team) => team.final_submitted && effectiveTeamStatus(team) === 'pending').length;
  const allPlayers = departments.flatMap((team) => team.players);
  const totalPlayers = allPlayers.length;
  const approvedPlayers = allPlayers.filter((player: any) => player.status === 'approved').length;
  const pendingPlayers = allPlayers.filter((player: any) => player.status === 'pending').length;
  const rejectedPlayers = allPlayers.filter((player: any) => player.status === 'rejected').length;
  const approvedPercent = totalPlayers ? approvedPlayers / totalPlayers * 100 : 0;
  const pendingPercent = totalPlayers ? pendingPlayers / totalPlayers * 100 : 0;
  const playerRows = useMemo(() => departments.flatMap((team) => team.players.map((player: any) => ({ ...player, departmentName: team.departments.name, departmentLogo: team.logo_url, teamId: team.id }))).filter((player: any) => { const search = query.trim().toLowerCase(); return (!search || `${player.first_name} ${player.last_name} ${player.departmentName}`.toLowerCase().includes(search)) && (playerStatusFilter === 'all' || player.status === playerStatusFilter) && (playerPositionFilter === 'all' || player.position === playerPositionFilter) && (playerDepartmentFilter === 'all' || player.teamId === playerDepartmentFilter); }).sort((a: any,b: any) => playerDepartmentFilter !== 'all' ? Number(a.jersey_number) - Number(b.jersey_number) : `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)), [departments, query, playerStatusFilter, playerPositionFilter, playerDepartmentFilter]);
  useEffect(() => {
    if (activeView !== 'players') return;
    document.querySelectorAll<HTMLElement>('.admin-player-table-card tbody td:nth-child(4)').forEach((cell) => {
      const position = cell.textContent?.trim().toLowerCase() || '';
      cell.classList.remove('position-goalkeeper', 'position-defender', 'position-midfielder', 'position-attacker');
      cell.classList.add(`position-${position}`);
    });
  }, [activeView, playerRows]);

  const positionGroups = [
    { label: 'Goalkeepers', position: 'Goalkeeper', color: '#07883d', Icon: Hand },
    { label: 'Defenders', position: 'Defender', color: '#1674df', Icon: Shield },
    { label: 'Midfielders', position: 'Midfielder', color: '#7651b8', Icon: Shirt },
    { label: 'Attackers', position: 'Forward', color: '#ef2929', Icon: Footprints },
  ].map((group) => { const players = allPlayers.filter((player: any) => player.position === group.position); return { ...group, players, approved: players.filter((player: any) => player.status === 'approved').length, pending: players.filter((player: any) => player.status === 'pending').length, rejected: players.filter((player: any) => player.status === 'rejected').length }; });
  const pendingPlayerRows = departments.filter((team)=>team.final_submitted).flatMap((team) => team.players.filter((player:any)=>player.status==='pending').map((player:any)=>({...player,departmentName:team.departments.name,departmentLogo:team.logo_url,teamId:team.id}))).filter((player:any)=>{const search=query.trim().toLowerCase();return !search||`${player.first_name} ${player.last_name} ${player.departmentName}`.toLowerCase().includes(search);}).sort((a:any,b:any)=>a.departmentName.localeCompare(b.departmentName)||Number(a.jersey_number)-Number(b.jersey_number));
  const pendingTeamRows = departments.filter((team)=>team.final_submitted&&effectiveTeamStatus(team)==='pending').sort((a,b)=>a.departments.name.localeCompare(b.departments.name));

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: form.get('password') }) });
    const result = await response.json();
    if (!response.ok) setError(result.error); else router.refresh();
  }

  async function decide(type: 'team' | 'player', id: string, status: 'approved' | 'rejected', suppliedReason?: string) {
    setError('');
    setReviewing(id);
    try {
      const decisionReason = suppliedReason ?? reason[id] ?? '';
      const response = await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id, status, reason: decisionReason }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error); return; }
      setDepartments((current) => current.map((team) => {
        if (type === 'team' && team.id === id) return { ...team, status, rejection_reason: status === 'rejected' ? decisionReason || 'Registration needs correction.' : null };
        if (type !== 'player' || !team.players.some((player: any) => player.id === id)) return team;
        return { ...team, status: team.status === 'rejected' ? 'rejected' : 'pending', rejection_reason: team.status === 'rejected' ? team.rejection_reason : null, players: team.players.map((player: any) => player.id === id ? { ...player, status, rejection_reason: status === 'rejected' ? decisionReason || 'Registration needs correction.' : null } : player) };
      }));
      if (result.warning) setError(result.warning);
      setReason((current) => { const next = { ...current }; delete next[id]; return next; });
      router.refresh();
    } catch {
      setError('Unable to update this approval. Please try again.');
    } finally {
      setReviewing(null);
    }
  }

  async function logout() { if (!confirm('Are you sure you want to log out of the admin dashboard?')) return; await fetch('/api/admin-logout', { method: 'POST' }); router.refresh(); }

  if (!authenticated) return (
    <main className="shell admin-login-shell"><div className="stadium-wash"/><div className="container page-content"><nav className="nav admin-nav"><BrandLink /></nav><section className="admin-login-wrap"><div className="admin-login-copy"><span className="eyebrow"><ShieldCheck size={15}/> Secure administration</span><div className="kicker">AFIT competition control</div><h1>Registration<br/>Review Portal</h1><p>Review department registrations, verify player information and manage approval decisions.</p></div><form className="card login-card admin-login-card" onSubmit={login}><ShieldCheck className="admin-login-icon" size={30}/><div className="kicker">Administrator access</div><h2>Sign in to continue</h2><p>Enter the competition administrator password.</p><label className="label">Admin password</label><input name="password" className="input" type="password" required /><button className="btn full">Open dashboard</button>{error && <div className="error">{error}</div>}</form></section></div></main>
  );

  return (
    <main className="admin-dashboard-shell">
      {navigationOpen&&<button className="admin-nav-backdrop" type="button" onClick={()=>setNavigationOpen(false)} aria-label="Close admin navigation"/>}<aside className={`admin-app-sidebar${navigationOpen?' open':''}`}><button className="admin-nav-close" type="button" onClick={()=>setNavigationOpen(false)} aria-label="Close navigation"><X/></button><DashboardBrand/><div className="admin-sidebar-label">Main</div><nav><button className={activeView==='dashboard'?'active':''} type="button" onClick={()=>{setActiveView('dashboard');setNavigationOpen(false)}}><LayoutDashboard/> Dashboard</button><button className={activeView==='departments'?'active':''} type="button" onClick={()=>{setActiveView('departments');setNavigationOpen(false)}}><Building2/> Departments</button><button className={activeView==='players'?'active':''} type="button" onClick={()=>{setActiveView('players');setNavigationOpen(false)}}><Users/> Players</button><button className={activeView==='approvals'?'active':''} type="button" onClick={()=>{setActiveView('approvals');setNavigationOpen(false)}}><ClipboardCheck/> Approvals</button></nav><button type="button" onClick={logout}><LogOut/> Logout</button></aside><footer className="admin-mobile-footer" aria-label="Admin navigation"><button className={activeView==='dashboard'?'active':''} type="button" onClick={()=>setActiveView('dashboard')}><LayoutDashboard/><span>Dashboard</span></button><button className={activeView==='departments'?'active':''} type="button" onClick={()=>setActiveView('departments')}><Building2/><span>Departments</span></button><button className={activeView==='players'?'active':''} type="button" onClick={()=>setActiveView('players')}><Users/><span>Players</span></button><button className={activeView==='approvals'?'active':''} type="button" onClick={()=>setActiveView('approvals')}><ClipboardCheck/><span>Approvals</span></button></footer>
      <div className="admin-app-main"><header className="admin-app-topbar"><div className="admin-topbar-brand"><button type="button" onClick={()=>setNavigationOpen(true)} aria-label="Open admin navigation" aria-expanded={navigationOpen}><Menu/></button><BrandLink/></div><div className="admin-topbar-title"><b><i/> {activeView==='dashboard'?'Admin Dashboard':activeView.charAt(0).toUpperCase()+activeView.slice(1)}</b></div><label><Search/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search departments, players..."/></label><span>AD</span><strong>Admin<button className="admin-topbar-logout" type="button" onClick={logout}>Logout</button></strong></header><div className={`admin-content admin-view-${activeView}`} id="admin-overview">
        <header className="dash-head admin-dashboard-heading"><div className="kicker">Overview</div><h1>Competition Administration</h1></header>
        {error && <div className="error" style={{ marginBottom: 18 }}>{error}</div>}
        <section className="admin-analytics-row"><div className="card admin-registration-progress"><h2>Registration Progress</h2><div className="admin-donut" style={{background:`conic-gradient(#07813b 0 ${approvedPercent}%, #f3b51b ${approvedPercent}% ${approvedPercent+pendingPercent}%, #d64545 ${approvedPercent+pendingPercent}% 100%)`}}><span><b>{totalPlayers}</b><small>Total Players</small></span></div><ul><li><i/> Approved <b>{approvedPlayers}</b></li><li><i/> Pending <b>{pendingPlayers}</b></li><li><i/> Rejected <b>{rejectedPlayers}</b></li></ul></div><div className="card admin-department-progress"><div className="department-progress-heading"><h2>Department Registration Status</h2><span><i className="approved-segment"/>Approved <i className="pending-segment"/>Pending <i className="rejected-segment"/>Rejected</span></div>{[...departments].sort((a,b)=>a.departments.name.localeCompare(b.departments.name)).map((team)=>{const approved=team.players.filter((player:any)=>player.status==='approved').length;const pending=team.players.filter((player:any)=>player.status==='pending').length;const rejected=team.players.filter((player:any)=>player.status==='rejected').length;return <div key={team.id}><span>{team.departments.name}</span><i className="department-status-track"><b className="approved-segment" style={{width:`${approved/25*100}%`}}/><b className="pending-segment" style={{width:`${pending/25*100}%`}}/><b className="rejected-segment" style={{width:`${rejected/25*100}%`}}/></i><strong><em className="approved-count">{approved}</em><em className="pending-count">{pending}</em><em className="rejected-count">{rejected}</em></strong></div>})}</div></section>

        <section className="card admin-position-card"><h2>Players by Position <span>(Overall Registered Position)</span></h2><div className="admin-position-grid">{positionGroups.map(({label,color,Icon,players})=>{const share=totalPlayers?players.length/totalPlayers*100:0;return <article key={label} style={{'--position-color':color} as React.CSSProperties}><Icon/><h3>{label}</h3><b>{players.length}</b><strong>{share.toFixed(1)}%</strong><div className="position-ring" style={{background:`conic-gradient(${color} 0 ${share}%, #e9edef ${share}% 100%)`}}><i/></div></article>})}</div></section>

        {(activeView==='players'||activeView==='approvals')&&<header className="dash-head admin-view-heading"><div className="kicker">{activeView==='approvals'?'Pending review':'Player directory'}</div><h1>{activeView==='approvals'?'Approvals':'Registered Players'}</h1></header>}
        {activeView==='players'&&<PlayerPositionOverview groups={positionGroups} total={totalPlayers}/>} 
        {activeView==='players'&&<section className="admin-players-dashboard"><div className="admin-player-metrics"><article><Users/><span><b>{totalPlayers}</b><small>Total Players</small></span></article><article><UserCheckIcon/><span><b>{approvedPlayers}</b><small>Approved</small></span></article><article><ClipboardCheck/><span><b>{pendingPlayers}</b><small>Pending Approval</small></span></article><article><ShieldCheck/><span><b>{rejectedPlayers}</b><small>Rejected</small></span></article><article><Building2/><span><b>{departments.length}</b><small>Teams Created</small></span></article></div><div className="card admin-player-filters"><label><Search/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search player or department"/></label><select value={playerDepartmentFilter} onChange={(event)=>setPlayerDepartmentFilter(event.target.value)}><option value="all">All Departments</option>{[...departments].sort((a,b)=>a.departments.name.localeCompare(b.departments.name)).map(team=><option key={team.id} value={team.id}>{team.departments.name}</option>)}</select><select value={playerStatusFilter} onChange={(event)=>setPlayerStatusFilter(event.target.value)}><option value="all">All Statuses</option><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select><select value={playerPositionFilter} onChange={(event)=>setPlayerPositionFilter(event.target.value)}><option value="all">All Positions</option><option>Goalkeeper</option><option>Defender</option><option>Midfielder</option><option value="Forward">Attacker</option></select></div><div className="admin-player-layout"><section className="card admin-player-table-card"><h2>Players List <span>({playerRows.length})</span></h2><div className="admin-player-table-wrap"><table><thead><tr><th>Player</th><th>Department</th><th>Jersey No.</th><th>Position</th><th>Status</th></tr></thead><tbody>{playerRows.map((player:any)=><tr key={player.id}><td><div className="admin-table-player"><img src={player.photo_url} alt=""/><span><b>{player.first_name} {player.last_name}</b><small>ID: {String(player.id).slice(0,8).toUpperCase()}</small></span></div></td><td><div className="admin-table-department">{player.departmentLogo?<img src={player.departmentLogo} alt=""/>:<span>{player.departmentName.charAt(0)}</span>}<b>{player.departmentName}</b></div></td><td>{String(player.jersey_number).padStart(2,'0')}</td><td>{player.position==='Forward'?'Attacker':player.position}</td><td><Status value={player.status}/></td></tr>)}</tbody></table>{playerRows.length===0&&<p className="empty-state">No players match the selected filters.</p>}</div></section><aside className="card players-by-department"><h2>Players by Department</h2>{[...departments].sort((a,b)=>b.players.length-a.players.length).map(team=><div key={team.id}><span>{team.departments.name}</span><i><b style={{width:`${totalPlayers?team.players.length/Math.max(...departments.map(item=>item.players.length),1)*100:0}%`}}/></i><strong>{team.players.length}</strong></div>)}</aside></div></section>}
        {activeView==='approvals'&&<section className="admin-approvals-dashboard"><div className="admin-approval-metrics"><article><ClipboardCheck/><span><b>{pendingPlayers}</b><small>Pending Players</small></span></article><article><Building2/><span><b>{pendingTeams}</b><small>Pending Teams</small></span></article><article><Users/><span><b>{pendingPlayers+pendingTeams}</b><small>Total Pending</small></span></article><article><UserCheck/><span><b>{approvedPlayers}</b><small>Approved</small></span></article><article><ShieldCheck/><span><b>{rejectedPlayers}</b><small>Rejected</small></span></article></div><div className="admin-approval-layout"><section className="card admin-approval-main"><div className="approval-tabs"><button className={approvalTab==='players'?'active':''} type="button" onClick={()=>setApprovalTab('players')}>Pending Players ({pendingPlayers})</button><button className={approvalTab==='teams'?'active':''} type="button" onClick={()=>setApprovalTab('teams')}>Pending Teams ({pendingTeams})</button></div><label className="approval-search"><Search/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search player, team, or department"/></label>{approvalTab==='players'?<div className="approval-table-wrap"><table><thead><tr><th>Player</th><th>Department</th><th>Position</th><th>Jersey No.</th><th>Actions</th></tr></thead><tbody>{pendingPlayerRows.map((player:any)=><tr className="approval-player-row" key={player.id} tabIndex={0} role="button" aria-label={`View ${player.first_name} ${player.last_name}'s registration`} onClick={()=>setApprovalPlayer(player)} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setApprovalPlayer(player)}}}><td><div className="admin-table-player"><img src={player.photo_url} alt=""/><span><b>{player.first_name} {player.last_name}</b><small>ID: {String(player.id).slice(0,8).toUpperCase()}</small></span></div></td><td><div className="admin-table-department">{player.departmentLogo?<img src={player.departmentLogo} alt=""/>:<span>{player.departmentName.charAt(0)}</span>}<b>{player.departmentName}</b></div></td><td>{player.position==='Forward'?'Attacker':player.position}</td><td>{String(player.jersey_number).padStart(2,'0')}</td><td><div className="approval-actions" onClick={(event)=>event.stopPropagation()}><button type="button" disabled={reviewing===player.id} onClick={()=>decide('player',player.id,'approved')}>✓ Approve</button><button type="button" disabled={reviewing===player.id} onClick={()=>{const message=window.prompt('Enter rejection reason:');if(message!==null)decide('player',player.id,'rejected',message)}}>× Reject</button></div></td></tr>)}</tbody></table>{pendingPlayerRows.length===0&&<p className="empty-state">No pending players found.</p>}</div>:<div className="pending-team-list">{pendingTeamRows.filter(team=>!query.trim()||team.departments.name.toLowerCase().includes(query.trim().toLowerCase())).map(team=><article key={team.id}>{team.logo_url?<img src={team.logo_url} alt=""/>:<span>{team.departments.name.charAt(0)}</span>}<div><b>{team.departments.name}</b><small>{team.players.length}/25 players · {team.players.filter((player:any)=>player.status==='pending').length} pending</small></div><div className="approval-actions"><button type="button" disabled={reviewing===team.id||team.players.length===0||!team.players.every((player:any)=>player.status==='approved')} onClick={()=>decide('team',team.id,'approved')}>✓ Approve Team</button><button type="button" disabled={reviewing===team.id} onClick={()=>{const message=window.prompt('Enter team rejection reason:');if(message!==null)decide('team',team.id,'rejected',message)}}>× Reject Team</button></div></article>)}</div>}</section><aside><section className="card approval-guidelines"><h2>Approval Guidelines</h2><p><ShieldCheck/> Review all player information carefully.</p><p><Building2/> Verify the correct department.</p><p><Shirt/> Check position and jersey number.</p><p><ClipboardCheck/> Approve or reject with a clear decision.</p></section><section className="card approval-position-distribution"><h2>Position Distribution</h2>{positionGroups.map(group=>{const count=group.players.filter((player:any)=>player.status==='pending').length;return <div key={group.label}><i style={{background:group.color}}/><span>{group.label}</span><b>{count}</b></div>})}</section></aside></div></section>}
        <section className={`admin-browser ${selected ? 'has-selection' : 'departments-only'}`} id="departments">
          <aside className="card department-list">
            <div className="section-title"><div><div className="kicker">Department directory</div></div><span className="status pending">{departments.length}</span></div>
            <label className="department-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search departments" /></label>
            <div className="department-items">
              {visibleDepartments.length === 0 && <div className="muted empty-state">No department found.</div>}
              {visibleDepartments.map((team) => {
                return <button key={team.id} className={`department-item ${selectedId === team.id ? 'active' : ''}`} onClick={() => setSelectedId(team.id)}>{team.logo_url ? <img src={team.logo_url} alt="" /> : <span className="department-fallback">{team.departments.name.charAt(0)}</span>}<span><b>{team.departments.name}</b></span><Status value={effectiveTeamStatus(team)} /></button>;
              })}
            </div>
          </aside>

          {selected && <div className="department-detail">
            <>
              <nav className="admin-breadcrumb" aria-label="Breadcrumb"><button type="button" onClick={()=>setActiveView('dashboard')}>Dashboard</button><ChevronRight/><button type="button" onClick={()=>setSelectedId(null)}>Departments</button><ChevronRight/><b>{selected.departments.name}</b></nav>
              <section className="card team-review">
                <div className="team-review-head">{selected.logo_url && <img src={selected.logo_url} alt={`${selected.departments.name} logo`} />}<div><div className="kicker">Department registration</div><h2>{selected.departments.name}</h2><div className="meta">{selected.players.length}/25 registered players</div></div><Status value={effectiveTeamStatus(selected)} /></div>
                {selected.rejection_reason && <div className="reason">Team decision: {selected.rejection_reason}</div>}
                <div className="actions team-review-actions">
                  {!selected.final_submitted?<div className="review-notice">This team has not submitted its registration. Approval actions are unavailable.</div>:effectiveTeamStatus(selected) === 'pending' && <><button className="btn tiny" title={selected.players.every((player: any) => player.status === 'approved') ? '' : 'Approve every player first'} disabled={reviewing === selected.id || selected.players.length === 0 || !selected.players.every((player: any) => player.status === 'approved')} onClick={() => decide('team', selected.id, 'approved')}>Approve team</button><button className="btn danger tiny" disabled={reviewing === selected.id} onClick={() => decide('team', selected.id, 'rejected')}>Reject team</button><input className="input" placeholder="Team rejection reason" value={reason[selected.id] || ''} onChange={(event) => setReason({ ...reason, [selected.id]: event.target.value })} /></>}
                  <a className="btn secondary tiny" href={`/api/download?team=${selected.id}`}><Download size={14} /> Download information</a>
                </div>
              </section>

              <section className="admin-selected-analytics"><div className="card selected-squad-card"><h3>Squad Overview</h3><div className="selected-squad-content"><div className="selected-squad-donut" style={{background:`conic-gradient(#07883d 0 ${selected.players.length?selectedApproved/selected.players.length*100:0}%,#f3b51b 0 ${selected.players.length?(selectedApproved+selectedPending)/selected.players.length*100:0}%,#d64545 0 100%)`}}><i/><span><b>{selected.players.length}</b><small>Total Players</small></span></div><ul><li><i/>Approved <b>{selectedApproved}</b></li><li><i/>Pending <b>{selectedPending}</b></li><li><i/>Rejected <b>{selectedRejected}</b></li></ul></div><div className="selected-squad-limits"><span><b>20</b>Minimum Required</span><span><b>25</b>Maximum Allowed</span><span><b>{Math.max(0,25-selected.players.length)}</b>Slots Available</span></div></div><div className="card selected-position-card"><h3>Player Positions</h3><div className="selected-position-bars">{selectedPositions.map(({position,count})=><div key={position}><b>{count}</b><i><span style={{height:`${Math.max(5,count/Math.max(1,...selectedPositions.map(item=>item.count))*100)}%`}}/></i><small>{position==='Forward'?'Attacker':position}</small></div>)}</div></div></section>

              <div className="detail-heading"><div><div className="kicker">Squad review</div><h2>Registered players</h2></div><span className="status pending">{selected.players.filter((player: any) => player.status === 'pending').length} pending</span></div>
              <div className="admin-player-list">
                {selected.players.length === 0 && <div className="card muted">No players have been registered by this department.</div>}
                {[...selected.players].sort((a:any,b:any)=>Number(a.jersey_number)-Number(b.jersey_number)).map((player: any) => <article className="card review-player" key={player.id}><img src={player.photo_url} alt={`${player.first_name} ${player.last_name}`} /><div className="review-player-info"><div className="player-name">#{player.jersey_number} · {player.first_name} {player.last_name}</div><div className="meta">{player.position} · {player.height_cm}cm · {player.preferred_foot} foot · {player.nationality}</div><Status value={player.status} />{player.rejection_reason && <div className="reason">{player.rejection_reason}</div>}</div><div className="review-player-actions">{selected.final_submitted&&player.status === 'pending' && <><input className="input" placeholder="Rejection reason" value={reason[player.id] || ''} onChange={(event) => setReason({ ...reason, [player.id]: event.target.value })} /><div className="actions"><button className="btn tiny" disabled={reviewing === player.id} onClick={() => decide('player', player.id, 'approved')}>Approve</button><button className="btn danger tiny" disabled={reviewing === player.id} onClick={() => decide('player', player.id, 'rejected')}>Reject</button></div></>}<a className="btn tiny" href={`/api/player-card?id=${player.id}`}><Download size={14} /> Player card</a><a className="btn secondary tiny" href={`/api/photo?id=${player.id}`}><Download size={14} /> Original photo</a></div></article>)}
              </div>
            </>
          </div>}
        </section>
      </div></div>
      {approvalPlayer&&<div className="approval-player-backdrop" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setApprovalPlayer(null)}}><section className="approval-player-modal" role="dialog" aria-modal="true" aria-labelledby="approval-player-title"><button className="approval-player-close" type="button" onClick={()=>setApprovalPlayer(null)} aria-label="Close player details"><X/></button><header><span>Player registration</span><h2 id="approval-player-title">Review player information</h2></header><div className="approval-player-profile"><img src={approvalPlayer.photo_url} alt={`${approvalPlayer.first_name} ${approvalPlayer.last_name}`}/><div><span className="approval-player-jersey">#{String(approvalPlayer.jersey_number).padStart(2,'0')}</span><h3>{approvalPlayer.first_name} {approvalPlayer.last_name}</h3><p>ID: {String(approvalPlayer.id).toUpperCase()}</p><Status value={approvalPlayer.status}/></div></div><dl className="approval-player-details"><div><dt>First name</dt><dd>{approvalPlayer.first_name}</dd></div><div><dt>Last name</dt><dd>{approvalPlayer.last_name}</dd></div><div><dt>Department / Team</dt><dd>{approvalPlayer.departmentName}</dd></div><div><dt>Date of birth</dt><dd>{new Date(`${approvalPlayer.date_of_birth}T00:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</dd></div><div><dt>Nationality</dt><dd>{approvalPlayer.nationality}</dd></div><div><dt>Position</dt><dd>{approvalPlayer.position==='Forward'?'Attacker':approvalPlayer.position}</dd></div><div><dt>Jersey number</dt><dd>{String(approvalPlayer.jersey_number).padStart(2,'0')}</dd></div><div><dt>Height</dt><dd>{approvalPlayer.height_cm} cm</dd></div><div><dt>Preferred foot</dt><dd>{approvalPlayer.preferred_foot}</dd></div><div><dt>Registered on</dt><dd>{new Date(approvalPlayer.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</dd></div></dl><footer><a href={`/api/photo?id=${approvalPlayer.id}`}><Download/> Original photo</a><div className="approval-actions"><button type="button" disabled={reviewing===approvalPlayer.id} onClick={async()=>{await decide('player',approvalPlayer.id,'approved');setApprovalPlayer(null)}}>✓ Approve</button><button type="button" disabled={reviewing===approvalPlayer.id} onClick={async()=>{const message=window.prompt('Enter rejection reason:');if(message!==null){await decide('player',approvalPlayer.id,'rejected',message);setApprovalPlayer(null)}}}>× Reject</button></div></footer></section></div>}
    </main>
  );
}

function PlayerPositionOverview({groups,total}:{groups:any[];total:number}){
  let running=0;
  const stops=groups.map((group)=>{const start=total?running/total*100:0;running+=group.players.length;const end=total?running/total*100:0;return `${group.color} ${start}% ${end}%`}).join(',');
  return <section className="card player-position-overview">
    <h2>Players by Position <span>(Overall Registered Position)</span></h2>
    <div className="player-position-overview-content">
      <div className="player-position-summary-grid">{groups.map(({label,color,Icon,players,approved,pending,rejected})=>{const share=total?players.length/total*100:0;return <article key={label} style={{'--position-color':color} as React.CSSProperties}>
        <div className="position-summary-head"><Icon/><span><b>{label}</b><strong>{players.length}</strong><small>{share.toFixed(1)}%</small></span><div className="position-mini-ring" style={{background:`conic-gradient(${color} 0 ${share}%,#e8edeb ${share}% 100%)`}}><i/></div></div>
        <dl><div><dt>Approved</dt><dd>{approved}</dd></div><div><dt>Pending</dt><dd>{pending}</dd></div><div><dt>Rejected</dt><dd>{rejected}</dd></div></dl>
      </article>})}</div>
      <div className="position-total-summary"><div className="position-total-ring" style={{background:`conic-gradient(${stops||'#e8edeb 0 100%'})`}}><i/><span><b>{total}</b><small>Total Players</small></span></div><ul>{groups.map((group)=>{const share=total?group.players.length/total*100:0;return <li key={group.label}><i style={{background:group.color}}/><span>{group.label}</span><b>{group.players.length}</b><small>({share.toFixed(1)}%)</small></li>})}</ul></div>
    </div>
  </section>;
}
