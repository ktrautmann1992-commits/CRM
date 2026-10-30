-- ====================================================================
--  E-Mail-Benachrichtigungen
--
--  Ändert sich an einem Vorgang etwas Wichtiges, ruft die Datenbank die
--  Server-Funktion „benachrichtigung" auf. Diese verschickt die Mails über
--  das Postfach portal@egc-energie.de.
--
--  Ereignisse:
--    eingereicht  Partner fragt Kalkulation an        → Kalkulation
--    angebot      Angebot liegt vor                   → Partner
--    klaerfall    Unterlagen oder Daten fehlen        → Partner
--    bestaetigt   Versorger hat den Abschluss bestätigt → Partner
--    ausgezahlt   Provision für ein Lieferjahr gezahlt → Empfänger
--
--  Das gemeinsame Geheimnis erzeugt die Datenbank selbst und legt es im
--  Tresor (vault) ab. Die Funktion prüft es über
--  public.benachrichtigung_geheimnis_ok – nur mit dem Dienstschlüssel aufrufbar.
-- ====================================================================

create extension if not exists pg_net;

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

create trigger benachrichtigen after insert or update on public.anfragen
  for each row execute function intern.anfragen_benachrichtigen();

-- ---------- Geheimnis: einmal erzeugen, nie im Klartext in Dateien ------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'benachrichtigung_geheimnis') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'benachrichtigung_geheimnis');
  end if;
end $$;

create or replace function public.benachrichtigung_geheimnis_ok(p text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select decrypted_secret = p from vault.decrypted_secrets
                   where name = 'benachrichtigung_geheimnis'), false)
$$;
revoke all on function public.benachrichtigung_geheimnis_ok(text) from public, anon, authenticated;
grant execute on function public.benachrichtigung_geheimnis_ok(text) to service_role;
