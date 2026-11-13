
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export default function PasswordResetScreen() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        if (event === 'PASSWORD_RECOVERY' && session) {
          setReady(true);
          setMessage('');
        }
      });

    // Also recognise a valid session established by
    // Supabase after following the recovery link.
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        setReady(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');

    if (password.length < 12) {
      setMessage('Use a password of at least 12 characters.');
      return;
    }

    if (password !== confirm) {
      setMessage('The passwords do not match.');
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      await supabase.auth.signOut();
      setPassword('');
      setConfirm('');
      setComplete(true);
      setReady(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update your password.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-bg">
      <section className="auth-card">
        <div className="brand">
          <span className="brand-icon">T</span>
          <span>TaskFlow</span>
        </div>

        <span className="eyebrow">PRIVATE OWNER WORKSPACE</span>
        <h1>Set your password</h1>

        {complete ? (
          <>
            <p>Your password has been updated.</p>
            <a href="/login">Return to sign in</a>
          </>
        ) : ready ? (
          <form onSubmit={updatePassword} className="stack">
            <p>Choose a new password for your owner account.</p>

            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={12}
              />
            </label>

            <label>
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={12}
              />
            </label>

            {message && <p role="alert">{message}</p>}

            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save new password'}
            </button>
          </form>
        ) : (
          <>
            <p>
              Open a valid password recovery link to
              continue setting your password.
            </p>
            {message && <p role="alert">{message}</p>}
          </>
        )}
      </section>
    </main>
  );
}
