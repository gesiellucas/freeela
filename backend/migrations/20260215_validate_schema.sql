-- ============================================
-- FREEELA - SCRIPT DE VALIDAÇÃO
-- ============================================
-- Verifica se a migration foi aplicada corretamente
-- Execute este script após rodar a migration inicial

\echo '🔍 Iniciando validação do schema...'
\echo ''

-- ============================================
-- 1. VERIFICAR EXTENSÕES
-- ============================================
\echo '📦 1. Verificando extensões...'
SELECT
  CASE
    WHEN COUNT(*) = 1 THEN '✅ uuid-ossp instalado'
    ELSE '❌ uuid-ossp NÃO encontrado'
  END as status
FROM pg_extension
WHERE extname = 'uuid-ossp';

\echo ''

-- ============================================
-- 2. VERIFICAR TIPOS ENUM
-- ============================================
\echo '🏷️  2. Verificando tipos ENUM...'
SELECT
  typname as tipo,
  '✅' as status
FROM pg_type
WHERE typname IN (
  'lead_status',
  'workflow_step',
  'task_status',
  'task_type',
  'payment_status',
  'document_type'
)
ORDER BY typname;

\echo ''
SELECT
  CASE
    WHEN COUNT(*) = 6 THEN '✅ Todos os 6 ENUMs criados'
    ELSE '⚠️  Apenas ' || COUNT(*) || ' de 6 ENUMs encontrados'
  END as resultado
FROM pg_type
WHERE typname IN (
  'lead_status',
  'workflow_step',
  'task_status',
  'task_type',
  'payment_status',
  'document_type'
);

\echo ''

-- ============================================
-- 3. VERIFICAR TABELAS
-- ============================================
\echo '📋 3. Verificando tabelas...'
SELECT
  tablename as tabela,
  '✅' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'leads',
    'clients',
    'projects',
    'tasks',
    'payments',
    'documents',
    'workflow_history',
    'activities'
  )
ORDER BY tablename;

\echo ''
SELECT
  CASE
    WHEN COUNT(*) = 9 THEN '✅ Todas as 9 tabelas criadas'
    ELSE '⚠️  Apenas ' || COUNT(*) || ' de 9 tabelas encontradas'
  END as resultado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'leads', 'clients', 'projects', 'tasks',
    'payments', 'documents', 'workflow_history', 'activities'
  );

\echo ''

-- ============================================
-- 4. VERIFICAR VIEWS
-- ============================================
\echo '👁️  4. Verificando views...'
SELECT
  viewname as view,
  '✅' as status
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'project_financial_summary',
    'dashboard_metrics'
  )
ORDER BY viewname;

\echo ''
SELECT
  CASE
    WHEN COUNT(*) = 2 THEN '✅ Ambas as views criadas'
    ELSE '⚠️  Apenas ' || COUNT(*) || ' de 2 views encontradas'
  END as resultado
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('project_financial_summary', 'dashboard_metrics');

\echo ''

-- ============================================
-- 5. VERIFICAR ÍNDICES
-- ============================================
\echo '🔎 5. Verificando índices...'
SELECT
  COUNT(*) as total_indices,
  CASE
    WHEN COUNT(*) >= 20 THEN '✅ Índices criados (' || COUNT(*) || ')'
    ELSE '⚠️  Poucos índices (' || COUNT(*) || ')'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'leads', 'clients', 'projects', 'tasks',
    'payments', 'documents', 'workflow_history', 'activities'
  );

\echo ''

-- ============================================
-- 6. VERIFICAR TRIGGERS
-- ============================================
\echo '⚡ 6. Verificando triggers...'
SELECT
  tgname as trigger_name,
  tgrelid::regclass as tabela,
  '✅' as status
FROM pg_trigger
WHERE tgname LIKE '%update%updated_at%'
   OR tgname LIKE '%log_%'
   OR tgname LIKE '%task_completed%'
ORDER BY tgname;

\echo ''
SELECT
  COUNT(DISTINCT tgname) as total_triggers,
  CASE
    WHEN COUNT(DISTINCT tgname) >= 8 THEN '✅ Triggers criados (' || COUNT(DISTINCT tgname) || ')'
    ELSE '⚠️  Poucos triggers (' || COUNT(DISTINCT tgname) || ')'
  END as status
FROM pg_trigger
WHERE tgname LIKE '%update%updated_at%'
   OR tgname LIKE '%log_%'
   OR tgname LIKE '%task_completed%';

\echo ''

-- ============================================
-- 7. VERIFICAR RLS (ROW LEVEL SECURITY)
-- ============================================
\echo '🔐 7. Verificando RLS...'
SELECT
  tablename as tabela,
  CASE
    WHEN rowsecurity THEN '✅ RLS ativado'
    ELSE '❌ RLS desativado'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'leads', 'clients', 'projects', 'tasks',
    'payments', 'documents', 'workflow_history', 'activities'
  )
ORDER BY tablename;

\echo ''

-- ============================================
-- 8. VERIFICAR POLÍTICAS RLS
-- ============================================
\echo '🛡️  8. Verificando políticas RLS...'
SELECT
  tablename as tabela,
  COUNT(*) as total_policies,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*) || ' políticas'
    ELSE '⚠️  Sem políticas'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- ============================================
