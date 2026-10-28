BEGIN;
ALTER TABLE portal.users ADD COLUMN IF NOT EXISTS faculty_id uuid REFERENCES portal.records(id);
ALTER TABLE portal.users ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES portal.records(id);
ALTER TABLE portal.users ADD COLUMN IF NOT EXISTS year_id uuid REFERENCES portal.records(id);
ALTER TABLE portal.users ADD COLUMN IF NOT EXISTS mfa_secret text;
ALTER TABLE portal.users ADD COLUMN IF NOT EXISTS mfa_pending text;
ALTER TABLE portal.users ADD COLUMN IF NOT EXISTS mfa_last_counter bigint;
ALTER TABLE portal.users ADD COLUMN IF NOT EXISTS recovery_codes jsonb NOT NULL DEFAULT '[]';
CREATE TABLE IF NOT EXISTS portal.year_locks (
 year_id uuid PRIMARY KEY REFERENCES portal.records(id), actor_id uuid NOT NULL REFERENCES portal.users(id),
 reason text NOT NULL, locked_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS immutable_year_locks ON portal.year_locks;
CREATE TRIGGER immutable_year_locks BEFORE UPDATE OR DELETE OR TRUNCATE ON portal.year_locks FOR EACH STATEMENT EXECUTE FUNCTION portal.immutable_audit();
CREATE TABLE IF NOT EXISTS portal.settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), profile jsonb NOT NULL DEFAULT '{}', revision integer NOT NULL DEFAULT 1,
 updated_by uuid REFERENCES portal.users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO portal.settings(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS portal.settings_history (
 revision integer PRIMARY KEY, profile jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES portal.users(id), recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS portal.imports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES portal.users(id), module text NOT NULL,
 file_hash text NOT NULL, file_name text NOT NULL, mapping jsonb NOT NULL, preview jsonb NOT NULL,
 state text NOT NULL DEFAULT 'PREVIEW' CHECK(state IN('UPLOADED','PREVIEW','COMMITTED','CANCELLED')),
 created_at timestamptz NOT NULL DEFAULT now(), committed_at timestamptz, receipt jsonb
);
ALTER TABLE portal.imports DROP CONSTRAINT IF EXISTS imports_state_check;
ALTER TABLE portal.imports ADD CONSTRAINT imports_state_check CHECK(state IN('UPLOADED','PREVIEW','COMMITTED','CANCELLED'));
ALTER TABLE portal.imports ADD COLUMN IF NOT EXISTS file_bytes bytea;
ALTER TABLE portal.imports ADD COLUMN IF NOT EXISTS actor_scope jsonb NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS committed_import_hash ON portal.imports(module,file_hash) WHERE state='COMMITTED';
CREATE TABLE IF NOT EXISTS portal.files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES portal.users(id), record_id uuid NOT NULL REFERENCES portal.records(id),
 filename text NOT NULL, content_type text NOT NULL, sha256 text NOT NULL, bytes bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS immutable_settings_history ON portal.settings_history;
CREATE TRIGGER immutable_settings_history BEFORE UPDATE OR DELETE OR TRUNCATE ON portal.settings_history FOR EACH STATEMENT EXECUTE FUNCTION portal.immutable_audit();
COMMIT;
