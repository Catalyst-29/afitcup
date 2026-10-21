'use client';

import { useState } from 'react';
import { ArrowRight, CalendarDays, LockKeyhole, MapPin, Trophy, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) {
      setError('Enter your department token to continue.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: cleanToken }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || 'Token verification failed. Please try again.');
        return;
      }
      router.push(result.hasTeam ? '/dashboard' : '/rules');
      router.refresh();
    } catch {
      setError('Unable to connect. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="cup-home">
    <header className="cup-header">
      <a className="cup-brand" href="/" aria-label="AFIT Cup home">
        <img src="/afit-logo-original.png" alt="Air Force Institute of Technology crest"/>
        <span><b>AFIT CUP</b><small>2026/2027 SESSION</small></span>
      </a>
      <a className="cup-admin-login" href="/admin"><LockKeyhole aria-hidden="true"/><span>Admin Login</span></a>
    </header>

    <section className="cup-scene">
      <div className="cup-hero">
        <p>AFIT FINAL YEAR COMPETITION</p>
        <h1><span>THE ROAD TO</span><strong>GLORY STARTS HERE.</strong></h1>
        <h2>16 DEPARTMENTS. ONE TROPHY. <Trophy aria-hidden="true"/></h2>
      </div>

      <section className="cup-facts" aria-label="Competition information">
        <article className="accent"><MapPin aria-hidden="true"/><b>AFIT STADIUM</b></article>
        <article><Users aria-hidden="true"/><b>20–25 PLAYERS</b></article>
        <article><CalendarDays aria-hidden="true"/><b>2026/2027</b></article>
      </section>

      <form className="cup-access" onSubmit={login} noValidate>
        <div className="cup-access-badge"><Users aria-hidden="true"/><span>DEPARTMENT ACCESS</span></div>
        <label htmlFor="department-token">Enter Dept. Token</label>
        <input id="department-token" name="token" value={token} onChange={(event) => setToken(event.target.value.toUpperCase())} placeholder="AFIT-X7Q9" autoCapitalize="characters" autoComplete="off" aria-describedby={error ? 'token-error' : undefined} aria-invalid={Boolean(error)}/>
        <button type="submit" disabled={loading}><span>{loading ? 'VERIFYING TOKEN…' : 'CONTINUE TO REGISTRATION'}</span><ArrowRight aria-hidden="true"/></button>
        <p className="cup-secure"><LockKeyhole aria-hidden="true"/> Secure access. Your data is protected.</p>
        <div className="cup-deadline"><CalendarDays aria-hidden="true"/><span><small>REGISTRATION CLOSES</small><b>30 OCT 2026</b></span></div>
        <div id="token-error" className={`cup-error${error ? ' visible' : ''}`} role="alert" aria-live="polite">{error}</div>
      </form>

      <img className="cup-football" src="/football-hero.png" alt="" aria-hidden="true"/>
    </section>

    <footer className="cup-footer">
      <p>FAIR PLAY <i/> TEAMWORK <i/> EXCELLENCE</p>
      <span><b>★</b><em/> AIR FORCE INSTITUTE OF TECHNOLOGY <i/> QUEST FOR EXCELLENCE <em/><b>★</b></span>
    </footer>
  </main>;
}
