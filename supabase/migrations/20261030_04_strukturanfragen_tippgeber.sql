-- ====================================================================
--  Strukturanfragen und Handelsvertretervertrag
--
--  Ein Teamleiter schlägt einen neuen Vertriebspartner für seine
--  Struktur vor (Name, E-Mail, Provisionssatz). Die Geschäftsführung
--  gibt frei, unterschreibt den Handelsvertretervertrag und erzeugt
--  die Einladung. Der Vertrag liegt beim Mitarbeiter unter
--  daten.vertrag in mitarbeiter_stammdaten.
-- ====================================================================

create table public.strukturanfragen (
  id          text primary key,
  daten       jsonb not null default '{}'::jsonb,
  von_id      text generated always as (daten ->> 'vonId') stored,
  status      text generated always as (daten ->> 'status') stored,
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);
comment on table public.strukturanfragen is
  'Anfragen der Teamleiter für neue Vertriebspartner. Sichtbar nur für den Anfragenden und die Geschäftsführung.';

create trigger geaendert before update on public.strukturanfragen
  for each row execute function intern.geaendert();
alter table public.strukturanfragen enable row level security;
revoke all on public.strukturanfragen from anon;
grant select, insert, update, delete on public.strukturanfragen to authenticated;

create policy "lesen: GF und Anfragender" on public.strukturanfragen for select to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and von_id = (select intern.ich())));
create policy "anlegen: Teamleiter für sich" on public.strukturanfragen for insert to authenticated
  with check ((select intern.hat_rolle('Teamleiter')) and von_id = (select intern.ich()) and status = 'offen');
create policy "ändern: GF, Anfragender solange offen" on public.strukturanfragen for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and von_id = (select intern.ich()) and status = 'offen'))
  with check ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and von_id = (select intern.ich()) and status in ('offen', 'zurueckgezogen')));
create policy "löschen: GF" on public.strukturanfragen for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung')));

-- Feldschutz: Satz höchstens der eigene, Zuordnung an sich selbst,
-- Freigabe und Einladungslink nur durch die Geschäftsführung.
create or replace function intern.strukturanfrage_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  eigen numeric;
begin
  if auth.uid() is null or intern.rolle() = 'Geschäftsführung' then return new; end if;
  select coalesce((daten ->> 'satz')::numeric, 0) into eigen
    from public.mitarbeiter_konditionen where id = intern.ich();
  if coalesce((new.daten ->> 'satz')::numeric, 0) <= 0
     or coalesce((new.daten ->> 'satz')::numeric, 0) > coalesce(eigen, 0) then
    raise exception 'Der vorgeschlagene Satz darf höchstens dem eigenen Satz entsprechen.';
  end if;
  if (new.daten ->> 'upline') is distinct from intern.ich()
     or (new.daten ->> 'rolle') is distinct from 'Vertriebspartner' then
    raise exception 'Angefragt werden nur Vertriebspartner für die eigene Struktur.';
  end if;
  if (new.daten -> 'freigabe') is not null or (new.daten -> 'link') is not null
     or (new.daten -> 'mitarbeiterId') is not null then
    raise exception 'Freigabe und Einladung erteilt die Geschäftsführung.';
  end if;
  return new;
end $$;
create trigger schutz before insert or update on public.strukturanfragen
  for each row execute function intern.strukturanfrage_schutz();

-- Vertrag in den Stammdaten: Die Person selbst darf nur ihre eigene
-- Unterschrift ergänzen, alles andere am Vertrag ändert die Geschäftsführung.
create or replace function intern.stammdaten_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or intern.rolle() = 'Geschäftsführung' then return new; end if;
  if tg_op = 'INSERT' then
    if coalesce(jsonb_typeof(new.daten -> 'vertrag'), 'null') <> 'null' then
      raise exception 'Den Vertrag legt die Geschäftsführung an.';
    end if;
    return new;
  end if;
  if (new.daten -> 'pruefHinweis') is distinct from (old.daten -> 'pruefHinweis') then
    raise exception 'Den Prüfhinweis schreibt die Geschäftsführung.';
  end if;
  if ((case when jsonb_typeof(new.daten -> 'vertrag') = 'object' then new.daten -> 'vertrag' else '{}'::jsonb end)
        - 'partnerUnterschrift' - 'partnerDatum')
     is distinct from
     ((case when jsonb_typeof(old.daten -> 'vertrag') = 'object' then old.daten -> 'vertrag' else '{}'::jsonb end)
        - 'partnerUnterschrift' - 'partnerDatum') then
    raise exception 'Den Vertrag ändert nur die Geschäftsführung; ergänzt werden darf nur die eigene Unterschrift.';
  end if;
  if (old.daten -> 'vertrag' -> 'partnerUnterschrift') is not null
     and jsonb_typeof(old.daten -> 'vertrag' -> 'partnerUnterschrift') <> 'null'
     and (new.daten -> 'vertrag' -> 'partnerUnterschrift') is distinct from (old.daten -> 'vertrag' -> 'partnerUnterschrift') then
    raise exception 'Eine geleistete Unterschrift kann nicht geändert werden.';
  end if;
  return new;
