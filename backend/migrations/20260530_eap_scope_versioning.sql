-- Migration: EAP Scope Versioning and Cloning
-- Data: 2026-05-30

-- ============================================================
-- 1. Criar Tabela scope_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scope_versions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id              UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  commercial_agreement_id UUID REFERENCES public.commercial_agreements(id) ON DELETE SET NULL,
  version_number          INTEGER NOT NULL DEFAULT 1,
  status                  TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de busca e unicidade
CREATE INDEX IF NOT EXISTS idx_scope_versions_user_id       ON public.scope_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_scope_versions_project_id    ON public.scope_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_scope_versions_agreement_id  ON public.scope_versions(commercial_agreement_id);

-- Restrição: Apenas uma versão ativa por projeto
CREATE UNIQUE INDEX IF NOT EXISTS idx_scope_versions_active_project 
  ON public.scope_versions(project_id) 
  WHERE (status = 'active');

-- RLS para scope_versions
ALTER TABLE public.scope_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scope_versions_crud" ON public.scope_versions;
CREATE POLICY "scope_versions_crud" ON public.scope_versions FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Trigger para updated_at em scope_versions
CREATE TRIGGER update_scope_versions_updated_at BEFORE UPDATE ON public.scope_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. Alterar Tabela eap
-- ============================================================

-- Remover índice antigo de unicidade por projeto
DROP INDEX IF EXISTS public.idx_eap_project_id;
DROP INDEX IF EXISTS public.idx_eap_project_id_old;

-- Adicionar coluna scope_version_id
ALTER TABLE public.eap ADD COLUMN IF NOT EXISTS scope_version_id UUID REFERENCES public.scope_versions(id) ON DELETE CASCADE;

-- Criar índice de unicidade por projeto + versão de escopo
CREATE UNIQUE INDEX IF NOT EXISTS idx_eap_project_scope_version ON public.eap(project_id, scope_version_id);

-- ============================================================
-- 3. Função para Clonar Itens de EAP (Level-by-Level)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_clone_eap_items(p_from_eap_id UUID, p_to_eap_id UUID)
RETURNS VOID AS $$
DECLARE
  v_level INTEGER := 1;
  v_max_level INTEGER;
  v_row RECORD;
BEGIN
  -- Cria tabela temporária para mapear IDs antigos aos novos
  CREATE TEMP TABLE IF NOT EXISTS temp_eap_id_map (
    old_id UUID PRIMARY KEY,
    new_id UUID NOT NULL
  ) ON COMMIT DROP;

  -- Obter nível máximo da EAP de origem
  SELECT COALESCE(MAX(nivel), 1) INTO v_max_level FROM public.eap_items WHERE eap_id = p_from_eap_id;

  WHILE v_level <= v_max_level LOOP
    -- Inserir todos os itens do nível atual
    FOR v_row IN 
      SELECT * FROM public.eap_items 
      WHERE eap_id = p_from_eap_id AND nivel = v_level
    LOOP
      DECLARE
        v_new_id UUID := gen_random_uuid();
        v_new_parent_id UUID := NULL;
      BEGIN
        -- Mapear parent_id do novo nó com base no nó pai já inserido no nível anterior
        IF v_row.parent_id IS NOT NULL THEN
          SELECT new_id INTO v_new_parent_id FROM temp_eap_id_map WHERE old_id = v_row.parent_id;
        END IF;

        -- Inserir novo item clonado com progresso resetado
        INSERT INTO public.eap_items (
          id, eap_id, parent_id, codigo_estruturado, nome, descricao,
          tipo_item, nivel, ordem, status, responsavel_id, cliente_visivel,
          data_inicio_planejada, data_fim_planejada, esforco_estimado_horas,
          custo_estimado, peso, criterio_aceite, percentual_concluido, metadata
        ) VALUES (
          v_new_id, p_to_eap_id, v_new_parent_id, v_row.codigo_estruturado, v_row.nome, v_row.descricao,
          v_row.tipo_item, v_row.nivel, v_row.ordem, 'Planejado'::eap_item_status, v_row.responsavel_id, v_row.cliente_visivel,
          v_row.data_inicio_planejada, v_row.data_fim_planejada, v_row.esforco_estimado_horas,
          v_row.custo_estimado, v_row.peso, v_row.criterio_aceite, 0.00, v_row.metadata
        );

        -- Guardar mapeamento de IDs
        INSERT INTO temp_eap_id_map (old_id, new_id) VALUES (v_row.id, v_new_id);
      END;
    END LOOP;

    v_level := v_level + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. Função Principal para Versionar e Clonar EAP
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_create_new_eap_version(
  p_project_id UUID,
  p_user_id UUID,
  p_agreement_id UUID,
  p_notes TEXT
)
RETURNS UUID AS $$
DECLARE
  v_old_version RECORD;
  v_new_version_id UUID;
  v_new_version_number INTEGER := 1;
  v_old_eap RECORD;
  v_new_eap_id UUID;
