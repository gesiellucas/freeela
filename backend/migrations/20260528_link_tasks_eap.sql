-- Migration: Link Kanban Tasks to EAP Items
-- Data: 2026-05-28

-- 1. Adicionar coluna eap_item_id na tabela tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS eap_item_id UUID REFERENCES public.eap_items(id) ON DELETE SET NULL;

-- 2. Criar índice de performance para a chave estrangeira eap_item_id
CREATE INDEX IF NOT EXISTS idx_tasks_eap_item_id ON public.tasks(eap_item_id);
