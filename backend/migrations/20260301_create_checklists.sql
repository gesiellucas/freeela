-- ============================================
-- Migration: Checklists + status "waiting" no Kanban
-- ============================================

-- 1. Adicionar valor 'waiting' ao enum task_status (para o Kanban existente)
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'waiting' AFTER 'doing';

-- 2. Criar tabela de checklists
CREATE TABLE IF NOT EXISTS checklists (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  priority    TEXT NOT NULL DEFAULT 'normal'
              CHECK (priority IN ('alta', 'normal', 'baixa')),
  status      task_status NOT NULL DEFAULT 'todo',
  complexity  TEXT,
  position    INTEGER DEFAULT 0,
  due_date    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela de itens do checklist (subtarefas)
CREATE TABLE IF NOT EXISTS checklist_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id  UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  completed     BOOLEAN NOT NULL DEFAULT false,
  position      INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- 3. Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_checklists_user    ON checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_checklists_project ON checklists(project_id);
CREATE INDEX IF NOT EXISTS idx_checklists_status  ON checklists(status);
CREATE INDEX IF NOT EXISTS idx_checklists_task    ON checklists(task_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON checklist_items(checklist_id);


-- 4. RLS (Row Level Security)
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checklists"
  ON checklists FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own checklists"
  ON checklists FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own checklists"
  ON checklists FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own checklists"
  ON checklists FOR DELETE
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checklist items"
  ON checklist_items FOR SELECT
  USING (checklist_id IN (
    SELECT id FROM checklists WHERE user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert own checklist items"
  ON checklist_items FOR INSERT
  WITH CHECK (checklist_id IN (
    SELECT id FROM checklists WHERE user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update own checklist items"
  ON checklist_items FOR UPDATE
  USING (checklist_id IN (
    SELECT id FROM checklists WHERE user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete own checklist items"
  ON checklist_items FOR DELETE
  USING (checklist_id IN (
    SELECT id FROM checklists WHERE user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  ));