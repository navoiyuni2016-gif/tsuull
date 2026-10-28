-- Initial PostgreSQL domain design; review with Codex and test against real PostgreSQL before deployment.
-- NO demo/production rules are inserted.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name_uz TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS faculties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    code TEXT NOT NULL,
    name_uz TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (institution_id, code)
);
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES faculties(id),
    code TEXT NOT NULL,
    name_uz TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (faculty_id, code)
);
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    name TEXT NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    state TEXT NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT','ACTIVE','LOCKED','ARCHIVED')),
    revision INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_on > starts_on),
    UNIQUE(institution_id, name)
);
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_subject TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_role_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    faculty_id UUID REFERENCES faculties(id),
    department_id UUID REFERENCES departments(id),
    academic_year_id UUID REFERENCES academic_years(id),
    role_code TEXT NOT NULL CHECK (role_code IN ('SUPER_ADMIN','ACADEMIC_APPROVER','DEPARTMENT_HEAD','ACADEMIC_SPECIALIST','FACULTY_OFFICER','CHAIR_HEAD','INSTRUCTOR','AUDITOR')),
    valid_from DATE NOT NULL,
    valid_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK(valid_to IS NULL OR valid_to >= valid_from)
);
CREATE INDEX IF NOT EXISTS idx_role_scope_user ON user_role_scopes(user_id, institution_id, faculty_id, department_id);

CREATE TABLE IF NOT EXISTS rule_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    rule_code TEXT NOT NULL,
    revision INTEGER NOT NULL,
    scope JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_type TEXT NOT NULL CHECK(source_type IN ('DEMO','INSTITUTIONAL')),
    state TEXT NOT NULL DEFAULT 'DRAFT' CHECK(state IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','RETIRED')),
    legal_basis TEXT,
    effective_from DATE,
    effective_to DATE,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    author_id UUID NOT NULL REFERENCES app_users(id),
    approved_by UUID REFERENCES app_users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revision_lock BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT valid_rule_period CHECK(effective_to IS NULL OR effective_from IS NOT NULL AND effective_to >= effective_from),
    CONSTRAINT approved_rule_integrity CHECK(
      state <> 'APPROVED' OR (source_type = 'INSTITUTIONAL' AND legal_basis IS NOT NULL AND effective_from IS NOT NULL AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND approved_by <> author_id)
    ),
    UNIQUE(institution_id, rule_code, revision)
);
CREATE INDEX IF NOT EXISTS idx_rules_state_effective ON rule_sets (institution_id, rule_code, state, effective_from);

CREATE TABLE IF NOT EXISTS annual_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    owner_department_id UUID REFERENCES departments(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','ARCHIVED')),
    revision INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS plan_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES annual_plans(id),
    title TEXT NOT NULL,
    owner_user_id UUID REFERENCES app_users(id),
    due_on DATE,
    state TEXT NOT NULL DEFAULT 'TODO' CHECK(state IN ('TODO','IN_PROGRESS','DONE','BLOCKED')),
    completion_percent SMALLINT NOT NULL DEFAULT 0 CHECK(completion_percent BETWEEN 0 AND 100),
    evidence_ref TEXT,
    revision INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_status ON plan_tasks(plan_id, state, due_on);

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id),
    actor_id UUID REFERENCES app_users(id),
    request_id TEXT,
    action TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    redacted_diff JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END; $$;
DROP TRIGGER IF EXISTS trg_audit_immutable ON audit_events;
CREATE TRIGGER trg_audit_immutable BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();

-- Enforce published rules' immutability; a changed rule gets a new revision.
CREATE OR REPLACE FUNCTION prevent_approved_rule_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state = 'APPROVED' THEN
    RAISE EXCEPTION 'Approved rule-set cannot be modified; create a new revision';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_approved_rule_immutable ON rule_sets;
CREATE TRIGGER trg_approved_rule_immutable BEFORE UPDATE OR DELETE ON rule_sets
FOR EACH ROW EXECUTE FUNCTION prevent_approved_rule_mutation();

COMMIT;
