BEGIN;
CREATE SCHEMA IF NOT EXISTS portal;
CREATE TABLE IF NOT EXISTS portal.users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL,
 name text NOT NULL, password_hash text NOT NULL,
 role text NOT NULL CHECK(role IN ('ADMIN','OPERATOR','APPROVER','AUDITOR')),
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS portal.sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES portal.users(id),
 csrf text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS session_expiry ON portal.sessions(expires_at);
CREATE TABLE IF NOT EXISTS portal.records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), module text NOT NULL, code text NOT NULL,
 data jsonb NOT NULL, status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED')),
 revision integer NOT NULL DEFAULT 1, author_id uuid NOT NULL REFERENCES portal.users(id),
 approved_by uuid REFERENCES portal.users(id), source_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (status <> 'APPROVED' OR approved_by IS NOT NULL AND approved_by <> author_id),
 UNIQUE(module,code)
);
CREATE TABLE IF NOT EXISTS portal.record_versions (
 record_id uuid NOT NULL REFERENCES portal.records(id), revision integer NOT NULL,
 data jsonb NOT NULL, status text NOT NULL, actor_id uuid NOT NULL REFERENCES portal.users(id),
 recorded_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(record_id,revision)
);
CREATE TABLE IF NOT EXISTS portal.audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid REFERENCES portal.users(id),
 action text NOT NULL, entity_id text NOT NULL, details jsonb NOT NULL DEFAULT '{}',
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION portal.immutable_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit is append-only'; END; $$;
DROP TRIGGER IF EXISTS immutable_audit ON portal.audit;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE OR TRUNCATE ON portal.audit FOR EACH STATEMENT EXECUTE FUNCTION portal.immutable_audit();
DROP TRIGGER IF EXISTS immutable_history ON portal.record_versions;
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE OR TRUNCATE ON portal.record_versions FOR EACH STATEMENT EXECUTE FUNCTION portal.immutable_audit();
CREATE OR REPLACE FUNCTION portal.immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF OLD.status='APPROVED' THEN RAISE EXCEPTION 'approved record is immutable'; END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS immutable_record ON portal.records;
CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON portal.records FOR EACH ROW EXECUTE FUNCTION portal.immutable_record();
COMMIT;

-- management-v1: durable calculation receipts and per-user management preferences.
BEGIN;
CREATE TABLE IF NOT EXISTS portal.calculation_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES portal.users(id),
 request_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('SIMULATION','RULE_BASED')),
 input_hash text NOT NULL CHECK(length(input_hash)=64), input jsonb NOT NULL, result jsonb NOT NULL,
 sources jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(sources)='array'), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(actor_id,request_id)
);
ALTER TABLE portal.calculation_runs ADD COLUMN IF NOT EXISTS actor_name text NOT NULL DEFAULT '';
ALTER TABLE portal.calculation_runs ADD COLUMN IF NOT EXISTS actor_role text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS calculation_runs_actor_time ON portal.calculation_runs(actor_id,created_at DESC);
DROP TRIGGER IF EXISTS immutable_calculations ON portal.calculation_runs;
CREATE TRIGGER immutable_calculations BEFORE UPDATE OR DELETE OR TRUNCATE ON portal.calculation_runs FOR EACH STATEMENT EXECUTE FUNCTION portal.immutable_audit();
CREATE TABLE IF NOT EXISTS portal.user_preferences (
 user_id uuid PRIMARY KEY REFERENCES portal.users(id), data jsonb NOT NULL DEFAULT '{}',
 revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS portal.saved_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES portal.users(id),
 title text NOT NULL, module text NOT NULL, config jsonb NOT NULL, revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_reports_owner ON portal.saved_reports(user_id);
CREATE TABLE IF NOT EXISTS portal.review_assignments (
 record_id uuid PRIMARY KEY REFERENCES portal.records(id), record_revision integer NOT NULL,
 assignee_id uuid REFERENCES portal.users(id), assigned_by uuid NOT NULL REFERENCES portal.users(id),
 revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS portal.management_config (
 key text PRIMARY KEY CHECK(key='backup'), data jsonb NOT NULL, revision integer NOT NULL DEFAULT 1,
 updated_by uuid NOT NULL REFERENCES portal.users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
