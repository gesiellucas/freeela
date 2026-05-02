
-- ============================================
-- FREEELA - DADOS DE SEED PARA DESENVOLVIMENTO
-- ============================================
-- Este arquivo contém dados de exemplo para facilitar o desenvolvimento e testes

-- Limpar dados existentes (cuidado em produção!)
TRUNCATE TABLE activities, workflow_history, documents, payments, tasks, projects, clients, leads, users CASCADE;

-- ============================================
-- USUÁRIO DE EXEMPLO
-- ============================================
INSERT INTO users (id, email, full_name, company_name, phone, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'freelancer@freeela.com',
  'João Developer',
  'JD Freelance Studio',
  '+55 11 99999-9999',
  '{
    "theme": "light",
    "currency": "BRL",
    "language": "pt-BR",
    "notifications": {
      "email": true,
      "push": true
    }
  }'::jsonb
);

-- ============================================
-- LEADS DE EXEMPLO
-- ============================================
INSERT INTO leads (id, user_id, name, email, phone, company, demand, estimated_value, status, priority, source, notes)
VALUES
  -- Lead ativo
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Alpha Tech Solutions',
    'hi@alphatech.io',
    '+55 11 3333-4444',
    'Alpha Tech Ltda',
    'Plataforma SaaS E-commerce completa com gestão de produtos, carrinho de compras, checkout integrado e painel administrativo',
    12000.00,
    'lead',
    1,
    'linkedin',
    'Cliente em potencial com alto ticket. Mostrou muito interesse em nossa stack tecnológica.'
  ),
  -- Lead em briefing
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Consultoria Lima & Associados',
    'contato@limaconsult.com',
    '+55 11 2222-3333',
    'Lima Consultoria Ltda',
    'Site institucional moderno + Blog integrado com CMS',
    3500.00,
    'briefing',
    0,
    'indicação',
    'Indicação do cliente Beta Corp. Aguardando agendamento da reunião de briefing.'
  ),
  -- Lead em proposta
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Startup InnovateTech',
    'founders@innovatetech.com',
    '+55 21 9888-7777',
    'InnovateTech Inovação',
    'MVP de aplicativo mobile para gestão de entregas',
    25000.00,
    'proposal',
    2,
    'website',
    'Startup em fase seed. Proposta enviada em 10/02. Aguardando resposta até 20/02.'
  );

-- ============================================
-- CLIENTES CONVERTIDOS
-- ============================================
INSERT INTO clients (id, user_id, lead_id, name, email, phone, company, address, city, state, country, zip_code, cpf_cnpj, contact_person, contact_position, tags)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'Beta Corporation',
    'tech@betacorp.com.br',
    '+55 11 4444-5555',
    'Beta Corp Tecnologia SA',
    'Av. Paulista, 1000 - Conj 501',
    'São Paulo',
    'SP',
    'Brasil',
    '01310-100',
    '12.345.678/0001-90',
    'Maria Silva',
    'CTO',
    ARRAY['corporativo', 'tech', 'recorrente']
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'Loja Virtual Fashion',
    'contato@fashionstore.com.br',
    '+55 11 5555-6666',
    'Fashion Store E-commerce Ltda',
    'Rua Oscar Freire, 500',
    'São Paulo',
    'SP',
    'Brasil',
    '01426-001',
    '98.765.432/0001-10',
    'Carlos Mendes',
    'Proprietário',
    ARRAY['e-commerce', 'fashion', 'pme']
  );

-- ============================================
-- PROJETOS
-- ============================================
INSERT INTO projects (id, user_id, client_id, title, description, current_step, is_active, value, currency, deadline, start_date, folders_created, folder_path, tags, color)
VALUES
  -- Projeto em desenvolvimento
  (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'SaaS E-commerce Beta Corp',
    'Desenvolvimento de plataforma SaaS completa para e-commerce B2B com integrações de pagamento, logística e CRM',
    'development',
    TRUE,
    45000.00,
    'BRL',
    '2026-06-15',
    '2026-01-15',
    TRUE,
    '/Users/freelancer/Projects/BetaCorp_SaaS',
    ARRAY['saas', 'e-commerce', 'react', 'nextjs', 'postgresql'],
    '#3B82F6'
  ),
  -- Projeto em fase de pagamento
  (
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'Loja Virtual Fashion - Redesign',
    'Redesign completo da loja virtual com foco em UX/UI moderno e responsivo',
    'payment',
    TRUE,
    8500.00,
    'BRL',
    '2026-03-30',
    '2026-02-01',
    TRUE,
    '/Users/freelancer/Projects/FashionStore_Redesign',
    ARRAY['design', 'e-commerce', 'ux', 'ui'],
    '#8B5CF6'
  );

