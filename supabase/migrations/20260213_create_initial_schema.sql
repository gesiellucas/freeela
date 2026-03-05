-- Freeela - Freelance OS
-- Migration inicial com todas as entidades do sistema
-- Data: 2026-02-13

-- ============================================
-- EXTENSION: UUID
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

-- Status do Lead
CREATE TYPE lead_status AS ENUM (
  'lead',           -- Contato inicial
  'briefing',       -- Em processo de briefing
  'proposal',       -- Proposta enviada
  'negotiation',    -- Em negociação
  'won',            -- Convertido em projeto
  'lost'            -- Perdido
);

-- Status do Workflow (Etapas do Projeto)
CREATE TYPE workflow_step AS ENUM (
  'initial_contact',    -- 1. Contato Inicial
  'understanding',      -- 2. Entender Demanda
  'proposal',           -- 3. Propor Soluções
  'contract',           -- 4. Assinar Contrato
  'development',        -- 5. Desenvolvimento
  'payment',            -- 6. Pagamento
  'finalization'        -- 7. Finalização
);

-- Status das Tarefas (Kanban)
CREATE TYPE task_status AS ENUM (
  'todo',
  'doing',
  'done'
);

-- Tipo de Tarefa
CREATE TYPE task_type AS ENUM (
  'technical',          -- Tarefa técnica
  'administrative',     -- Tarefa administrativa
  'communication',      -- Comunicação com cliente
  'documentation',      -- Documentação
  'meeting',            -- Reunião
  'review'              -- Revisão/QA
);

-- Status de Pagamento
CREATE TYPE payment_status AS ENUM (
  'pending',            -- Aguardando pagamento
  'paid',               -- Pago
  'overdue',            -- Atrasado
  'cancelled'           -- Cancelado
);

-- Tipo de Documento
CREATE TYPE document_type AS ENUM (
  'briefing',           -- Briefing técnico
  'proposal',           -- Proposta comercial
  'contract',           -- Contrato
  'invoice',            -- Fatura
  'report',             -- Relatório
  'other'               -- Outros
);

-- ============================================
-- TABELA: users (Freelancers/Usuários)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  company_name VARCHAR(255),
  phone VARCHAR(50),
  -- Integração com Supabase Auth
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Configurações
  settings JSONB DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: leads (Potenciais Clientes)
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Informações do Lead
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(255),

  -- Demanda
  demand TEXT NOT NULL,
  estimated_value DECIMAL(12, 2),

  -- Status e Pipeline
  status lead_status DEFAULT 'lead',
  priority INTEGER DEFAULT 0, -- 0: normal, 1: alta, 2: urgente

  -- Origem do Lead
  source VARCHAR(100), -- Ex: website, indicação, linkedin, etc

  -- Notas e observações
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ, -- Data de conversão para projeto

  -- Índices
  CONSTRAINT leads_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================
-- TABELA: clients (Clientes Convertidos)
-- ============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Informações do Cliente
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(255),

  -- Endereço
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(100) DEFAULT 'Brasil',
  zip_code VARCHAR(20),

  -- Dados fiscais (Brasil)
  cpf_cnpj VARCHAR(20),
  tax_id VARCHAR(50),

  -- Contato principal
  contact_person VARCHAR(255),
  contact_position VARCHAR(100),

  -- Informações adicionais
  notes TEXT,
  tags TEXT[], -- Tags para categorização
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Índices
  CONSTRAINT clients_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================
