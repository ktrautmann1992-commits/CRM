-- E-Mail an den Mitarbeiter, dem ein Teamleiter einen Termin gegeben hat.
-- Neu angelegt: Ereignis "termin". Später geändert (Empfänger, Datum, Uhrzeit, Ort, Kunde oder Hinweise):
-- Ereignis "termin_geaendert". Rückmeldung und Verschieben durch den Empfänger lösen keine Mail aus.
-- Versand über die Funktion „benachrichtigung“ wie bei den Vorgängen (Migration 05).

create or replace function intern.termine_benachrichtigen()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  geheim text;
  art text := 'termin';
begin
  if coalesce(new.daten ->> 'vonId', '') = '' or new.daten ->> 'vonId' = new.daten ->> 'fuerId' then
    return null;
  end if;
  -- Änderungen des Empfängers selbst (Rückmeldung, Verschieben) lösen keine Mail an ihn aus
  if tg_op = 'UPDATE' and (select intern.ich()) is not distinct from (new.daten ->> 'fuerId') then
    return null;
  end if;
  if tg_op = 'UPDATE' then
    if (old.daten ->> 'fuerId') is distinct from (new.daten ->> 'fuerId') then
      art := 'termin';
    elsif (old.daten -> 'datum') is not distinct from (new.daten -> 'datum')
      and (old.daten -> 'zeit') is not distinct from (new.daten -> 'zeit')
      and (old.daten -> 'ort') is not distinct from (new.daten -> 'ort')
      and (old.daten -> 'kunde') is not distinct from (new.daten -> 'kunde')
      and (old.daten -> 'notiz') is not distinct from (new.daten -> 'notiz') then
      return null;
    else
      art := 'termin_geaendert';
    end if;
  end if;

  select decrypted_secret into geheim from vault.decrypted_secrets where name = 'benachrichtigung_geheimnis';
  if geheim is null then return null; end if;

  perform net.http_post(
    url := 'https://elpkrgxooqosfsrlnbcy.supabase.co/functions/v1/benachrichtigung',
    body := jsonb_build_object('id', new.id, 'ereignisse', jsonb_build_array(jsonb_build_object('art', art))),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-geheimnis', geheim)
  );
  return null;
exception when others then
  -- eine Benachrichtigung darf nie das Speichern eines Termins verhindern
  return null;
end $function$;

drop trigger if exists benachrichtigen on public.termine;
create trigger benachrichtigen after insert or update on public.termine
  for each row execute function intern.termine_benachrichtigen();
