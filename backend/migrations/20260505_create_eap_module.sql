-- EAP Module Migration
-- Data: 2026-05-05

-- Tipo de Item da EAP
CREATE TYPE eap_item_type AS ENUM (
  'Fase',
  'Entregavel',
  'Pacote_Trabalho',
  'Tarefa'
);

-- Status do Item da EAP
CREATE TYPE eap_item_status AS ENUM (
  'Planejado',
  'Em_Andamento',
  'Aguardando_Aprovacao',
  'Concluido',
  'Cancelado'
);

-- ============================================
-- TABELA: eap (Estrutura Analítica do Projeto)
-- ============================================
CREATE TABLE eap (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Informações Gerais
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Configurações
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apenas uma EAP ativa por projeto
CREATE UNIQUE INDEX idx_eap_project_id ON eap(project_id);

-- ============================================
-- TABELA: eap_items (Itens da EAP)
-- ============================================
CREATE TABLE eap_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  eap_id UUID NOT NULL REFERENCES eap(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES eap_items(id) ON DELETE SET NULL,
  
  -- Identificação e Hierarquia
  codigo_estruturado VARCHAR(100) NOT NULL, -- Ex: "1.2.1"
  nome VARCHAR(500) NOT NULL,
  descricao TEXT,
  tipo_item eap_item_type NOT NULL DEFAULT 'Pacote_Trabalho',
  nivel INTEGER NOT NULL DEFAULT 1,
  ordem INTEGER NOT NULL DEFAULT 0,
  
  -- Controle de Execução
  status eap_item_status DEFAULT 'Planejado',
  responsavel_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cliente_visivel BOOLEAN DEFAULT FALSE,
  
  -- Cronograma
  data_inicio_planejada DATE,
  data_fim_planejada DATE,
  data_inicio_real DATE,
  data_fim_real DATE,
  
  -- Esforço e Custo
  esforco_estimado_horas DECIMAL(10, 2) DEFAULT 0,
  esforco_real_horas DECIMAL(10, 2) DEFAULT 0,
  custo_estimado DECIMAL(12, 2) DEFAULT 0,
  custo_real DECIMAL(12, 2) DEFAULT 0,
  
  -- Progresso e Qualidade
  percentual_concluido DECIMAL(5, 2) DEFAULT 0 CHECK (percentual_concluido >= 0 AND percentual_concluido <= 100),
  peso DECIMAL(5, 2) DEFAULT 1,
  criterio_aceite TEXT,
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_eap_items_eap_id ON eap_items(eap_id);
CREATE INDEX idx_eap_items_parent_id ON eap_items(parent_id);
CREATE INDEX idx_eap_items_responsavel_id ON eap_items(responsavel_id);

-- Trigger para updated_at
CREATE TRIGGER update_eap_updated_at BEFORE UPDATE ON eap
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eap_items_updated_at BEFORE UPDATE ON eap_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE eap ENABLE ROW LEVEL SECURITY;
ALTER TABLE eap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own eap" ON eap
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can manage own eap_items" ON eap_items
  FOR ALL USING (
    eap_id IN (SELECT id FROM eap WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  );