-- TABELA: projects (Projetos)
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Informações do Projeto
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Workflow e Status
  current_step workflow_step DEFAULT 'initial_contact',
  is_active BOOLEAN DEFAULT TRUE,

  -- Valores e Prazos
  value DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  deadline DATE,
  start_date DATE,
  completion_date DATE,

  -- Estrutura de Pastas
  folders_created BOOLEAN DEFAULT FALSE,
  folder_path TEXT,
  root_directory TEXT,

  -- Configurações do Projeto
  color VARCHAR(7), -- Hex color para identificação visual
  tags TEXT[],
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- ============================================
-- TABELA: tasks (Tarefas do Kanban)
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Informações da Tarefa
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Status e Tipo
  status task_status DEFAULT 'todo',
  task_type task_type DEFAULT 'technical',

  -- Prioridade e Organização
  priority INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0, -- Para ordenação no kanban

  -- Prazos
  due_date DATE,
  estimated_hours DECIMAL(5, 2),
  actual_hours DECIMAL(5, 2),

  -- Relacionamentos
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- Subtarefas

  -- Metadados
  tags TEXT[],
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- TABELA: payments (Pagamentos/Faturamento)
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Informações do Pagamento
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',

  -- Status e Datas
  status payment_status DEFAULT 'pending',
  due_date DATE,
  paid_date DATE,

  -- Informações Fiscais
  invoice_number VARCHAR(100),
  invoice_url TEXT,
  tax_amount DECIMAL(12, 2),
  net_amount DECIMAL(12, 2),

  -- Método de Pagamento
  payment_method VARCHAR(50), -- Ex: pix, boleto, transferência, cartão
  payment_reference VARCHAR(255), -- ID externo, número do boleto, etc

  -- Observações
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: documents (Documentos Gerados)
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Informações do Documento
  title VARCHAR(500) NOT NULL,
  document_type document_type NOT NULL,

  -- Conteúdo
  content TEXT NOT NULL,
  content_html TEXT,

  -- Arquivo
  file_url TEXT,
  file_path TEXT,
  file_size BIGINT, -- Em bytes
  mime_type VARCHAR(100),

  -- IA e Geração
  generated_by_ai BOOLEAN DEFAULT FALSE,
  ai_model VARCHAR(100), -- Ex: gemini-2.5-flash
  ai_prompt TEXT,

  -- Versionamento
  version INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Status
  is_draft BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,

  -- Metadados
  tags TEXT[],
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ
);

-- ============================================
-- TABELA: workflow_history (Histórico de Mudanças)
-- ============================================
CREATE TABLE workflow_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Mudança de Etapa
  from_step workflow_step,
  to_step workflow_step NOT NULL,

  -- Observações
  notes TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: activities (Log de Atividades)
-- ============================================
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Entidade relacionada
  entity_type VARCHAR(50) NOT NULL, -- 'lead', 'project', 'task', 'payment', 'document'
  entity_id UUID NOT NULL,

  -- Ação
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'status_changed', etc
  description TEXT,

  -- Mudanças (opcional)
  changes JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

-- Leads
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_email ON leads(email);

-- Clients
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_lead_id ON clients(lead_id);
CREATE INDEX idx_clients_email ON clients(email);

-- Projects
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_current_step ON projects(current_step);
CREATE INDEX idx_projects_is_active ON projects(is_active);
CREATE INDEX idx_projects_deadline ON projects(deadline);

-- Tasks
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_position ON tasks(position);

-- Payments
CREATE INDEX idx_payments_project_id ON payments(project_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);

-- Documents
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_lead_id ON documents(lead_id);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_is_draft ON documents(is_draft);

-- Workflow History
CREATE INDEX idx_workflow_history_project_id ON workflow_history(project_id);
CREATE INDEX idx_workflow_history_created_at ON workflow_history(created_at DESC);

