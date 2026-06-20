-- Nowe zgłoszenie serwisowe trafiało do bazy po cichu — ani publiczny formularz,
-- ani auto-ticket z maila (scan-emails), ani montaż nie powiadamiały nikogo.
-- Trigger AFTER INSERT pokrywa WSZYSTKIE ścieżki tworzenia naraz (anon/auth/
-- service-role) i powiadamia aktywnych adminów + managerów.
CREATE OR REPLACE FUNCTION public.notify_new_service_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text := '';
  v_type_label text;
  v_notif_type text;
  v_title text;
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    SELECT btrim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))
      INTO v_client_name FROM customers WHERE id = NEW.client_id;
  END IF;
  v_client_name := nullif(btrim(coalesce(v_client_name, '')), '');

  v_type_label := CASE NEW.type
    WHEN 'leak' THEN 'Nieszczelność'
    WHEN 'electrical' THEN 'Elektryka'
    WHEN 'visual' THEN 'Usterka wizualna'
    WHEN 'mechanical' THEN 'Usterka mechaniczna'
    ELSE 'Zgłoszenie serwisowe'
  END;

  v_notif_type := CASE WHEN NEW.priority IN ('critical','high') THEN 'warning' ELSE 'info' END;
  v_title := '🔧 Nowe zgłoszenie serwisowe' ||
             CASE WHEN v_client_name IS NOT NULL THEN ': ' || v_client_name ELSE ' ' || NEW.ticket_number END;

  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  SELECT p.id, v_notif_type, v_title,
         v_type_label || ' — ' || left(coalesce(NEW.description, ''), 140),
         '/service/' || NEW.id,
         jsonb_build_object('ticketId', NEW.id, 'ticketNumber', NEW.ticket_number, 'priority', NEW.priority)
  FROM profiles p
  WHERE p.role IN ('admin','manager') AND p.status = 'active';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_service_ticket ON service_tickets;
CREATE TRIGGER trg_notify_new_service_ticket
  AFTER INSERT ON service_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_service_ticket();
