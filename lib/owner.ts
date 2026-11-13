import { createClient } from './supabase/server';
export async function ownerGate(requireMfa = true) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false as const, reason: 'login' as const, supabase };
  // Owner ID exists only in a private table; exposed via a narrow, read-only function.
  const { data: owner, error: ownerError } = await supabase.rpc('am_i_owner');
  if (ownerError || owner !== true) return { ok: false as const, reason: 'forbidden' as const, supabase };
  const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError) return { ok: false as const, reason: 'login' as const, supabase };
  if (requireMfa && aal?.currentLevel !== 'aal2') return { ok: false as const, reason: 'mfa' as const, supabase };
  return { ok: true as const, user, supabase };
}
