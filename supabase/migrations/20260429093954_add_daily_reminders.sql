-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the function to send daily reminders
CREATE OR REPLACE FUNCTION public.send_daily_event_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (userid, title, message, eventid, send_email, link)
  SELECT 
    a.userid, 
    'Recordatori: ' || e.title, 
    'Et recordem que avui tens ' || lower(e.type) || ' a les ' || to_char(e.date AT TIME ZONE 'Europe/Madrid', 'HH24:MI') || COALESCE('. Lloc: ' || e.location, '') AS message,
    e.id, 
    TRUE,
    '/?event=' || e.id
  FROM public.events e
  JOIN public.attendances a ON e.id = a.eventid
  WHERE a.convocat = true
    AND e.is_cancelled = false
    AND (e.date AT TIME ZONE 'Europe/Madrid')::date = (now() AT TIME ZONE 'Europe/Madrid')::date;
END;
$$;

-- Unschedule if already exists (for idempotency)
SELECT cron.unschedule('daily_event_reminders');

-- Schedule the function to run every day at 08:00 AM Europe/Madrid (approx 06:00 UTC)
SELECT cron.schedule(
    'daily_event_reminders',
    '0 6 * * *',
    'SELECT public.send_daily_event_reminders()'
);
