-- Migration: New menu structure
-- Adds proposals, contracts, media_files, fiscal_notes tables
-- Adds status column to projects

-- ============================================================
-- 1. Project status enum + column
-- ============================================================
DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('active', 'archived', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS status project_status NOT NULL DEFAULT 'active';

UPDATE projects
SET status = CASE
  WHEN is_active = true THEN 'active'::project_status
  ELSE 'declined'::project_status
END;

-- ============================================================
-- 2. proposals
-- ============================================================
CREATE TABLE IF NOT EXISTS proposals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','sent','accepted','declined')),
  sent_at      TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  notes        TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT proposals_has_context CHECK (project_id IS NOT NULL OR lead_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_proposals_user_id    ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id    ON proposals(lead_id);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals_crud" ON proposals;
CREATE POLICY "proposals_crud" ON proposals FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 3. contracts
-- ============================================================
CREATE TABLE IF NOT EXISTS contracts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','sent','signed','cancelled')),
  signed_at      TIMESTAMPTZ,
  effective_date DATE,
  expiry_date    DATE,
  notes          TEXT,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_user_id    ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contracts_crud" ON contracts;
CREATE POLICY "contracts_crud" ON contracts FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 4. media_files (polymorphic: proposal | contract | project)
-- ============================================================
CREATE TABLE IF NOT EXISTS media_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  mime_type   TEXT,
  file_size   BIGINT,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','archived')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_files_user_id     ON media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_proposal_id ON media_files(proposal_id);
CREATE INDEX IF NOT EXISTS idx_media_files_contract_id ON media_files(contract_id);
CREATE INDEX IF NOT EXISTS idx_media_files_project_id  ON media_files(project_id);

ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_files_crud" ON media_files;
CREATE POLICY "media_files_crud" ON media_files FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 5. fiscal_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS fiscal_notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES projects(id) ON DELETE SET NULL,
  payment_id     UUID REFERENCES payments(id) ON DELETE SET NULL,
  nf_number      TEXT,
  nf_series      TEXT,
  issue_date     DATE NOT NULL,
  service_desc   TEXT NOT NULL,
  gross_value    NUMERIC(12,2) NOT NULL DEFAULT 0,
  iss_rate       NUMERIC(5,4) NOT NULL DEFAULT 0,
  recipient_name TEXT,
  recipient_cnpj TEXT,
  status         TEXT NOT NULL DEFAULT 'issued'
                 CHECK (status IN ('issued','cancelled','pending')),
  file_path      TEXT,
  file_url       TEXT,
  notes          TEXT,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_notes_user_id    ON fiscal_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_notes_project_id ON fiscal_notes(project_id);

ALTER TABLE fiscal_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fiscal_notes_crud" ON fiscal_notes;
CREATE POLICY "fiscal_notes_crud" ON fiscal_notes FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 6. Storage bucket RLS (run after creating bucket manually)
-- NOTE: Create bucket 'freeela-files' (private, 50MB limit)
--       via Supabase Dashboard > Storage before running these.
-- ============================================================
/*
DROP POLICY IF EXISTS "upload_own" ON storage.objects;
CREATE POLICY "upload_own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'freeela-files' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "read_own" ON storage.objects;
CREATE POLICY "read_own" ON storage.objects FOR SELECT
  USING (bucket_id = 'freeela-files' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "delete_own" ON storage.objects;
CREATE POLICY "delete_own" ON storage.objects FOR DELETE
  USING (bucket_id = 'freeela-files' AND auth.uid()::text = (storage.foldername(name))[1]);
*/
