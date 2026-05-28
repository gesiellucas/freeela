-- Migration: Create Commercial Agreements Table and align Proposals/Contracts
-- Data: 2026-05-27

-- ============================================
-- 1. Enums para Tipo de Acordo e Modelo de Faturamento
-- ============================================
DO $$ BEGIN
  CREATE TYPE agreement_type AS ENUM ('proposal', 'contract', 'addendum', 'retainer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_model_type AS ENUM ('fixed_price', 'time_materials', 'retainer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. Tabela commercial_agreements
-- ============================================
CREATE TABLE IF NOT EXISTS commercial_agreements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  type            agreement_type NOT NULL DEFAULT 'proposal',
  status          TEXT NOT NULL DEFAULT 'draft',
  billing_model   billing_model_type NOT NULL DEFAULT 'fixed_price',
  total_value     NUMERIC(12,2) NOT NULL DEFAULT 0,
  estimated_hours NUMERIC(6,2),
  effective_date  DATE,
  expiry_date     DATE,
  notes           TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Garante que o acordo tem algum contexto (ou projeto ou lead)
  CONSTRAINT agreements_has_context CHECK (project_id IS NOT NULL OR lead_id IS NOT NULL)
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_commercial_agreements_user_id    ON commercial_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_commercial_agreements_project_id ON commercial_agreements(project_id);
CREATE INDEX IF NOT EXISTS idx_commercial_agreements_lead_id    ON commercial_agreements(lead_id);

-- ============================================
-- 3. Row Level Security (RLS)
-- ============================================
ALTER TABLE commercial_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commercial_agreements_crud" ON commercial_agreements;
CREATE POLICY "commercial_agreements_crud" ON commercial_agreements FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- ============================================
-- 4. Trigger para updated_at
-- ============================================
CREATE TRIGGER update_commercial_agreements_updated_at BEFORE UPDATE ON commercial_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Adicionar colunas de relacionamento
-- ============================================
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS commercial_agreement_id UUID REFERENCES commercial_agreements(id) ON DELETE SET NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS commercial_agreement_id UUID REFERENCES commercial_agreements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_agreement ON proposals(commercial_agreement_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agreement ON contracts(commercial_agreement_id);

-- ============================================
-- 6. Script de Backfill (Migração de Dados)
-- ============================================

-- Backfill para Proposals
DO $$
DECLARE
  p_row RECORD;
  new_agreement_id UUID;
BEGIN
  FOR p_row IN SELECT * FROM proposals WHERE commercial_agreement_id IS NULL LOOP
    INSERT INTO commercial_agreements (
      user_id, project_id, lead_id, title, description,
      type, status, total_value, notes, metadata, created_at, updated_at
    ) VALUES (
      p_row.user_id, p_row.project_id, p_row.lead_id, p_row.title, p_row.description,
      'proposal'::agreement_type, p_row.status, 0.00, p_row.notes, COALESCE(p_row.metadata, '{}'::jsonb), p_row.created_at, p_row.updated_at
    ) RETURNING id INTO new_agreement_id;

    UPDATE proposals SET commercial_agreement_id = new_agreement_id WHERE id = p_row.id;
  END LOOP;
END $$;

-- Backfill para Contracts
DO $$
DECLARE
  c_row RECORD;
  new_agreement_id UUID;
  proj_val NUMERIC(12,2);
BEGIN
  FOR c_row IN SELECT * FROM contracts WHERE commercial_agreement_id IS NULL LOOP
    -- Busca o valor do projeto para usar como valor total do contrato
    SELECT COALESCE(value, 0.00) INTO proj_val FROM projects WHERE id = c_row.project_id;

    INSERT INTO commercial_agreements (
      user_id, project_id, title, description,
      type, status, total_value, billing_model,
      effective_date, expiry_date, notes, metadata, created_at, updated_at
    ) VALUES (
      c_row.user_id, c_row.project_id, c_row.title, c_row.description,
      'contract'::agreement_type, c_row.status, proj_val, 'fixed_price'::billing_model_type,
      c_row.effective_date, c_row.expiry_date, c_row.notes, COALESCE(c_row.metadata, '{}'::jsonb), c_row.created_at, c_row.updated_at
    ) RETURNING id INTO new_agreement_id;

    UPDATE contracts SET commercial_agreement_id = new_agreement_id WHERE id = c_row.id;
  END LOOP;
END $$;
