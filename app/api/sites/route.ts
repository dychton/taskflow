import { NextResponse } from 'next/server';
import { ownerGate } from '@/lib/owner';
export const dynamic = 'force-dynamic';
type SiteInput = { name?: unknown; color?: unknown; id?: unknown };
function parseSite(payload: SiteInput) {
  if (typeof payload.name !== 'string' || payload.name.trim().length < 1 || payload.name.trim().length > 80) throw Error('Site name must contain 1–80 characters.');
  if (typeof payload.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(payload.color)) throw Error('Choose a valid site colour.');
  return { name: payload.name.trim(), color: payload.color };
}
async function authorize() {
  const gate = await ownerGate();
  if (!gate.ok) return { gate: null, response: NextResponse.json({ error: 'Not authorised; sign in and complete MFA.' }, { status: 401 }) };
  return { gate, response: null };
}
export async function GET() {
  const { gate, response } = await authorize();
  if (!gate) return response;
  const { data, error } = await gate.supabase.from('sites').select('id,name,color,created_at,updated_at').order('created_at');
  if (error) return NextResponse.json({ error: 'Unable to load sites.' }, { status: 500 });
  return NextResponse.json({ sites: data }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  const { gate, response } = await authorize();
  if (!gate) return response;
  try {
    const body = await request.json() as SiteInput;
    const site = parseSite(body);
    const { data, error } = await gate.supabase.from('sites').insert(site).select('id,name,color,created_at,updated_at').single();
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'That site name already exists.' : 'Unable to create site.' }, { status: 400 });
    return NextResponse.json({ site: data }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid input.' }, { status: 400 }); }
}
export async function PATCH(request: Request) {
  const { gate, response } = await authorize();
  if (!gate) return response;
  try {
    const body = await request.json() as SiteInput;
    if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)) throw Error('Invalid site identifier.');
    const site = parseSite(body);
    const { data, error } = await gate.supabase.from('sites').update(site).eq('id', body.id).select('id,name,color,created_at,updated_at').single();
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'That site name already exists.' : 'Unable to update site.' }, { status: 400 });
    return NextResponse.json({ site: data });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid input.' }, { status: 400 }); }
}
