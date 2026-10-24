-- ====================================================================
--  Dateispeicher und Live-Abgleich
--
--  Dateien liegen im privaten Bucket „dateien" unter
--  <tabelle>/<datensatz-id>/<name>. Wer den Datensatz sehen darf,
--  darf auch seine Dateien sehen – dieselben Zeilenrechte gelten.
-- ====================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('dateien', 'dateien', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- Darf der angemeldete Nutzer den Datensatz sehen? (prüft mit seinen eigenen Rechten)
create or replace function intern.datei_sichtbar(pfad text) returns boolean
language plpgsql stable security invoker set search_path = '' as $$
declare
  teile text[] := string_to_array(pfad, '/');
  ok boolean;
begin
  if array_length(teile, 1) < 3 or teile[1] not in (
      'anfragen','anfragen_intern','leads','tickets','smartmeter','probleme','termine','akquise',
      'aufgaben','tippgeber','ablage','versorger','mitarbeiter','mitarbeiter_stammdaten') then
    return false;
  end if;
  execute format('select exists (select 1 from public.%I where id = $1)', teile[1]) into ok using teile[2];
  return ok;
end $$;

-- Gibt es den Datensatz überhaupt? (ohne Rechte – nur für das Hochladen vor dem ersten Speichern)
create or replace function intern.datensatz_vorhanden(pfad text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  teile text[] := string_to_array(pfad, '/');
  ok boolean;
begin
  if array_length(teile, 1) < 3 or teile[1] not in (
      'anfragen','anfragen_intern','leads','tickets','smartmeter','probleme','termine','akquise',
      'aufgaben','tippgeber','ablage','versorger','mitarbeiter','mitarbeiter_stammdaten') then
    return true;  -- unbekannte Tabelle: gilt als vorhanden, Hochladen also nur bei Sichtbarkeit
  end if;
  execute format('select exists (select 1 from public.%I where id = $1)', teile[1]) into ok using teile[2];
  return ok;
end $$;

revoke all on function intern.datei_sichtbar(text), intern.datensatz_vorhanden(text) from public, anon;
grant execute on function intern.datei_sichtbar(text), intern.datensatz_vorhanden(text) to authenticated;

create policy "dateien lesen wie Datensatz" on storage.objects for select to authenticated
  using (bucket_id = 'dateien' and (select intern.datei_sichtbar(name)));

-- Hochladen: zu einem sichtbaren Datensatz oder zu einem, den es noch nicht gibt (wird gleich angelegt).
-- Stammdaten nur zum eigenen Datensatz.
create policy "dateien hochladen" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dateien'
    and (
      (split_part(name, '/', 1) = 'mitarbeiter_stammdaten'
        and (split_part(name, '/', 2) = (select intern.ich()) or (select intern.hat_rolle('Geschäftsführung'))))
      or (split_part(name, '/', 1) <> 'mitarbeiter_stammdaten' and (select intern.aktiv())
        and ((select intern.datei_sichtbar(name)) or not (select intern.datensatz_vorhanden(name))))
    ));

create policy "dateien löschen: GF" on storage.objects for delete to authenticated
  using (bucket_id = 'dateien' and (select intern.hat_rolle('Geschäftsführung')));

-- ---------- Live-Abgleich -------------------------------------------
alter publication supabase_realtime add table
  public.mitarbeiter, public.mitarbeiter_konditionen, public.mitarbeiter_stammdaten, public.einladungen,
  public.anfragen, public.anfragen_intern, public.leads, public.tickets, public.smartmeter,
  public.probleme, public.termine, public.akquise, public.aufgaben, public.protokoll,
  public.tippgeber, public.ablage, public.versorger, public.versorger_intern, public.einstellungen;
