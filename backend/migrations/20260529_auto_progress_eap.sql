-- Migration: Recalculate EAP items progress recursively based on tasks status
-- Data: 2026-05-29

-- ============================================================
-- 1. Função recursiva de recálculo de nó da EAP
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_recalculate_eap_node(p_eap_item_id UUID)
RETURNS VOID AS $$
DECLARE
  v_has_children BOOLEAN;
  v_progress     DECIMAL(5,2);
  v_status       eap_item_status;
  v_total_tasks  INTEGER;
  v_done_tasks   INTEGER;
  v_parent_id    UUID;
BEGIN
  -- 1. Verificar se possui sub-itens na EAP
  SELECT EXISTS(SELECT 1 FROM public.eap_items WHERE parent_id = p_eap_item_id) INTO v_has_children;

  IF v_has_children THEN
    -- Média ponderada do progresso dos filhos imediatos
    SELECT COALESCE(SUM(percentual_concluido * peso) / NULLIF(SUM(peso), 0), 0)
    INTO v_progress
    FROM public.eap_items
    WHERE parent_id = p_eap_item_id;
  ELSE
    -- Cálculo com base nas tasks diretas
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
    INTO v_total_tasks, v_done_tasks
    FROM public.tasks
    WHERE eap_item_id = p_eap_item_id;

    IF v_total_tasks > 0 THEN
      v_progress := ROUND((v_done_tasks::decimal / v_total_tasks::decimal) * 100.0, 2);
    ELSE
      v_progress := 0.00;
    END IF;
  END IF;

  -- 2. Determinar status correspondente
  IF v_progress = 100 THEN
    v_status := 'Concluido'::eap_item_status;
  ELSIF v_progress > 0 THEN
    v_status := 'Em_Andamento'::eap_item_status;
  ELSE
    v_status := 'Planejado'::eap_item_status;
  END IF;

  -- 3. Obter parent_id antes de atualizar o registro
  SELECT parent_id INTO v_parent_id FROM public.eap_items WHERE id = p_eap_item_id;

  -- 4. Atualizar o item na base de dados
  UPDATE public.eap_items
  SET percentual_concluido = v_progress,
      status = v_status,
      updated_at = NOW()
  WHERE id = p_eap_item_id
    AND (percentual_concluido IS DISTINCT FROM v_progress OR status IS DISTINCT FROM v_status);

  -- 5. Se tiver pai, recalcula recursivamente subindo a árvore
  IF v_parent_id IS NOT NULL THEN
    PERFORM public.fn_recalculate_eap_node(v_parent_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. Função de trigger para sincronização a partir de tasks
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_tasks_eap_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.eap_item_id IS NOT NULL THEN
      PERFORM public.fn_recalculate_eap_node(NEW.eap_item_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Se mudou de item de EAP, recalcula a EAP antiga e a nova
    IF OLD.eap_item_id IS DISTINCT FROM NEW.eap_item_id THEN
      IF OLD.eap_item_id IS NOT NULL THEN
        PERFORM public.fn_recalculate_eap_node(OLD.eap_item_id);
      END IF;
      IF NEW.eap_item_id IS NOT NULL THEN
        PERFORM public.fn_recalculate_eap_node(NEW.eap_item_id);
      END IF;
    -- Se alterou apenas o status da task
    ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.eap_item_id IS NOT NULL THEN
      PERFORM public.fn_recalculate_eap_node(NEW.eap_item_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.eap_item_id IS NOT NULL THEN
      PERFORM public.fn_recalculate_eap_node(OLD.eap_item_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. Vincular a trigger na tabela tasks
-- ============================================================
DROP TRIGGER IF EXISTS trigger_tasks_eap_sync ON public.tasks;
CREATE TRIGGER trigger_tasks_eap_sync
  AFTER INSERT OR UPDATE OF status, eap_item_id OR DELETE
  ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_tasks_eap_sync();
