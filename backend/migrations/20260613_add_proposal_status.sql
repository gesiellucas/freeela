-- ============================================
-- Migration: Add 'proposal' status to service_orders
-- Data: 2026-06-13
-- ============================================

-- 1. Adicionar o valor 'proposal' ao enum service_order_status
ALTER TYPE service_order_status ADD VALUE IF NOT EXISTS 'proposal';

-- 2. Atualizar a função do trigger para gerenciar timestamps de forma consistente
CREATE OR REPLACE FUNCTION set_service_order_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando a OS é aprovada, define approved_at
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.approved_at = NOW();
  END IF;

  -- Quando a OS é declinada, define closed_at
  IF NEW.status = 'declined' AND (OLD.status IS DISTINCT FROM 'declined') THEN
    NEW.closed_at = NOW();
  END IF;

  -- Se a OS voltar para rascunho, pendente ou proposta, limpa approved_at
  IF NEW.status IN ('draft', 'pending', 'proposal') THEN
    NEW.approved_at = NULL;
  END IF;

  -- Se a OS sair do status declinada, limpa closed_at
  IF NEW.status != 'declined' THEN
    NEW.closed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
