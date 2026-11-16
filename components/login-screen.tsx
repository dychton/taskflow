
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { LockKeyhole, ArrowRight } from 'lucide-react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const supabase = createClient();

      if (recovery) {
        const { error } =
          await supabase.auth.resetPasswordForEmail(
            email.trim(),
            {
              redirectTo:
                window.location.origin + '/reset-password',
            }
          );

        if (error) throw error;

        setMessage(
          'If an account exists for this email address, a password recovery link will be sent. Open the link in this same browser.'
        );
        setBusy(false);
        return;
      }

      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) throw error;

      window.location.assign('/app');
    } catch (e) {
      setError(
        recovery
          ? 'Unable to send a recovery email. Please try again later.'
          : e instanceof Error
            ? e.message
            : 'Unable to sign in.'
      );
      setBusy(false);
    }
  }

  function toggleRecovery() {
    setRecovery(value => !value);
    setError('');
    setMessage('');
    setPassword('');
  }

  return (
    <main className="auth-bg">
      <section className="auth-card">
        <div className="brand">
          <span className="brand-icon">T</span>
          <span>TaskFlow</span>
        </div>

        <span className="eyebrow">
          PRIVATE OWNER WORKSPACE
        </span>

        <h1>
          {recovery ? 'Reset your password' : 'Welcome back'}
        </h1>

        <p>
          {recovery
            ? 'Enter your registered email address to request a secure password recovery link.'
            : 'Sign in to your project workspace. Your authenticator may be requested next.'}
        </p>

        <form onSubmit={submit} className="stack">
          <label>
            Email address
            <input
              required
              autoComplete="username"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          {!recovery && (
            <label>
              Password
              <input
                required
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </label>
          )}

          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="soft-note" role="status">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="button primary"
          >
            <LockKeyhole size={16} />

            {busy
              ? recovery
                ? 'Sending...'
                : 'Signing in...'
              : recovery
                ? 'Send recovery email'
                : 'Sign in securely'}

            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className="button subtle"
            disabled={busy}
            onClick={toggleRecovery}
          >
            {recovery
              ? 'Return to sign in'
              : 'Forgot password?'}
          </button>
        </form>

        <p className="muted footnote">
          Owner access only · Self-registration disabled ·
          Fictional test data only
        </p>
      </section>
    </main>
  );
}