BEGIN
  -- 1. Obter a versão de escopo ativa atual
  SELECT * INTO v_old_version 
  FROM public.scope_versions 
  WHERE project_id = p_project_id AND status = 'active'
  LIMIT 1;

  IF FOUND THEN
    -- Incrementar versão
    v_new_version_number := v_old_version.version_number + 1;
    
    -- Arquivar a versão antiga
    UPDATE public.scope_versions 
    SET status = 'archived', updated_at = NOW() 
    WHERE id = v_old_version.id;
  END IF;

  -- 2. Criar a nova versão de escopo ativa
  INSERT INTO public.scope_versions (
    user_id, project_id, commercial_agreement_id, version_number, status, notes
  ) VALUES (
    p_user_id, p_project_id, p_agreement_id, v_new_version_number, 'active', p_notes
  ) RETURNING id INTO v_new_version_id;

  -- 3. Buscar a EAP antiga associada à versão antiga
  IF FOUND AND v_old_version.id IS NOT NULL THEN
    SELECT * INTO v_old_eap FROM public.eap WHERE scope_version_id = v_old_version.id LIMIT 1;
    
    IF FOUND THEN
      -- Criar nova EAP vinculada à nova versão
      INSERT INTO public.eap (
        project_id, user_id, name, description, scope_version_id
      ) VALUES (
        p_project_id, p_user_id, v_old_eap.name, v_old_eap.description, v_new_version_id
      ) RETURNING id INTO v_new_eap_id;

      -- Clonar itens de EAP
      PERFORM public.fn_clone_eap_items(v_old_eap.id, v_new_eap_id);
    END IF;
  END IF;

  RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. Script de Backfill (Migração de EAPs Existentes)
-- ============================================================
DO $$
DECLARE
  v_eap_row RECORD;
  v_scope_id UUID;
  v_agreement_id UUID;
BEGIN
  -- Loop pelas EAPs que não possuem scope_version_id
  FOR v_eap_row IN SELECT * FROM public.eap WHERE scope_version_id IS NULL LOOP
    -- Buscar um contrato ativo correspondente do projeto para vincular (se houver)
    SELECT id INTO v_agreement_id 
    FROM public.commercial_agreements 
    WHERE project_id = v_eap_row.project_id AND type = 'contract' 
    LIMIT 1;

    -- Criar scope_version inicial
    INSERT INTO public.scope_versions (
      user_id, project_id, commercial_agreement_id, version_number, status, notes
    ) VALUES (
      v_eap_row.user_id, v_eap_row.project_id, v_agreement_id, 1, 'active', 'Versão inicial gerada por migração automatizada'
    ) RETURNING id INTO v_scope_id;

    -- Vincular a EAP ao scope_version
    UPDATE public.eap SET scope_version_id = v_scope_id WHERE id = v_eap_row.id;
  END LOOP;
END $$;
