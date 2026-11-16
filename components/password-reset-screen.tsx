
'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export default function PasswordResetScreen() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function initialiseRecovery() {
      try {
        const params = new URLSearchParams(
          window.location.hash.substring(1)
        );

        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const type = params.get('type');

        window.history.replaceState(
          null,
          '',
          window.location.pathname
        );

        if (
          !access_token ||
          !refresh_token ||
          type !== 'recovery'
        ) {
          setMessage(
            'Please open a fresh password recovery link.'
          );
          return;
        }

        const supabase = createClient();

        const { data, error } =
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

        if (error || !data.session) {
          throw new Error(
            'Recovery link is invalid or expired.'
          );
        }

        setReady(true);
      } catch {
        setMessage(
          'Unable to verify the recovery link. Please request a new one.'
        );
      } finally {
        setLoading(false);
      }
    }

    initialiseRecovery();
  }, []);

  async function updatePassword(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setMessage('');

    if (!ready) return;

    if (password.length < 12) {
      setMessage('Use at least 12 characters.');
      return;
    }

    if (password !== confirm) {
      setMessage('The passwords do not match.');
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const { error } =
        await supabase.auth.updateUser({ password });

      if (error) throw error;

      setPassword('');
      setConfirm('');
      setReady(false);
      setComplete(true);

      const { error: signOutError } =
        await supabase.auth.signOut();

      if (signOutError) {
        setMessage(
          'Password saved, but automatic sign-out failed.'
        );
      }
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

        <span className="eyebrow">
          PRIVATE OWNER WORKSPACE
        </span>

        <h1>Set your password</h1>

        {loading ? (
          <p>Verifying your recovery link...</p>
        ) : complete ? (
          <>
            <p>Your password has been updated.</p>
            <a href="/login">Return to sign in</a>
          </>
        ) : ready ? (
          <form
            onSubmit={updatePassword}
            className="stack"
          >
            <p>Choose your new TaskFlow password.</p>

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

            <button
              className="button primary"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : 'Save new password'}
            </button>
          </form>
        ) : (
          <p>Open a valid password recovery link.</p>
        )}

        {message && (
          <div className="error" role="alert">
            {message}
          </div>
        )}
      </section>
    </main>
  );
}