-- 9. VERIFICAR FOREIGN KEYS
-- ============================================
\echo '🔗 9. Verificando foreign keys...'
SELECT
  COUNT(*) as total_fks,
  CASE
    WHEN COUNT(*) >= 15 THEN '✅ Foreign keys criadas (' || COUNT(*) || ')'
    ELSE '⚠️  Poucas FKs (' || COUNT(*) || ')'
  END as status
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public';

\echo ''

-- ============================================
-- 10. VERIFICAR CONSTRAINTS
-- ============================================
\echo '✓ 10. Verificando constraints...'
SELECT
  table_name as tabela,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND constraint_type IN ('CHECK', 'UNIQUE')
ORDER BY table_name, constraint_type;

\echo ''

-- ============================================
-- 11. TESTAR FUNÇÕES
-- ============================================
\echo '🔧 11. Testando funções...'
SELECT
  proname as funcao,
  '✅' as status
FROM pg_proc
WHERE proname IN (
  'update_updated_at_column',
  'log_workflow_change',
  'update_task_completed_at',
  'log_activity'
);

\echo ''

-- ============================================
-- 12. ESTATÍSTICAS FINAIS
-- ============================================
\echo '📊 12. Estatísticas do banco...'
\echo ''

SELECT
  'Tabelas' as tipo,
  COUNT(*) as total
FROM pg_tables
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Views' as tipo,
  COUNT(*) as total
FROM pg_views
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Índices' as tipo,
  COUNT(*) as total
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Triggers' as tipo,
  COUNT(DISTINCT tgname) as total
FROM pg_trigger
WHERE tgisinternal = false
UNION ALL
SELECT
  'Funções' as tipo,
  COUNT(*) as total
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
UNION ALL
SELECT
  'ENUMs' as tipo,
  COUNT(*) as total
FROM pg_type
WHERE typtype = 'e';

\echo ''
\echo '============================================'
\echo '✨ VALIDAÇÃO CONCLUÍDA'
\echo '============================================'
\echo ''
\echo '📝 Próximos passos:'
\echo '  1. Se houver erros (❌ ou ⚠️), revise a migration'
\echo '  2. Se tudo estiver OK (✅), pode popular com seed.sql'
\echo '  3. Configure as variáveis de ambiente (.env)'
\echo '  4. Teste a aplicação!'
\echo ''

-- ============================================
-- VERIFICAÇÃO FINAL - SUMMARY
-- ============================================
\echo '📊 RESUMO FINAL:'
\echo ''

DO $$
DECLARE
  tables_count INT;
  views_count INT;
  enums_count INT;
  indices_count INT;
  triggers_count INT;
  policies_count INT;
  success BOOLEAN := true;
BEGIN
  -- Contar elementos
  SELECT COUNT(*) INTO tables_count FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('users', 'leads', 'clients', 'projects', 'tasks', 'payments', 'documents', 'workflow_history', 'activities');

  SELECT COUNT(*) INTO views_count FROM pg_views
    WHERE schemaname = 'public'
      AND viewname IN ('project_financial_summary', 'dashboard_metrics');

  SELECT COUNT(*) INTO enums_count FROM pg_type
    WHERE typname IN ('lead_status', 'workflow_step', 'task_status', 'task_type', 'payment_status', 'document_type');

  SELECT COUNT(*) INTO indices_count FROM pg_indexes
    WHERE schemaname = 'public';

  SELECT COUNT(DISTINCT tgname) INTO triggers_count FROM pg_trigger
    WHERE tgisinternal = false;

  SELECT COUNT(*) INTO policies_count FROM pg_policies
    WHERE schemaname = 'public';

  -- Validar
  IF tables_count < 9 THEN
    RAISE NOTICE '❌ Faltam tabelas! Esperado: 9, Encontrado: %', tables_count;
    success := false;
  ELSE
    RAISE NOTICE '✅ Tabelas: % de 9', tables_count;
  END IF;

  IF views_count < 2 THEN
    RAISE NOTICE '❌ Faltam views! Esperado: 2, Encontrado: %', views_count;
    success := false;
  ELSE
    RAISE NOTICE '✅ Views: % de 2', views_count;
  END IF;

  IF enums_count < 6 THEN
    RAISE NOTICE '❌ Faltam ENUMs! Esperado: 6, Encontrado: %', enums_count;
    success := false;
  ELSE
    RAISE NOTICE '✅ ENUMs: % de 6', enums_count;
  END IF;

  RAISE NOTICE '📊 Índices criados: %', indices_count;
  RAISE NOTICE '⚡ Triggers ativos: %', triggers_count;
  RAISE NOTICE '🛡️  Políticas RLS: %', policies_count;
  RAISE NOTICE '';

  IF success THEN
    RAISE NOTICE '🎉 SCHEMA VÁLIDO! Migration aplicada com sucesso.';
  ELSE
    RAISE NOTICE '⚠️  SCHEMA INCOMPLETO! Revise a migration e tente novamente.';
  END IF;
END $$;

\echo ''
\echo 'Para mais detalhes, consulte: supabase/SCHEMA.md'
