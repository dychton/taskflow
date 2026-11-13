'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { LockKeyhole, ArrowRight } from 'lucide-react';
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.assign('/app');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.'); setBusy(false); }
  }
  return <main className="auth-bg"><section className="auth-card">
    <div className="brand"><span className="brand-icon">T</span><span>TaskFlow</span></div>
    <span className="eyebrow">PRIVATE OWNER WORKSPACE</span>
    <h1>Welcome back</h1><p>Sign in to your project workspace. Your authenticator may be requested next.</p>
    <form onSubmit={submit} className="stack"><label>Email address<input required autoComplete="username" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></label>
    <label>Password<input required autoComplete="current-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label>
    {error&&<div className="error" role="alert">{error}</div>}
    <button type="submit" disabled={busy} className="button primary"><LockKeyhole size={16}/>{busy?'Signing in…':'Sign in securely'}<ArrowRight size={16}/></button></form>
    <p className="muted footnote">Owner access only · Self-registration disabled · Fictional test data only</p>
  </section></main>;
}
