
import { NextResponse } from 'next/server';
import { ownerGate } from '@/lib/owner';

export const dynamic = 'force-dynamic';

const statuses = [
  'Planned',
  'On Track',
  'At Risk',
  'Delayed',
  'On Hold',
  'Completed',
  'Cancelled',
] as const;

const priorities = [
  'Critical',
  'High',
  'Medium',
  'Low',
] as const;

function isDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(value + 'T00:00:00Z');

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function optionalDate(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (!isDate(value)) {
    throw new Error('Enter a valid date.');
  }

  return value;
}

function parseProject(body: unknown) {
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new Error('Invalid project information.');
  }

  const input = body as Record<string, unknown>;

  if (
    typeof input.name !== 'string' ||
    input.name.trim().length < 1 ||
    input.name.trim().length > 160
  ) {
    throw new Error(
      'Project name must contain 1–160 characters.'
    );
  }

  if (
    input.description !== undefined &&
    input.description !== null &&
    typeof input.description !== 'string'
  ) {
    throw new Error('Invalid project description.');
  }

  const status = input.status ?? 'Planned';
  const priority = input.priority ?? 'Medium';

  if (!statuses.some(s => s === status)) {
    throw new Error('Invalid project status.');
  }

  if (!priorities.some(p => p === priority)) {
    throw new Error('Invalid project priority.');
  }

  const start_date = optionalDate(input.start_date);
  const due_date = optionalDate(input.due_date);

  if (
    start_date &&
    due_date &&
    due_date < start_date
  ) {
    throw new Error(
      'Due date cannot be before the start date.'
    );
  }

  return {
    name: input.name.trim(),
    description:
      typeof input.description === 'string'
        ? input.description
        : null,
    status: status as typeof statuses[number],
    priority: priority as typeof priorities[number],
    start_date,
    due_date,
  };
}

// Retrieve projects.
// The existing ownerGate requires a signed-in owner
// with completed MFA.

export async function GET() {
  const gate = await ownerGate();

  if (!gate.ok) {
    return NextResponse.json(
      { error: 'Not authorised; sign in and complete MFA.' },
      { status: 401 }
    );
  }

  const { data, error } = await gate.supabase
    .from('projects')
    .select(
      'id,name,description,status,priority,' +
      'start_date,due_date,completed_at,archived_at,' +
      'created_at,updated_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Unable to load projects.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { projects: data },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

// Create a project.
// Only the project name is required.

export async function POST(request: Request) {
  const gate = await ownerGate();

  if (!gate.ok) {
    return NextResponse.json(
      { error: 'Not authorised; sign in and complete MFA.' },
      { status: 401 }
    );
  }

  let project: ReturnType<typeof parseProject>;

  try {
    const body: unknown = await request.json();
    project = parseProject(body);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Invalid project information.',
      },
      { status: 400 }
    );
  }

  const { data, error } = await gate.supabase
    .from('projects')
    .insert(project)
    .select(
      'id,name,description,status,priority,' +
      'start_date,due_date,completed_at,archived_at,' +
      'created_at,updated_at'
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Unable to create project.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { project: data },
    {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
