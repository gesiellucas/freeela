-- ============================================
-- Migration: Ordens de Serviço (Service Orders)
-- Data: 2026-06-02
-- ============================================
-- Decisões de modelagem:
--   - client_id omitido: obtido via project_id → projects.client_id (evita redundância)
--   - service_order_id em tasks é nullable para retrocompatibilidade com tarefas existentes
--   - approved_at e closed_at são preenchidos automaticamente via trigger
-- ============================================

-- 1. Enum de status da OS
DO $$ BEGIN
  CREATE TYPE service_order_status AS ENUM ('draft', 'pending', 'approved', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabela service_orders
CREATE TABLE IF NOT EXISTS service_orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Origem comercial opcional (proposta, contrato ou aditivo)
  commercial_document_id UUID REFERENCES commercial_agreements(id) ON DELETE SET NULL,
  title                  TEXT NOT NULL,
  description            TEXT,
  scope_summary          TEXT,
  planned_start_date     DATE,
  planned_end_date       DATE,
  estimated_hours        NUMERIC(8,2),
  priority               TEXT NOT NULL DEFAULT 'normal',
  planned_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  status                 service_order_status NOT NULL DEFAULT 'draft',
  progress_percent       NUMERIC(5,2) NOT NULL DEFAULT 0
                           CHECK (progress_percent >= 0 AND progress_percent <= 100),
  approved_at            TIMESTAMPTZ,
  closed_at              TIMESTAMPTZ,
  customer_notes         TEXT,
  internal_notes         TEXT,
  version                INTEGER NOT NULL DEFAULT 1,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para buscas frequentes
CREATE INDEX IF NOT EXISTS idx_service_orders_project_id ON service_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_user_id    ON service_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status     ON service_orders(status);

-- 3. Row Level Security
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_orders_crud" ON service_orders;
CREATE POLICY "service_orders_crud" ON service_orders FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- 4. Trigger updated_at
CREATE TRIGGER update_service_orders_updated_at
  BEFORE UPDATE ON service_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Trigger: preenche approved_at e closed_at na transição de status
CREATE OR REPLACE FUNCTION set_service_order_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.approved_at = NOW();
  END IF;
  IF NEW.status = 'declined' AND (OLD.status IS DISTINCT FROM 'declined') THEN
    NEW.closed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_order_timestamps ON service_orders;
CREATE TRIGGER trg_service_order_timestamps
  BEFORE UPDATE ON service_orders
  FOR EACH ROW EXECUTE FUNCTION set_service_order_timestamps();

-- ============================================
-- 6. Adicionar campos à tabela tasks
-- ============================================
-- service_order_id: nullable para retrocompatibilidade
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS service_order_id UUID
  REFERENCES service_orders(id) ON DELETE SET NULL;

-- Campos operacionais do novo modelo de OS
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS difficulty        TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS development_stack TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_cost    NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_tasks_service_order_id ON tasks(service_order_id);
