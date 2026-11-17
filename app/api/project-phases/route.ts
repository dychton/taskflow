
import { NextResponse } from 'next/server';
import { ownerGate } from '@/lib/owner';

export const dynamic = 'force-dynamic';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PhaseInput = {
  project_id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

function parsePhase(body: unknown): PhaseInput {
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new Error('Invalid phase information.');
  }

  const input = body as Record<string, unknown>;

  if (
    typeof input.project_id !== 'string' ||
    !uuidPattern.test(input.project_id)
  ) {
    throw new Error('Select a valid project.');
  }

  if (
    typeof input.name !== 'string' ||
    input.name.trim().length < 1 ||
    input.name.trim().length > 160
  ) {
    throw new Error(
      'Phase name must contain 1–160 characters.'
    );
  }

  if (
    input.description != null &&
    typeof input.description !== 'string'
  ) {
    throw new Error('Invalid phase description.');
  }

  const sort_order = input.sort_order ?? 0;

  if (
    typeof sort_order !== 'number' ||
    !Number.isSafeInteger(sort_order) ||
    sort_order < 0 ||
    sort_order > 2147483647
  ) {
    throw new Error('Invalid phase order.');
  }

  return {
    project_id: input.project_id,
    name: input.name.trim(),
    description:
      typeof input.description === 'string'
        ? input.description
        : null,
    sort_order,
  };
}

// List phases belonging to one project.

export async function GET(request: Request) {
  const gate = await ownerGate();

  if (!gate.ok) {
    return NextResponse.json(
      {
        error:
          'Not authorised; sign in and complete MFA.',
      },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get('project_id');

  if (!projectId || !uuidPattern.test(projectId)) {
    return NextResponse.json(
      { error: 'A valid project ID is required.' },
      { status: 400 }
    );
  }

  const { data, error } = await gate.supabase
    .from('project_phases')
    .select(
      'id,project_id,name,description,sort_order,' +
      'created_at,updated_at'
    )
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: 'Unable to load project phases.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { phases: data },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

// Add an optional phase to an existing project.

export async function POST(request: Request) {
  const gate = await ownerGate();

  if (!gate.ok) {
    return NextResponse.json(
      {
        error:
          'Not authorised; sign in and complete MFA.',
      },
      { status: 401 }
    );
  }

  let phase: PhaseInput;

  try {
    const body: unknown = await request.json();
    phase = parsePhase(body);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Invalid phase information.',
      },
      { status: 400 }
    );
  }

  // Confirm the parent project is accessible
  // through the owner's MFA-protected session.

  const { data: project, error: projectError } =
    await gate.supabase
      .from('projects')
      .select('id')
      .eq('id', phase.project_id)
      .maybeSingle();

  if (projectError) {
    return NextResponse.json(
      { error: 'Unable to verify the project.' },
      { status: 500 }
    );
  }

  if (!project) {
    return NextResponse.json(
      { error: 'Project not found.' },
      { status: 404 }
    );
  }

  const { data, error } = await gate.supabase
    .from('project_phases')
    .insert(phase)
    .select(
      'id,project_id,name,description,sort_order,' +
      'created_at,updated_at'
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Unable to create project phase.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { phase: data },
    {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
