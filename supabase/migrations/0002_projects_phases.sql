
-- TaskFlow Milestone 2
-- Migration 0002: Projects and optional phases
-- Fictional-data development only.
-- Do not run against Supabase until reviewed.

BEGIN;

-- 1. Projects
-- Only a name is required when creating a project.

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),

  description text,

  status text NOT NULL DEFAULT 'Planned'
    CHECK (status IN (
      'Planned',
      'On Track',
      'At Risk',
      'Delayed',
      'On Hold',
      'Completed',
      'Cancelled'
    )),

  priority text NOT NULL DEFAULT 'Medium'
    CHECK (priority IN (
      'Critical',
      'High',
      'Medium',
      'Low'
    )),

  start_date date,
  due_date date,

  completed_at timestamptz,
  archived_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_date_order
    CHECK (
      start_date IS NULL
      OR due_date IS NULL
      OR due_date >= start_date
    )
);

-- 2. Optional project phases
-- A project can exist without any phases.

CREATE TABLE public.project_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id uuid NOT NULL
    REFERENCES public.projects(id)
    ON DELETE RESTRICT,

  name text NOT NULL
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),

  description text,

  sort_order integer NOT NULL DEFAULT 0
    CHECK (sort_order >= 0),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes

CREATE INDEX projects_status_idx
  ON public.projects(status);

CREATE INDEX projects_archived_idx
  ON public.projects(archived_at);

CREATE INDEX project_phases_project_order_idx
  ON public.project_phases(project_id, sort_order);

-- 4. Automatic updated timestamps
-- Reuses the Milestone 1 timestamp function.

CREATE TRIGGER projects_touch_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION private.touch_updated_at();

CREATE TRIGGER phases_touch_updated_at
BEFORE UPDATE ON public.project_phases
FOR EACH ROW
EXECUTE FUNCTION private.touch_updated_at();

-- 5. Enable Row Level Security

ALTER TABLE public.projects
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.project_phases
ENABLE ROW LEVEL SECURITY;

-- 6. Restrict database privileges

REVOKE ALL ON public.projects
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.project_phases
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.projects
TO authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.project_phases
TO authenticated;

-- 7. Projects: owner + MFA required

CREATE POLICY projects_owner_select
ON public.projects
FOR SELECT TO authenticated
USING (
  (SELECT public.am_i_owner())
  AND (SELECT auth.jwt()->>'aal') = 'aal2'
);

CREATE POLICY projects_owner_insert
ON public.projects
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.am_i_owner())
  AND (SELECT auth.jwt()->>'aal') = 'aal2'
);

CREATE POLICY projects_owner_update
ON public.projects
FOR UPDATE TO authenticated
USING (
  (SELECT public.am_i_owner())
  AND (SELECT auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
  (SELECT public.am_i_owner())
  AND (SELECT auth.jwt()->>'aal') = 'aal2'
);

-- 8. Phases: owner + MFA required

CREATE POLICY phases_owner_select
ON public.project_phases
FOR SELECT TO authenticated
USING (
  (SELECT public.am_i_owner())
  AND (SELECT auth.jwt()->>'aal') = 'aal2'
);

CREATE POLICY phases_owner_insert
ON public.project_phases
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.am_i_owner())
  AND (SELECT auth.jwt()->>'aal') = 'aal2'
);

CREATE POLICY phases_owner_update
ON public.project_phases
FOR UPDATE TO authenticated
USING (
  (SELECT public.am_i_owner())
  AND (SELECT auth.jwt()->>'aal') = 'aal2'
)
WITH CHECK (
  (SELECT public.am_i_owner())
  AND (SELECT auth.jwt()->>'aal') = 'aal2'
);

-- No DELETE privileges or policies are provided.
-- Project archiving and cancellation will be handled
-- by the application in later Milestone 2 steps.

COMMIT;
