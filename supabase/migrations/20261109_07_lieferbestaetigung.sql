-- Lieferbestätigung durch das Vertragsmanagement (neuer letzter Schritt im Vertrieb).
-- Bisher bekam der Vertriebspartner die Mail „Glückwunsch zum Abschluss“, sobald die Kalkulation
-- „Auftrag bestätigt“ setzt. Neu: erst wenn das Vertragsmanagement die Lieferbestätigung erfasst
-- (daten.lieferbestaetigung wird gesetzt). Der Auslöser meldet dafür das Ereignis 'lieferbestaetigt';
-- die Funktion „benachrichtigung“ schickt bei 'bestaetigt' keine Mail mehr an den Vertrieb.

create or replace function intern.anfragen_benachrichtigen() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  alt text := case when tg_op = 'UPDATE' then old.daten ->> 'status' end;
  neu text := new.daten ->> 'status';
  ereignisse jsonb := '[]'::jsonb;
  k text;
  geheim text;
begin
  if neu is distinct from alt and neu in ('eingereicht', 'angebot', 'klaerfall', 'bestaetigt') then
    ereignisse := ereignisse || jsonb_build_array(jsonb_build_object('art', neu));
  end if;

  if jsonb_typeof(new.daten -> 'lieferbestaetigung') = 'object'
     and (tg_op = 'INSERT' or jsonb_typeof(old.daten -> 'lieferbestaetigung') is distinct from 'object') then
    ereignisse := ereignisse || jsonb_build_array(jsonb_build_object('art', 'lieferbestaetigt'));
  end if;

  if jsonb_typeof(new.daten -> 'ausgezahlt') = 'object' then
    for k in select jsonb_object_keys(new.daten -> 'ausgezahlt') loop
      if position(':' in k) > 0 and (tg_op = 'INSERT'
          or jsonb_typeof(old.daten -> 'ausgezahlt') is distinct from 'object'
          or not (old.daten -> 'ausgezahlt') ? k) then
        ereignisse := ereignisse || jsonb_build_array(jsonb_build_object('art', 'ausgezahlt', 'schluessel', k));
      end if;
    end loop;
  end if;

  if jsonb_array_length(ereignisse) = 0 then return null; end if;

  select decrypted_secret into geheim from vault.decrypted_secrets where name = 'benachrichtigung_geheimnis';
  if geheim is null then return null; end if;

  perform net.http_post(
    url := 'https://elpkrgxooqosfsrlnbcy.supabase.co/functions/v1/benachrichtigung',
    body := jsonb_build_object('id', new.id, 'ereignisse', ereignisse),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-geheimnis', geheim)
  );
  return null;
exception when others then
  -- eine Benachrichtigung darf nie das Speichern eines Vorgangs verhindern
  return null;
end $$;

revoke all on function intern.anfragen_benachrichtigen() from public, anon, authenticated;
