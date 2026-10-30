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

-- ---------- Tippgeber: Freigabe durch die Geschäftsführung ----------
-- Bisher sah jeder nur seine eigenen Tippgeber. Die Geschäftsführung
-- muss alle sehen und freigeben können; selbst freigeben kann sich niemand.
drop policy if exists "nur eigene" on public.tippgeber;
create policy "lesen: eigene, GF alle" on public.tippgeber for select to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and besitzer_id = (select intern.ich())));
create policy "anlegen: für sich" on public.tippgeber for insert to authenticated
  with check ((select intern.aktiv()) and besitzer_id = (select intern.ich()));
create policy "ändern: eigene, GF alle" on public.tippgeber for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and besitzer_id = (select intern.ich())))
  with check ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and besitzer_id = (select intern.ich())));
create policy "löschen: eigene, GF alle" on public.tippgeber for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and besitzer_id = (select intern.ich())));

create or replace function intern.tippgeber_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or intern.rolle() = 'Geschäftsführung' then return new; end if;
  if tg_op = 'INSERT' then
    if coalesce(new.daten ->> 'status', '') <> 'wartet'
       or coalesce(jsonb_typeof(new.daten -> 'freigabe'), 'null') <> 'null' then
      raise exception 'Neue Tippgeber warten auf die Freigabe der Geschäftsführung.';
    end if;
    return new;
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
  -- Geänderte Vergütung oder neuer Name: erneut zur Freigabe
  if ((new.daten -> 'art') is distinct from (old.daten -> 'art')
      or (new.daten -> 'wert') is distinct from (old.daten -> 'wert')
      or (new.daten -> 'zahlweise') is distinct from (old.daten -> 'zahlweise')
      or (new.daten -> 'firma') is distinct from (old.daten -> 'firma')
      or (new.daten -> 'name') is distinct from (old.daten -> 'name'))
     and coalesce(new.daten ->> 'status', '') <> 'wartet' then
    raise exception 'Nach einer Änderung muss die Geschäftsführung den Tippgeber erneut freigeben.';
  end if;
  return new;
end $$;
drop trigger if exists schutz on public.tippgeber;
create trigger schutz before insert or update on public.tippgeber
  for each row execute function intern.tippgeber_schutz();
