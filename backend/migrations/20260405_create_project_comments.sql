-- ============================================
-- PROJECT COMMENTS
-- Comentários por projeto para o módulo Overview
-- ============================================

CREATE TABLE IF NOT EXISTS project_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL CHECK (char_length(content) > 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index para busca por projeto (timeline)
CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id);

-- Index para busca por usuário (timeline global)
CREATE INDEX IF NOT EXISTS idx_project_comments_user_id ON project_comments(user_id);

-- Index para ordenação por data
CREATE INDEX IF NOT EXISTS idx_project_comments_created_at ON project_comments(created_at DESC);

-- RLS
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own project comments"
  ON project_comments FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can create their own project comments"
  ON project_comments FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own project comments"
  ON project_comments FOR DELETE
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_project_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_comments_updated_at
  BEFORE UPDATE ON project_comments
  FOR EACH ROW EXECUTE FUNCTION update_project_comments_updated_at();
