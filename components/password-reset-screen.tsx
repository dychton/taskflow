
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

  const [factorId, setFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const recoverySession = useRef(false);

  useEffect(() => {
    let active = true;
    let checking = false;

    const url = new URL(window.location.href);
    const params = new URLSearchParams(
      url.hash.substring(1)
    );

    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type = params.get('type');
    const code = url.searchParams.get('code');

    const supabase = createClient();

    async function prepareRecovery() {
      if (!active || checking) return;
      checking = true;

      try {
        const { data: aal, error: aalError } =
          await supabase.auth.mfa
            .getAuthenticatorAssuranceLevel();

        if (aalError || !aal) {
          throw new Error(
            'Unable to verify account security.'
          );
        }

        if (aal.nextLevel === 'aal2' &&
            aal.currentLevel !== 'aal2') {
          const { data, error } =
            await supabase.auth.mfa.listFactors();

          if (error) throw error;

          const factor = data.totp.find(
            f => f.status === 'verified'
          );

          if (!factor) {
            throw new Error(
              'No verified authenticator is available.'
            );
          }

          if (!active) return;

          setFactorId(factor.id);
          setMfaRequired(true);
        } else if (aal.nextLevel === null ||
                   aal.currentLevel === null) {
          throw new Error(
            'Unable to verify the recovery session.'
          );
        }

        if (!active) return;

        recoverySession.current = true;

        window.history.replaceState(
          null, '', window.location.pathname
        );

        setReady(true);
        setLoading(false);
        setMessage('');
      } catch (error) {
        if (!active) return;

        setLoading(false);
        setMessage(
          error instanceof Error
            ? error.message
            : 'Unable to prepare password recovery.'
        );
      }
    }

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (
            active &&
            event === 'PASSWORD_RECOVERY' &&
            session &&
            code
          ) {
            window.setTimeout(() => {
              void prepareRecovery();
            }, 0);
          }
        }
      );

    async function initialiseRecovery() {
      try {
        if (code) return;

        if (
          access_token &&
          refresh_token &&
          type === 'recovery'
        ) {
          window.history.replaceState(
            null, '', window.location.pathname
          );

          const { data, error } =
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

          if (error || !data.session) {
            throw new Error('Invalid recovery session.');
          }

          await prepareRecovery();
          return;
        }

        if (active) {
          setLoading(false);
          setMessage(
            'Please open a fresh password recovery link.'
          );
        }
      } catch {
        if (active) {
          setLoading(false);
          setMessage(
            'Unable to verify the recovery link. Request a new one.'
          );
        }
      }
    }

    void initialiseRecovery();

    const timeout = window.setTimeout(() => {
      if (active && !recoverySession.current) {
        setLoading(false);
        setMessage(
          'Recovery could not be verified. Request a new link and open it in the same browser.'
        );
      }
    }, 15000);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  async function verifyAuthenticator(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setMessage('');

    if (!ready || !recoverySession.current) return;

    if (!/^\d{6}$/.test(mfaCode)) {
      setMessage('Enter a valid six-digit code.');
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const { error } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId,
          code: mfaCode,
        });

      if (error) throw error;

      const { data, error: aalError } =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel();

      if (aalError || data?.currentLevel !== 'aal2') {
        throw new Error(
          'Two-step verification was not completed.'
        );
      }

      setMfaRequired(false);
      setMfaCode('');
    } catch {
      setMfaCode('');
      setMessage(
        'Verification failed. Try a fresh authenticator code.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function updatePassword(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setMessage('');

    if (
      !ready ||
      !recoverySession.current ||
      mfaRequired
    ) return;

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

      const { data: aal, error: aalError } =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel();

      if (aalError || !aal || !aal.currentLevel ||
          !aal.nextLevel) {
        throw new Error(
          'Unable to verify account security.'
        );
      }

      if (
        aal.nextLevel === 'aal2' &&
        aal.currentLevel !== 'aal2'
      ) {
        throw new Error(
          'Authenticator verification is required.'
        );
      }

      const { error } =
        await supabase.auth.updateUser({ password });

      if (error) throw error;

      recoverySession.current = false;
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

        <h1>
          {mfaRequired
            ? 'Verify your identity'
            : 'Set your password'}
        </h1>

        {loading ? (
          <p>Verifying your recovery link...</p>
        ) : complete ? (
          <>
            <p>Your password has been updated.</p>
            <a href="/login">Return to sign in</a>
          </>
        ) : ready && mfaRequired ? (
          <form
            className="stack"
            onSubmit={verifyAuthenticator}
          >
            <p>
              Enter the six-digit code from your
              registered authenticator app.
            </p>

            <label>
              Authentication code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={mfaCode}
                onChange={e =>
                  setMfaCode(
                    e.target.value.replace(/\D/g, '')
                  )
                }
                placeholder="000000"
              />
            </label>

            <button
              className="button primary"
              disabled={saving || mfaCode.length !== 6}
            >
              {saving
                ? 'Verifying...'
                : 'Verify and continue'}
            </button>
          </form>
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
                onChange={e =>
                  setPassword(e.target.value)
                }
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
                onChange={e =>
                  setConfirm(e.target.value)
                }
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
          <>
            <p>Open a valid password recovery link.</p>
            <a href="/login">Return to sign in</a>
          </>
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
