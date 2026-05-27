CREATE OR REPLACE FUNCTION public.log_workflow_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_step IS DISTINCT FROM NEW.current_step THEN
    INSERT INTO public.workflow_history (project_id, user_id, from_step, to_step)
    VALUES (NEW.id, NEW.user_id, OLD.current_step, NEW.current_step);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