end $$;

drop trigger if exists schutz on public.mitarbeiter_stammdaten;
create trigger schutz before insert or update on public.mitarbeiter_stammdaten
  for each row execute function intern.stammdaten_schutz();

alter publication supabase_realtime add table public.strukturanfragen;

-- ---------- Tippgeber: Freigabe, Zuordnung, Vergütung getrennt ------
-- Zusammengeführt aus v5.10-vertraege-mails (20261030_01, nicht ausgeführt):
-- - Der Partner legt seinen Tippgeber an; erst die Geschäftsführung gibt
--   ihn frei (daten.status = 'freigegeben').
-- - Die Geschäftsführung kann ihn weiteren Partnern zuordnen
--   (daten.zugeordnet). Diese sehen nur Name und Kontakt.
-- - Die Vergütung (art, wert, zahlweise) liegt in tippgeber_intern:
--   lesbar nur für Besitzer, Geschäftsführung und Finanzbuchhaltung.
-- - Wählt jemand den Tippgeber an einem Vorgang, trägt der Server die
--   Vergütung am Vorgang ein (daten.tippgeber). So wird sie auch dann
--   abgerechnet, wenn der Partner sie selbst nicht sehen darf.

alter table public.tippgeber
  add column zugeordnet text[] generated always as (intern.ids_aus(daten -> 'zugeordnet')) stored;
create index on public.tippgeber using gin (zugeordnet);

drop policy if exists "nur eigene" on public.tippgeber;
create policy "lesen: Besitzer, Zugeordnete, GF, FiBu" on public.tippgeber for select to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Finanzbuchhaltung'))
    or ((select intern.aktiv()) and (besitzer_id = (select intern.ich())
                                     or (select intern.ich()) = any (zugeordnet))));
create policy "anlegen: für sich, GF" on public.tippgeber for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and besitzer_id = (select intern.ich())));
create policy "ändern: Besitzer, GF" on public.tippgeber for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and besitzer_id = (select intern.ich())))
  with check ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and besitzer_id = (select intern.ich())));
create policy "löschen: Besitzer, GF" on public.tippgeber for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and besitzer_id = (select intern.ich())));

create or replace function intern.tippgeber_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or intern.hat_rolle('Geschäftsführung') then return new; end if;
  if tg_op = 'INSERT' then
    if coalesce(new.daten ->> 'status', '') <> 'wartet'
       or coalesce(jsonb_typeof(new.daten -> 'freigabe'), 'null') <> 'null' then
      raise exception 'Neue Tippgeber warten auf die Freigabe der Geschäftsführung.';
    end if;
    if coalesce(new.daten -> 'zugeordnet', '[]'::jsonb) not in ('[]'::jsonb, 'null'::jsonb) then
      raise exception 'Weitere Partner ordnet die Geschäftsführung zu.';
    end if;
    return new;
  end if;
  if (new.daten ->> 'besitzerId') is distinct from (old.daten ->> 'besitzerId') then
    raise exception 'Der Besitzer eines Tippgebers ist unveränderlich.';
  end if;
  if (new.daten -> 'zugeordnet') is distinct from (old.daten -> 'zugeordnet') then
    raise exception 'Weitere Partner ordnet die Geschäftsführung zu.';
  end if;
  -- Freigeben oder Ablehnen nur durch die Geschäftsführung
  if (new.daten ->> 'status') is distinct from (old.daten ->> 'status')
     and coalesce(new.daten ->> 'status', '') <> 'wartet' then
    raise exception 'Tippgeber gibt nur die Geschäftsführung frei.';
  end if;
  if (new.daten -> 'freigabe') is distinct from (old.daten -> 'freigabe')
     and coalesce(jsonb_typeof(new.daten -> 'freigabe'), 'null') <> 'null' then
    raise exception 'Tippgeber gibt nur die Geschäftsführung frei.';
  end if;
  -- Neuer Name: erneut zur Freigabe
  if ((new.daten -> 'firma') is distinct from (old.daten -> 'firma')
      or (new.daten -> 'name') is distinct from (old.daten -> 'name'))
     and coalesce(new.daten ->> 'status', '') <> 'wartet' then
    raise exception 'Nach einer Änderung muss die Geschäftsführung den Tippgeber erneut freigeben.';
  end if;
  return new;
end $$;
drop trigger if exists schutz on public.tippgeber;
create trigger schutz before insert or update on public.tippgeber
  for each row execute function intern.tippgeber_schutz();

-- Vergütung getrennt
create table public.tippgeber_intern (
  id        text primary key references public.tippgeber (id) on delete cascade,
  daten     jsonb not null default '{}'::jsonb,
  erstellt  timestamptz not null default now(),
  geaendert timestamptz not null default now()
);
comment on table public.tippgeber_intern is
  'Vergütung eines Tippgebers (art, wert, zahlweise): nur Besitzer, Geschäftsführung und Finanzbuchhaltung.';
create trigger geaendert before update on public.tippgeber_intern
  for each row execute function intern.geaendert();
