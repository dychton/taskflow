'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { ShieldCheck, KeyRound, LogOut } from 'lucide-react';
type Flow = 'loading'|'enroll'|'challenge';
export default function MfaScreen() {
  const [flow,setFlow]=useState<Flow>('loading');
  const [qr,setQr]=useState('');
  const [secret,setSecret]=useState('');
  const [factor,setFactor]=useState('');
  const [code,setCode]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const supabase=createClient();
      const {data,error}=await supabase.auth.mfa.listFactors();
      if(cancelled)return;
      if(error){setError(error.message);return;}
      const existing=data?.totp.find(f=>f.status==='verified');
      if(existing){setFactor(existing.id);setFlow('challenge');}
      else setFlow('enroll');
    })();
    return ()=>{cancelled=true;};
  },[]);
  async function startEnroll() {
    setBusy(true);setError('');
    const supabase=createClient();
    const {data,error}=await supabase.auth.mfa.enroll({factorType:'totp', friendlyName:'TaskFlow owner'});
    setBusy(false);
    if(error){setError(error.message);return;}
    if(data){setFactor(data.id);setQr(data.totp.qr_code);setSecret(data.totp.secret);}
  }
  async function verify(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError('');
    try{
      const supabase=createClient();
      const {data:challenge,error:challengeError}=await supabase.auth.mfa.challenge({factorId:factor});
      if(challengeError||!challenge)throw challengeError??Error('Unable to start verification.');
      const {error:verifyError}=await supabase.auth.mfa.verify({factorId:factor,challengeId:challenge.id,code:code.trim()});
      if(verifyError)throw verifyError;
      window.location.assign('/app');
    }catch(e){setError(e instanceof Error?e.message:'Verification failed.');setBusy(false);}
  }
  async function signOut(){await createClient().auth.signOut();window.location.assign('/login');}
  return <main className="auth-bg"><section className="auth-card">
    <div className="brand"><span className="brand-icon">T</span><span>TaskFlow</span></div>
    <span className="eyebrow">ACCOUNT SECURITY</span><h1><ShieldCheck size={27} className="inline-icon"/> Two-step verification</h1>
    {flow==='loading'&&<p>Checking your authenticator setup…</p>}
    {flow==='enroll'&&<><p>Protect this account with an authenticator app. Keep a separate recovery factor as described in the setup guide.</p>
      {!qr?<button className="button primary" onClick={startEnroll} disabled={busy}>{busy?'Preparing…':'Set up authenticator'}</button>:<><div className="qr-holder"><img src={`data:image/svg+xml;utf8,${encodeURIComponent(qr)}`} alt="Authenticator enrollment QR code" width={192} height={192}/></div><p className="muted small">If you cannot scan the QR, enter this secret manually. Never share it.</p><code className="secret">{secret}</code></>}
    </>}
    {flow==='challenge'&&<p>Enter the six-digit code from your registered authenticator.</p>}
    {factor&&<form onSubmit={verify} className="stack"><label>Six-digit authentication code<input required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" placeholder="000000"/></label><button className="button primary" disabled={busy||code.length!==6}><KeyRound size={16}/>{busy?'Verifying…':'Verify and continue'}</button></form>}
    {error&&<div role="alert" className="error">{error}</div>}
    <button className="button subtle" onClick={signOut}><LogOut size={15}/> Sign out</button>
    <p className="muted footnote">TaskFlow requires MFA for private site data and protected application access.</p>
  </section></main>;
}
