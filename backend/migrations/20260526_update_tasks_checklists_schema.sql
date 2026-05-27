-- Migration: Add complexity and task association to tasks and checklists
-- Data: 2026-05-26
-- Descrição: Adiciona coluna 'complexity' na tabela de tasks, e colunas 'complexity' e 'task_id' na tabela de checklists para permitir a hierarquia Tarefa -> Checklists -> Checklist Items.

-- 1. Adiciona coluna 'complexity' na tabela 'tasks'
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS complexity TEXT;

-- 2. Adiciona coluna 'complexity' e 'task_id' na tabela 'checklists'
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS complexity TEXT;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- 3. Cria índice para a chave estrangeira task_id em checklists
CREATE INDEX IF NOT EXISTS idx_checklists_task_id ON public.checklists(task_id);
