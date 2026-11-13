import { readFileSync, existsSync } from 'node:fs';
const files=['app/app/page.tsx','app/api/sites/route.ts','components/workspace.tsx','components/login-screen.tsx','components/mfa-screen.tsx','supabase/migrations/0001_foundation.sql'];
for (const file of files) if (!existsSync(new URL('../'+file, import.meta.url))) throw Error('Missing '+file);
const sql=readFileSync(new URL('../supabase/migrations/0001_foundation.sql',import.meta.url),'utf8');
for (const token of ['enable row level security','aal2','am_i_owner','owner_mfa_select_sites','owner_mfa_insert_sites','owner_mfa_update_sites']) if(!sql.includes(token))throw Error('Missing security rule '+token);
const api=readFileSync(new URL('../app/api/sites/route.ts',import.meta.url),'utf8');
if(!api.includes('ownerGate()'))throw Error('Sites routes missing auth gate');
console.log('PASS: required source files and static security controls exist.');
console.log('NOTE: integration tests require real Supabase credentials and npm dependencies.');
