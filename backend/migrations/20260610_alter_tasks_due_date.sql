-- Migration: Alter tasks.due_date to TIMESTAMPTZ to support time (hours and minutes)
-- Data: 2026-06-10

ALTER TABLE public.tasks ALTER COLUMN due_date TYPE TIMESTAMPTZ USING due_date::TIMESTAMPTZ;
