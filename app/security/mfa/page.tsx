import { redirect } from 'next/navigation';
import { ownerGate } from '@/lib/owner';
import MfaScreen from '@/components/mfa-screen';
export const dynamic = 'force-dynamic';
export default async function MfaPage() {
  const gate = await ownerGate(false);
  if (!gate.ok) redirect('/login');
  const { data } = await gate.supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data?.currentLevel === 'aal2') redirect('/app');
  return <MfaScreen />;
}