-- Activities
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_entity_type ON activities(entity_type);
CREATE INDEX idx_activities_entity_id ON activities(entity_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para registrar mudanças de workflow
CREATE OR REPLACE FUNCTION log_workflow_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_step IS DISTINCT FROM NEW.current_step THEN
    INSERT INTO workflow_history (project_id, user_id, from_step, to_step)
    VALUES (NEW.id, NEW.user_id, OLD.current_step, NEW.current_step);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_project_workflow_change
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION log_workflow_change();

-- Função para atualizar completed_at nas tasks
CREATE OR REPLACE FUNCTION update_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_completed_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_completed_at();

-- Função para registrar atividades automaticamente
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_entity_type TEXT;
BEGIN
  -- Determinar a ação
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
  END IF;

  -- Determinar o tipo de entidade
  v_entity_type := TG_TABLE_NAME;

  -- Registrar a atividade
  IF TG_OP = 'DELETE' THEN
    INSERT INTO activities (user_id, entity_type, entity_id, action)
    VALUES (OLD.user_id, v_entity_type, OLD.id, v_action);
  ELSE
    INSERT INTO activities (user_id, entity_type, entity_id, action)
    VALUES (NEW.user_id, v_entity_type, NEW.id, v_action);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers de log de atividades (opcional - pode gerar muito log)
-- Descomente se quiser ativar o log automático
-- CREATE TRIGGER log_lead_activity AFTER INSERT OR UPDATE OR DELETE ON leads
--   FOR EACH ROW EXECUTE FUNCTION log_activity();
-- CREATE TRIGGER log_project_activity AFTER INSERT OR UPDATE OR DELETE ON projects
--   FOR EACH ROW EXECUTE FUNCTION log_activity();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Ativar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso: usuários só podem ver/editar seus próprios dados

-- Users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Leads
CREATE POLICY "Users can view own leads" ON leads
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can insert own leads" ON leads
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can update own leads" ON leads
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can delete own leads" ON leads
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Clients
CREATE POLICY "Users can manage own clients" ON clients
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Projects
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Tasks
CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Payments
CREATE POLICY "Users can manage own payments" ON payments
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Documents
CREATE POLICY "Users can manage own documents" ON documents
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Workflow History
CREATE POLICY "Users can view own workflow history" ON workflow_history
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Activities
CREATE POLICY "Users can view own activities" ON activities
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View: Resumo Financeiro por Projeto
CREATE OR REPLACE VIEW project_financial_summary AS
SELECT
  p.id AS project_id,
  p.title AS project_title,
  p.value AS total_value,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'paid'), 0) AS paid_amount,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'pending'), 0) AS pending_amount,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'overdue'), 0) AS overdue_amount,
  p.value - COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'paid'), 0) AS remaining_amount,
  ROUND(
    (COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'paid'), 0) / NULLIF(p.value, 0)) * 100,
    2
  ) AS completion_percentage
FROM projects p
LEFT JOIN payments pay ON pay.project_id = p.id
GROUP BY p.id, p.title, p.value;

-- View: Dashboard Metrics
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT
  u.id AS user_id,
  -- Leads
  COUNT(DISTINCT l.id) AS total_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'lead') AS active_leads,
  -- Projetos
  COUNT(DISTINCT p.id) AS total_projects,
  COUNT(DISTINCT p.id) FILTER (WHERE p.is_active = TRUE) AS active_projects,
  -- Financeiro
  COALESCE(SUM(p.value), 0) AS total_project_value,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'paid'), 0) AS total_billed,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'pending'), 0) AS total_pending,
  -- Tarefas
  COUNT(DISTINCT t.id) AS total_tasks,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done') AS completed_tasks,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'doing') AS in_progress_tasks
FROM users u
LEFT JOIN leads l ON l.user_id = u.id
LEFT JOIN projects p ON p.user_id = u.id
LEFT JOIN payments pay ON pay.user_id = u.id
LEFT JOIN tasks t ON t.user_id = u.id
GROUP BY u.id;

-- ============================================
-- DADOS DE EXEMPLO (OPCIONAL)
-- ============================================

-- Inserir usuário de exemplo (comentado - descomentar se necessário)
-- INSERT INTO users (email, full_name, company_name)
-- VALUES ('demo@freeela.com', 'Freelancer Demo', 'Freeela Demo Co.');

-- ============================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================

COMMENT ON TABLE users IS 'Freelancers/Usuários do sistema';
COMMENT ON TABLE leads IS 'Leads e potenciais clientes';
COMMENT ON TABLE clients IS 'Clientes convertidos';
COMMENT ON TABLE projects IS 'Projetos ativos e arquivados';
COMMENT ON TABLE tasks IS 'Tarefas do kanban dos projetos';
COMMENT ON TABLE payments IS 'Pagamentos e faturamento dos projetos';
COMMENT ON TABLE documents IS 'Documentos gerados (contratos, propostas, briefings)';
COMMENT ON TABLE workflow_history IS 'Histórico de mudanças de etapas dos projetos';
COMMENT ON TABLE activities IS 'Log de atividades do sistema';