-- ============================================
-- TAREFAS (KANBAN)
-- ============================================
INSERT INTO tasks (id, project_id, user_id, title, description, status, task_type, priority, position, due_date, estimated_hours)
VALUES
  -- Projeto 1 - SaaS E-commerce
  (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Configurar ambiente Next.js com TypeScript',
    'Setup inicial do projeto com Next.js 14, TypeScript, Tailwind CSS e configuração do ESLint',
    'done',
    'technical',
    2,
    1,
    '2026-01-18',
    4.0
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Modelagem de Banco de Dados',
    'Criar diagrama ER e implementar schema PostgreSQL com todas as entidades do sistema',
    'doing',
    'technical',
    2,
    2,
    '2026-02-15',
    8.0
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Integração Stripe API',
    'Implementar processamento de pagamentos com Stripe: checkout, webhooks e reconciliação',
    'todo',
    'technical',
    2,
    3,
    '2026-03-01',
    12.0
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Frontend Dashboard Admin',
    'Desenvolver interface administrativa com tabelas, filtros e gráficos',
    'todo',
    'technical',
    1,
    4,
    '2026-03-20',
    16.0
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Reunião de status semanal',
    'Alinhamento semanal com o cliente sobre progresso e próximos passos',
    'todo',
    'meeting',
    0,
    5,
    '2026-02-17',
    1.0
  ),
  -- Projeto 2 - Loja Fashion
  (
    '40000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Design System e Prototipagem',
    'Criar design system no Figma com componentes reutilizáveis',
    'done',
    'technical',
    2,
    1,
    '2026-02-05',
    8.0
  ),
  (
    '40000000-0000-0000-0000-000000000007',
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Implementação do frontend',
    'Desenvolver todas as páginas responsivas seguindo o design aprovado',
    'done',
    'technical',
    2,
    2,
    '2026-02-20',
    20.0
  ),
  (
    '40000000-0000-0000-0000-000000000008',
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Testes e Deploy',
    'Testes de QA, correções e deploy em produção',
    'doing',
    'technical',
    2,
    3,
    '2026-03-01',
    6.0
  );

-- ============================================
-- PAGAMENTOS
-- ============================================
INSERT INTO payments (id, project_id, user_id, description, amount, currency, status, due_date, paid_date, invoice_number, payment_method, notes)
VALUES
  -- Projeto 1 - Parcelas do SaaS
  (
    '50000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Entrada (30%)',
    13500.00,
    'BRL',
    'paid',
    '2026-01-20',
    '2026-01-18',
    'INV-2026-001',
    'transferência',
    'Pagamento da entrada. Cliente solicitou NF paulista.'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Segunda parcela (35%)',
    15750.00,
    'BRL',
    'pending',
    '2026-03-15',
    NULL,
    'INV-2026-002',
    'pix',
    'A ser pago após entrega do MVP funcional.'
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Parcela final (35%)',
    15750.00,
    'BRL',
    'pending',
    '2026-06-20',
    NULL,
    NULL,
    'transferência',
    'Pagamento final após go-live em produção.'
  ),
  -- Projeto 2 - Pagamento do redesign
  (
    '50000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Pagamento integral',
    8500.00,
    'BRL',
    'pending',
    '2026-03-05',
    NULL,
    'INV-2026-003',
    'boleto',
    'Cliente solicitou boleto bancário. Prazo 5 dias após entrega.'
  );

