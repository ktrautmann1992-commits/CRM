-- ====================================================================
--  Beschaffung: Rolle, Bewertungsaufträge und Beschaffungspläne
--
--  Ein abgeschlossener Kunde mit Tranchen- oder PPA-Modell wird von
--  Vertrieb, Vertragsmanagement oder Geschäftsführung an die
--  Beschaffung übergeben. Dabei entsteht ein Bewertungsauftrag in
--  public.beschaffung mit einer Abschrift der Kundendaten (ohne
--  Aufschlag und Provision). Die Beschaffung sieht ausschließlich
--  diese Aufträge, nie die Vorgänge selbst und nie Provisionen.
--  Die Lastgänge des Vorgangs darf sie lesen, solange ein Auftrag
--  zu diesem Vorgang besteht.
-- ====================================================================

create table public.beschaffung (
  id          text primary key,
  daten       jsonb not null default '{}'::jsonb,
  anfrage_id  text generated always as (daten ->> 'anfrageId') stored,
  partner_id  text generated always as (daten ->> 'partnerId') stored,
  status      text generated always as (daten ->> 'status') stored,
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);
comment on table public.beschaffung is
  'Bewertungsaufträge und Beschaffungspläne je Kunde (Tranchen, PPA). Enthält keine Provisionsangaben.';
create index on public.beschaffung (anfrage_id);
create index on public.beschaffung (partner_id);

create trigger geaendert before update on public.beschaffung
  for each row execute function intern.geaendert();
alter table public.beschaffung enable row level security;
revoke all on public.beschaffung from anon;
grant select, insert, update, delete on public.beschaffung to authenticated;

-- ---------- Rechte ---------------------------------------------------
create policy "lesen: Beschaffung, GF, VM, Leitung, Kalkulation, Vertrieb der Struktur"
  on public.beschaffung for select to authenticated
  using ((select intern.hat_rolle('Beschaffung', 'Geschäftsführung', 'Vertragsmanagement',
                                  'Leitung Vertrieb', 'Kalkulation'))
    or ((select intern.hat_rolle('Vertriebspartner', 'Teamleiter'))
        and partner_id = any ((select intern.struktur())::text[])));

create policy "anlegen: GF, VM, Vertrieb" on public.beschaffung for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung', 'Vertragsmanagement', 'Leitung Vertrieb'))
    or ((select intern.hat_rolle('Vertriebspartner', 'Teamleiter'))
        and partner_id = any ((select intern.struktur())::text[])));

create policy "ändern: Beschaffung, GF, VM, Leitung" on public.beschaffung for update to authenticated
  using ((select intern.hat_rolle('Beschaffung', 'Geschäftsführung', 'Vertragsmanagement', 'Leitung Vertrieb')))
  with check ((select intern.hat_rolle('Beschaffung', 'Geschäftsführung', 'Vertragsmanagement', 'Leitung Vertrieb')));

create policy "löschen: GF, VM" on public.beschaffung for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Vertragsmanagement')));

-- ---------- Feldschutz ----------------------------------------------
-- Anlegen nur zu einem abgeschlossenen Vorgang, den man sehen darf.
-- Partner und Vorgang kommen immer aus dem Vorgang selbst.
-- Aufschlag und Provisionsfelder werden nie mitgespeichert.
create or replace function intern.beschaffung_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v record;
begin
  -- Provisionsangaben gehören nicht in den Auftrag
  new.daten := new.daten - 'aufschlag' - 'provisionErhalten' - 'ausgezahlt' - 'provision' - 'kalkulation';

  if auth.uid() is null then return new; end if;              -- Server (Dienstschlüssel)

  if tg_op = 'INSERT' then
    select a.id, a.partner_id, a.status, a.beteiligte into v
      from public.anfragen a where a.id = new.daten ->> 'anfrageId';
    if v.id is null then
      raise exception 'Zu diesem Auftrag gibt es keinen Vorgang.';
    end if;
    if v.status is distinct from 'abgeschlossen' then
      raise exception 'An die Beschaffung übergeben werden nur abgeschlossene Kunden.';
    end if;
    if not intern.anfrage_sichtbar(v.partner_id, v.beteiligte, v.status) then
      raise exception 'Diesen Vorgang darfst du nicht übergeben.';
    end if;
    new.daten := jsonb_set(new.daten, '{partnerId}', to_jsonb(v.partner_id));
    return new;
  end if;

  if new.id is distinct from old.id
     or (new.daten ->> 'anfrageId') is distinct from (old.daten ->> 'anfrageId')
     or (new.daten ->> 'partnerId') is distinct from (old.daten ->> 'partnerId') then
    raise exception 'Vorgang und Vertriebspartner eines Beschaffungsauftrags sind unveränderlich.';
  end if;
  return new;
end $$;
revoke all on function intern.beschaffung_schutz() from public, anon, authenticated;
create trigger schutz before insert or update on public.beschaffung
  for each row execute function intern.beschaffung_schutz();

-- ---------- Dateien --------------------------------------------------
-- Eigene Dateien unter beschaffung/<id>/…; Dateien eines Vorgangs
-- (Lastgänge, Abrechnungen) zusätzlich für alle, die einen
-- Beschaffungsauftrag zu diesem Vorgang sehen.
create or replace function intern.datei_sichtbar(pfad text) returns boolean
language plpgsql stable security invoker set search_path = '' as $$
declare
  teile text[] := string_to_array(pfad, '/');
  ok boolean;
begin
  if array_length(teile, 1) < 3 or teile[1] not in (
      'anfragen','anfragen_intern','leads','tickets','smartmeter','probleme','termine','akquise',
      'aufgaben','tippgeber','ablage','versorger','mitarbeiter','mitarbeiter_stammdaten','beschaffung') then
    return false;
  end if;
  execute format('select exists (select 1 from public.%I where id = $1)', teile[1]) into ok using teile[2];
  if not ok and teile[1] = 'anfragen' then
    select exists (select 1 from public.beschaffung b where b.anfrage_id = teile[2]) into ok;
  end if;
  return ok;
end $$;

create or replace function intern.datensatz_vorhanden(pfad text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  teile text[] := string_to_array(pfad, '/');
  ok boolean;
begin
  if array_length(teile, 1) < 3 or teile[1] not in (
      'anfragen','anfragen_intern','leads','tickets','smartmeter','probleme','termine','akquise',
      'aufgaben','tippgeber','ablage','versorger','mitarbeiter','mitarbeiter_stammdaten','beschaffung') then
    return true;
  end if;
  execute format('select exists (select 1 from public.%I where id = $1)', teile[1]) into ok using teile[2];
  return ok;
end $$;

revoke all on function intern.datei_sichtbar(text), intern.datensatz_vorhanden(text) from public, anon;
grant execute on function intern.datei_sichtbar(text), intern.datensatz_vorhanden(text) to authenticated;

-- ---------- Live-Abgleich -------------------------------------------
alter publication supabase_realtime add table public.beschaffung;
