-- Migration: Add start_date and end_date to tasks to support execution planning in calendar
-- Data: 2026-06-19

ALTER TABLE public.tasks ADD COLUMN start_date TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN end_date TIMESTAMPTZ;

-- Índices para performance de consultas de data
CREATE INDEX idx_tasks_start_date ON public.tasks(start_date);
CREATE INDEX idx_tasks_end_date ON public.tasks(end_date);