alter table public.tippgeber_intern enable row level security;
revoke all on public.tippgeber_intern from anon;
grant select, insert, update, delete on public.tippgeber_intern to authenticated;

create or replace function intern.tippgeber_von_mir(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tippgeber t where t.id = p_id and t.besitzer_id = intern.ich())
$$;
create or replace function intern.tippgeber_status(p_id text) returns text
language sql stable security definer set search_path = '' as $$
  select t.daten ->> 'status' from public.tippgeber t where t.id = p_id
$$;
revoke all on function intern.tippgeber_von_mir(text), intern.tippgeber_status(text) from public, anon;
grant execute on function intern.tippgeber_von_mir(text), intern.tippgeber_status(text) to authenticated;

create policy "lesen: Besitzer, GF, FiBu" on public.tippgeber_intern for select to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Finanzbuchhaltung'))
    or ((select intern.aktiv()) and intern.tippgeber_von_mir(id)));
create policy "anlegen: Besitzer, GF" on public.tippgeber_intern for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and intern.tippgeber_von_mir(id)));
create policy "ändern: Besitzer, GF" on public.tippgeber_intern for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and intern.tippgeber_von_mir(id)))
  with check ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and intern.tippgeber_von_mir(id)));
create policy "löschen: Besitzer, GF" on public.tippgeber_intern for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and intern.tippgeber_von_mir(id)));

-- Die Vergütung ändert der Partner nur, solange der Tippgeber auf Freigabe wartet
create or replace function intern.tippgeber_intern_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or intern.hat_rolle('Geschäftsführung') then return new; end if;
  if coalesce(intern.tippgeber_status(new.id), 'wartet') <> 'wartet'
     and (tg_op = 'INSERT' or new.daten is distinct from old.daten) then
    raise exception 'Die Vergütung eines freigegebenen Tippgebers ändert nur die Geschäftsführung.';
  end if;
  return new;
end $$;
create trigger schutz before insert or update on public.tippgeber_intern
  for each row execute function intern.tippgeber_intern_schutz();

-- ---------- Tippgeber am Vorgang: Vergütung trägt der Server ein -----
create or replace function intern.anfragen_tippgeber() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  tid text := nullif(new.daten -> 'tippgeber' ->> 'id', '');
  alt_tid text := case when tg_op = 'UPDATE' then nullif(old.daten -> 'tippgeber' ->> 'id', '') end;
  t jsonb;
  v jsonb;
  traeger text;
begin
  if tid is null then
    -- ohne Tippgeber keine Vergütung am Vorgang
    if jsonb_typeof(new.daten -> 'tippgeber') = 'object' then
      new.daten := jsonb_set(new.daten, '{tippgeber}', 'null'::jsonb);
    end if;
    return new;
  end if;
  -- gleicher Tippgeber wie bisher: Vergütung bleibt, wie sie beim Auswählen galt
  if tg_op = 'UPDATE' and tid = alt_tid then
    new.daten := jsonb_set(new.daten, '{tippgeber}', old.daten -> 'tippgeber');
    return new;
  end if;
  select daten into t from public.tippgeber where id = tid;
  if t is null or coalesce(t ->> 'status', '') <> 'freigegeben' then
    raise exception 'Dieser Tippgeber ist noch nicht von der Geschäftsführung freigegeben.';
  end if;
  traeger := new.daten -> 'tippgeber' ->> 'traegerId';
  if auth.uid() is not null and not intern.hat_rolle('Geschäftsführung', 'Vertragsmanagement') then
    -- nur eigene oder zugeordnete, nur bis zum Annehmen des Angebots, Träger ist man selbst
    if (t ->> 'besitzerId') is distinct from intern.ich()
       and not (intern.ich() = any (intern.ids_aus(t -> 'zugeordnet'))) then
      raise exception 'Dieser Tippgeber ist dir nicht zugeordnet.';
    end if;
    if tg_op = 'UPDATE' and (old.daten ->> 'status') not in
       ('entwurf', 'eingereicht', 'ruecksprache', 'angefragt', 'klaerfall', 'angebot') then
      raise exception 'Den Tippgeber eines laufenden Vorgangs ändert das Vertragsmanagement.';
    end if;
    traeger := intern.ich();
  end if;
  select daten into v from public.tippgeber_intern where id = tid;
  new.daten := jsonb_set(jsonb_set(new.daten, '{tippgeberId}', to_jsonb(tid)), '{tippgeber}',
    jsonb_build_object(
      'id', tid,
      'name', coalesce(nullif(t ->> 'firma', ''), t ->> 'name'),
      'besitzerId', t ->> 'besitzerId',
      'traegerId', traeger,
      'art', v -> 'art', 'wert', v -> 'wert', 'zahlweise', v -> 'zahlweise',
      'datum', to_char(now(), 'YYYY-MM-DD')));
  return new;
end $$;
create trigger tippgeber_verguetung before insert or update on public.anfragen
  for each row execute function intern.anfragen_tippgeber();

alter publication supabase_realtime add table public.tippgeber_intern;
