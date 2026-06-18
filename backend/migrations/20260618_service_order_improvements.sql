-- Migration: Service Order Improvements
-- Data: 2026-06-18

-- 1. Adicionar os valores 'cancelled' e 'completed' ao enum service_order_status
-- O comando ALTER TYPE ADD VALUE não pode rodar em bloco de transação em algumas versões do Postgres,
-- então encapsulamos em blocos anônimos DO com tratamento.
DO $$
BEGIN
  ALTER TYPE service_order_status ADD VALUE IF NOT EXISTS 'cancelled';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE service_order_status ADD VALUE IF NOT EXISTS 'completed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Atualizar a função do trigger para gerenciar timestamps de fechamento
CREATE OR REPLACE FUNCTION set_service_order_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando a OS é aprovada, define approved_at
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.approved_at = NOW();
  END IF;

  -- Quando a OS é declinada, cancelada ou concluída, define closed_at
  IF NEW.status IN ('declined', 'cancelled', 'completed') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.closed_at = NOW();
  END IF;

  -- Se a OS voltar para rascunho, pendente ou proposta, limpa approved_at e closed_at
  IF NEW.status IN ('draft', 'pending', 'proposal') THEN
    NEW.approved_at = NULL;
    NEW.closed_at = NULL;
  END IF;

  -- Se a OS for reaberta de concluída ou cancelada para aprovada, limpa closed_at
  IF NEW.status = 'approved' THEN
    NEW.closed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Função para distribuir valor planejado e horas da OS para as tarefas