-- ============================================
-- DOCUMENTOS
-- ============================================
INSERT INTO documents (id, user_id, project_id, lead_id, title, document_type, content, generated_by_ai, ai_model, is_draft, tags)
VALUES
  -- Proposta para lead
  (
    '60000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    '10000000-0000-0000-0000-000000000003',
    'Proposta Comercial - InnovateTech MVP',
    'proposal',
    E'# PROPOSTA COMERCIAL\n\n## Cliente: InnovateTech\n\n### O Problema\nA gestão de entregas atualmente é feita de forma manual, causando atrasos e falta de rastreabilidade.\n\n### Nossa Solução\nDesenvolvimento de MVP mobile (iOS/Android) com:\n- Rastreamento em tempo real\n- Gestão de rotas otimizada\n- Notificações push\n- Dashboard administrativo\n\n### Cronograma\n- Sprint 1-2: Design e prototipagem (2 semanas)\n- Sprint 3-6: Desenvolvimento (4 semanas)\n- Sprint 7: Testes e ajustes (1 semana)\n\n### Investimento\nR$ 25.000,00 (parcelado em 3x)\n\n### Próximos Passos\n1. Aprovação da proposta\n2. Assinatura do contrato\n3. Kickoff meeting',
    TRUE,
    'gemini-2.5-flash',
    FALSE,
    ARRAY['proposta', 'mvp', 'mobile']
  ),
  -- Contrato do projeto 1
  (
    '60000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    NULL,
    'Contrato de Prestação de Serviços - Beta Corp',
    'contract',
    E'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE DESENVOLVIMENTO DE SOFTWARE\n\nCONTRATANTE: Beta Corp Tecnologia SA\nCONTRATADO: João Developer - JD Freelance Studio\n\nCLÁUSULA 1 - DO OBJETO\nDesenvolvimento de plataforma SaaS E-commerce conforme especificações técnicas anexas.\n\nCLÁUSULA 2 - DO PRAZO\nPrazo de entrega: 15/06/2026\n\nCLÁUSULA 3 - DO VALOR E PAGAMENTO\nValor total: R$ 45.000,00\n- Entrada (30%): R$ 13.500,00\n- Segunda parcela (35%): R$ 15.750,00\n- Parcela final (35%): R$ 15.750,00\n\nCLÁUSULA 4 - DA PROPRIEDADE INTELECTUAL\nTodo código desenvolvido será de propriedade exclusiva do CONTRATANTE.\n\nCLÁUSULA 5 - DO FORO\nForo da Comarca de São Paulo/SP.',
    FALSE,
    NULL,
    FALSE,
    ARRAY['contrato', 'juridico', 'assinado']
  ),
  -- Briefing
  (
    '60000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    NULL,
    'Briefing Técnico - SaaS E-commerce',
    'briefing',
    E'# BRIEFING TÉCNICO\n\n## Informações do Cliente\n- **Empresa:** Beta Corporation\n- **Setor:** Tecnologia B2B\n- **Projeto:** Plataforma SaaS E-commerce\n\n## Objetivos\n1. Reduzir tempo de processamento de pedidos em 60%\n2. Centralizar gestão de múltiplos sellers\n3. Automatizar integrações com ERPs\n\n## Stack Tecnológico Preferido\n- Frontend: React/Next.js\n- Backend: Node.js/Express\n- Banco: PostgreSQL\n- Cloud: AWS\n\n## Integrações Necessárias\n- Stripe (pagamentos)\n- Correios API (frete)\n- Salesforce CRM\n\n## Público-alvo\n- Gestores de e-commerce B2B\n- Faixa etária: 30-50 anos\n- Tech-savvy\n\n## Referências Visuais\n- Shopify Admin\n- Stripe Dashboard\n- Linear (UX clean)',
    TRUE,
    'gemini-2.5-flash',
    FALSE,
    ARRAY['briefing', 'saas']
  );

-- ============================================
-- HISTÓRICO DE WORKFLOW
-- ============================================
INSERT INTO workflow_history (project_id, user_id, from_step, to_step, notes, created_at)
VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'initial_contact',
    'understanding',
    'Lead convertido após primeira reunião',
    '2026-01-15 10:00:00'
  ),
  (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'understanding',
    'proposal',
    'Briefing completo. Proposta enviada',
    '2026-01-17 14:30:00'
  ),
  (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'proposal',
    'contract',
    'Proposta aprovada. Contrato assinado',
    '2026-01-20 16:00:00'
  ),
  (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'contract',
    'development',
    'Kickoff realizado. Desenvolvimento iniciado',
    '2026-01-22 09:00:00'
  );

-- ============================================
-- LOG DE ATIVIDADES
-- ============================================
INSERT INTO activities (user_id, entity_type, entity_id, action, description, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'lead',
    '10000000-0000-0000-0000-000000000001',
    'created',
    'Novo lead adicionado: Alpha Tech Solutions',
    '2026-02-01 10:30:00'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'project',
    '30000000-0000-0000-0000-000000000001',
    'created',
    'Projeto criado: SaaS E-commerce Beta Corp',
    '2026-01-15 11:00:00'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'task',
    '40000000-0000-0000-0000-000000000001',
    'status_changed',
    'Tarefa "Configurar ambiente Next.js" concluída',
    '2026-01-18 18:30:00'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'payment',
    '50000000-0000-0000-0000-000000000001',
    'created',
    'Pagamento de entrada recebido: R$ 13.500,00',
    '2026-01-18 15:00:00'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'document',
    '60000000-0000-0000-0000-000000000001',
    'created',
    'Proposta gerada com IA para InnovateTech',
    '2026-02-10 14:20:00'
  );

-- ============================================
-- ESTATÍSTICAS FINAIS
-- ============================================

-- Ver resumo financeiro
SELECT * FROM project_financial_summary;

-- Ver métricas do dashboard
SELECT * FROM dashboard_metrics;
