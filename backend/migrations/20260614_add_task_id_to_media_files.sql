-- Migration: Add task_id column to media_files table
-- Data: 2026-06-14

ALTER TABLE public.media_files ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_media_files_task_id ON public.media_files(task_id);