CREATE OR REPLACE FUNCTION public.fn_distribute_service_order_values(p_service_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_planned_amount NUMERIC(12,2);
  v_estimated_hours NUMERIC(8,2);
  v_total_tasks INTEGER;
  v_dist_amount NUMERIC(12,2);
  v_dist_hours NUMERIC(8,2);
BEGIN
  -- Obter os valores da OS
  SELECT planned_amount, estimated_hours
  INTO v_planned_amount, v_estimated_hours
  FROM public.service_orders
  WHERE id = p_service_order_id;

  -- Contar o número de tarefas principais (parent_task_id IS NULL)
  SELECT COUNT(*)
  INTO v_total_tasks
  FROM public.tasks
  WHERE service_order_id = p_service_order_id AND parent_task_id IS NULL;

  -- Calcular e atualizar valores distribuídos nas tarefas principais
  IF v_total_tasks > 0 THEN
    v_dist_amount := COALESCE(v_planned_amount, 0) / v_total_tasks;
    v_dist_hours := COALESCE(v_estimated_hours, 0) / v_total_tasks;
    
    UPDATE public.tasks
    SET estimated_cost = v_dist_amount,
        estimated_hours = v_dist_hours
    WHERE service_order_id = p_service_order_id 
      AND parent_task_id IS NULL
      AND (estimated_cost IS DISTINCT FROM v_dist_amount OR estimated_hours IS DISTINCT FROM v_dist_hours);
  ELSE
    -- Se não há tarefas principais na OS, nada a fazer
    NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Função trigger nas tarefas para disparar a distribuição
CREATE OR REPLACE FUNCTION public.trg_tasks_distribute()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.service_order_id IS NOT NULL THEN
      PERFORM public.fn_distribute_service_order_values(NEW.service_order_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.service_order_id IS DISTINCT FROM NEW.service_order_id THEN
      IF OLD.service_order_id IS NOT NULL THEN
        PERFORM public.fn_distribute_service_order_values(OLD.service_order_id);
      END IF;
      if NEW.service_order_id IS NOT NULL THEN
        PERFORM public.fn_distribute_service_order_values(NEW.service_order_id);
      END IF;
    ELSIF OLD.parent_task_id IS DISTINCT FROM NEW.parent_task_id THEN
      IF NEW.service_order_id IS NOT NULL THEN
        PERFORM public.fn_distribute_service_order_values(NEW.service_order_id);
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.service_order_id IS NOT NULL THEN
      PERFORM public.fn_distribute_service_order_values(OLD.service_order_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_tasks_distribute ON public.tasks;
CREATE TRIGGER trigger_tasks_distribute
  AFTER INSERT OR UPDATE OF service_order_id, parent_task_id OR DELETE
  ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_tasks_distribute();

-- 5. Função trigger em service_orders para redistribuir quando alterar valor/horas da OS
CREATE OR REPLACE FUNCTION public.trg_service_orders_distribute()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.planned_amount IS DISTINCT FROM NEW.planned_amount) OR (OLD.estimated_hours IS DISTINCT FROM NEW.estimated_hours) THEN
    PERFORM public.fn_distribute_service_order_values(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_service_orders_distribute ON public.service_orders;
CREATE TRIGGER trigger_service_orders_distribute
  AFTER UPDATE OF planned_amount, estimated_hours
  ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_service_orders_distribute();

-- 6. Função para recalcular o progresso da OS baseado no progresso das tarefas e subtarefas
CREATE OR REPLACE FUNCTION public.fn_recalculate_service_order_progress(p_service_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_progress INTEGER := 0;
  v_total_tasks INTEGER;
  v_task_record RECORD;
  v_task_pct DECIMAL(5,2);
  v_sub_total INTEGER;
  v_sub_done INTEGER;
BEGIN
  -- Contar o número de tarefas principais (parent_task_id IS NULL)
  SELECT COUNT(*) INTO v_total_tasks
  FROM public.tasks
  WHERE service_order_id = p_service_order_id AND parent_task_id IS NULL;

  IF v_total_tasks > 0 THEN
    FOR v_task_record IN
      SELECT id, status FROM public.tasks
      WHERE service_order_id = p_service_order_id AND parent_task_id IS NULL
    LOOP
      -- Verificar se possui subtarefas
      SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
      INTO v_sub_total, v_sub_done
      FROM public.tasks
      WHERE parent_task_id = v_task_record.id;

      IF v_sub_total > 0 THEN
        v_task_pct := (v_sub_done::decimal / v_sub_total::decimal) * 100.0;
      ELSE
        IF v_task_record.status = 'done' THEN
          v_task_pct := 100.0;
        ELSE
          v_task_pct := 0.0;
        END IF;
      END IF;

      -- Adiciona a parte truncada do progresso da tarefa ao total (exatamente como no frontend)
      v_progress := v_progress + FLOOR(v_task_pct / v_total_tasks);
    END LOOP;
  END IF;

  -- Atualizar o progresso na service_orders
  UPDATE public.service_orders
  SET progress_percent = v_progress,
      updated_at = NOW()
  WHERE id = p_service_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Função trigger nas tarefas para recalcular o progresso da OS correspondente
CREATE OR REPLACE FUNCTION public.trg_tasks_service_order_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.service_order_id IS NOT NULL THEN
      PERFORM public.fn_recalculate_service_order_progress(NEW.service_order_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.service_order_id IS DISTINCT FROM NEW.service_order_id THEN
      IF OLD.service_order_id IS NOT NULL THEN
        PERFORM public.fn_recalculate_service_order_progress(OLD.service_order_id);
      END IF;
      IF NEW.service_order_id IS NOT NULL THEN
        PERFORM public.fn_recalculate_service_order_progress(NEW.service_order_id);
      END IF;
    ELSIF (NEW.status IS DISTINCT FROM OLD.status OR NEW.parent_task_id IS DISTINCT FROM OLD.parent_task_id) AND NEW.service_order_id IS NOT NULL THEN
      PERFORM public.fn_recalculate_service_order_progress(NEW.service_order_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.service_order_id IS NOT NULL THEN
      PERFORM public.fn_recalculate_service_order_progress(OLD.service_order_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_tasks_service_order_sync ON public.tasks;
CREATE TRIGGER trigger_tasks_service_order_sync
  AFTER INSERT OR UPDATE OF status, service_order_id, parent_task_id OR DELETE
  ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_tasks_service_order_sync();

-- 8. Executar redistribuição e recálculo de progresso para todas as OSs existentes
DO $$
DECLARE
  v_os RECORD;
BEGIN
  FOR v_os IN SELECT id FROM public.service_orders LOOP
    PERFORM public.fn_distribute_service_order_values(v_os.id);
    PERFORM public.fn_recalculate_service_order_progress(v_os.id);
  END LOOP;
END $$;
