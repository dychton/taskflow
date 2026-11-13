import { redirect } from 'next/navigation';
import { ownerGate } from '@/lib/owner';
import Workspace from '@/components/workspace';
export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const gate = await ownerGate(true);
  if (!gate.ok) {
    if (gate.reason === 'login') redirect('/login');
    if (gate.reason === 'mfa') redirect('/security/mfa');
    redirect('/login?error=not-owner');
  }
  return <Workspace email={gate.user.email ?? 'Owner'} />;
}
