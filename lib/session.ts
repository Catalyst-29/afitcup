import crypto from 'crypto';
import { cookies } from 'next/headers';

const TEAM_COOKIE = 'competition_team';
const ADMIN_COOKIE = 'competition_admin';
const RULES_COOKIE = 'competition_rules_accepted';
const LONG_LIVED_SESSION_SECONDS = 60 * 60 * 24 * 400;

function secret() {
  const s = process.env.APP_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('APP_SESSION_SECRET must be at least 32 characters');
  return s;
}

function sign(value: string) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}
function token(value: string) { return `${value}.${sign(value)}`; }
function verify(raw?: string) {
  if (!raw) return null;
  const i = raw.lastIndexOf('.');
  if (i < 1) return null;
  const value = raw.slice(0, i); const sig = raw.slice(i + 1);
  const expected = sign(value);
  if (sig.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? value : null;
}

export async function setTeamSession(departmentId: string) {
  const store = await cookies();
  store.set(TEAM_COOKIE, token(departmentId), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: LONG_LIVED_SESSION_SECONDS });
}
export async function getTeamSession() { return verify((await cookies()).get(TEAM_COOKIE)?.value); }
export async function setRulesAccepted(departmentId: string) {
  const store = await cookies();
  const current = verify(store.get(RULES_COOKIE)?.value);
  const accepted = new Set(current?.startsWith('rules:') ? current.slice(6).split(',').filter(Boolean) : current ? [current] : []);
  accepted.add(departmentId);
  store.set(RULES_COOKIE, token(`rules:${Array.from(accepted).join(',')}`), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
}
export async function hasAcceptedRules(departmentId: string) {
  const value = verify((await cookies()).get(RULES_COOKIE)?.value);
  if (value === departmentId) return true;
  return value?.startsWith('rules:') ? value.slice(6).split(',').includes(departmentId) : false;
}
export async function clearTeamSession() { (await cookies()).delete(TEAM_COOKIE); }
export async function setAdminSession() { (await cookies()).set(ADMIN_COOKIE, token('admin'), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 8 }); }
export async function isAdmin() { return verify((await cookies()).get(ADMIN_COOKIE)?.value) === 'admin'; }
export async function clearAdminSession() { (await cookies()).delete(ADMIN_COOKIE); }
