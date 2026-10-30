-- ====================================================================
--  Tippgeber mit Vertrag, Freigabe und Zuordnung
--
--  - Der Vertriebspartner legt seinen Tippgeber an und erstellt den Vertrag.
--  - Erst die Geschäftsführung schaltet ihn frei (daten.freigabe).
--  - Die Geschäftsführung kann ihn weiteren Partnern zuordnen
--    (daten.zugeordnet). Diese sehen nur Name und Kontakt.
--  - Die Vergütung steht deshalb in einer eigenen Tabelle tippgeber_intern:
--    lesbar nur für Besitzer, Geschäftsführung und Finanzbuchhaltung.
--  - Wählt jemand den Tippgeber an einem Vorgang, legt der Server die
--    Vergütung am Vorgang ab (daten.tippgeberVerguetung). So wird sie
--    auch dann abgerechnet, wenn der Partner sie selbst nicht sehen darf.
-- ====================================================================

-- ---------- Zuordnung als Spalte, damit die Rechte sie prüfen können ----
alter table public.tippgeber
  add column zugeordnet text[] generated always as (intern.ids_aus(daten -> 'zugeordnet')) stored;
create index on public.tippgeber using gin (zugeordnet);
create index on public.tippgeber (besitzer_id);

-- ---------- Vergütung getrennt ablegen -------------------------------
create table public.tippgeber_intern (
  id        text primary key references public.tippgeber (id) on delete cascade,
  daten     jsonb not null default '{}'::jsonb,
  erstellt  timestamptz not null default now(),
  geaendert timestamptz not null default now()
);
comment on table public.tippgeber_intern is
  'Vergütung eines Tippgebers (art, wert, Vertragsdatum): nur Besitzer, Geschäftsführung und Finanzbuchhaltung.';

create trigger geaendert before update on public.tippgeber_intern
  for each row execute function intern.geaendert();
alter table public.tippgeber_intern enable row level security;
revoke all on public.tippgeber_intern from anon;
grant select, insert, update, delete on public.tippgeber_intern to authenticated;

-- Gehört der Tippgeber mir? (ohne Rechte, für die Regeln der Teil-Tabelle)
create or replace function intern.tippgeber_von_mir(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tippgeber t
                 where t.id = p_id and t.besitzer_id = intern.ich())
$$;

create or replace function intern.tippgeber_freigegeben(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select coalesce(t.daten -> 'freigabe', 'null'::jsonb) <> 'null'::jsonb
                   from public.tippgeber t where t.id = p_id), false)
$$;
revoke all on function intern.tippgeber_von_mir(text), intern.tippgeber_freigegeben(text) from public, anon;
grant execute on function intern.tippgeber_von_mir(text), intern.tippgeber_freigegeben(text) to authenticated;

-- ---------- Rechte: tippgeber ----------------------------------------
drop policy if exists "nur eigene" on public.tippgeber;

create policy "lesen: Besitzer, Zugeordnete, GF, FiBu, Leitung" on public.tippgeber for select to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Finanzbuchhaltung', 'Leitung Vertrieb'))
    or ((select intern.aktiv()) and (besitzer_id = (select intern.ich())
                                     or (select intern.ich()) = any (zugeordnet))));
create policy "anlegen: für sich selbst, GF" on public.tippgeber for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and besitzer_id = (select intern.ich())));
create policy "ändern: Besitzer, GF" on public.tippgeber for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and besitzer_id = (select intern.ich())))
  with check ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and besitzer_id = (select intern.ich())));
create policy "löschen: GF, Besitzer vor der Freigabe" on public.tippgeber for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and besitzer_id = (select intern.ich())
        and coalesce(daten -> 'freigabe', 'null'::jsonb) = 'null'::jsonb));

-- Freigabe und Zuordnung setzt nur die Geschäftsführung, der Besitzer bleibt.
create or replace function intern.tippgeber_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or intern.hat_rolle('Geschäftsführung') then return new; end if;
  if tg_op = 'INSERT' then
    if coalesce(new.daten -> 'freigabe', 'null'::jsonb) <> 'null'::jsonb then
      raise exception 'Tippgeber gibt die Geschäftsführung frei.';
    end if;
    if coalesce(new.daten -> 'zugeordnet', '[]'::jsonb) not in ('[]'::jsonb, 'null'::jsonb) then
      raise exception 'Weitere Partner ordnet die Geschäftsführung zu.';
    end if;
    return new;
  end if;
  if new.id is distinct from old.id
     or (new.daten ->> 'besitzerId') is distinct from (old.daten ->> 'besitzerId') then
    raise exception 'Kennung und Besitzer eines Tippgebers sind unveränderlich.';
  end if;
  if (new.daten -> 'freigabe') is distinct from (old.daten -> 'freigabe') then
    raise exception 'Tippgeber gibt die Geschäftsführung frei.';
  end if;
  if (new.daten -> 'zugeordnet') is distinct from (old.daten -> 'zugeordnet') then
    raise exception 'Weitere Partner ordnet die Geschäftsführung zu.';
  end if;
  return new;
end $$;
create trigger schutz before insert or update on public.tippgeber
  for each row execute function intern.tippgeber_schutz();

-- ---------- Rechte: tippgeber_intern ---------------------------------
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

-- Nach der Freigabe ändert nur die Geschäftsführung die Vergütung.
create or replace function intern.tippgeber_intern_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or intern.hat_rolle('Geschäftsführung') then return new; end if;
  if tg_op = 'UPDATE' and (new.daten -> 'verguetung') is distinct from (old.daten -> 'verguetung')
     and intern.tippgeber_freigegeben(new.id) then
    raise exception 'Nach der Freigabe ändert nur die Geschäftsführung die Vergütung.';
  end if;
  return new;
end $$;
create trigger schutz before insert or update on public.tippgeber_intern
  for each row execute function intern.tippgeber_intern_schutz();

-- ---------- Vergütung am Vorgang ablegen -----------------------------
create or replace function intern.anfragen_tippgeber() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  tid text := nullif(new.daten ->> 'tippgeberId', '');
  alt_tid text := case when tg_op = 'UPDATE' then nullif(old.daten ->> 'tippgeberId', '') end;
  v jsonb;
begin
  if tid is null then
    new.daten := new.daten - 'tippgeberVerguetung';
    return new;
  end if;
  -- gleicher Tippgeber wie bisher: Vergütung bleibt, wie sie beim Auswählen galt
  if tg_op = 'UPDATE' and tid = alt_tid then
    if old.daten ? 'tippgeberVerguetung' then
      new.daten := jsonb_set(new.daten, '{tippgeberVerguetung}', old.daten -> 'tippgeberVerguetung');
    else
      new.daten := new.daten - 'tippgeberVerguetung';
    end if;
    return new;
  end if;
  -- neu gewählt: nur freigegebene Tippgeber, laufende Vorgänge nur GF und Vertragsmanagement
  if auth.uid() is not null and not intern.hat_rolle('Geschäftsführung', 'Vertragsmanagement') then
    if tg_op = 'UPDATE' and (old.daten ->> 'status') not in ('entwurf', 'klaerfall') then
      raise exception 'Den Tippgeber eines laufenden Vorgangs ändert das Vertragsmanagement.';
    end if;
  end if;
  if not intern.tippgeber_freigegeben(tid) then
    raise exception 'Dieser Tippgeber ist noch nicht von der Geschäftsführung freigegeben.';
  end if;
  select ti.daten -> 'verguetung' into v from public.tippgeber_intern ti where ti.id = tid;
  if v is null or jsonb_typeof(v) <> 'object' then
    new.daten := new.daten - 'tippgeberVerguetung';
  else
    new.daten := jsonb_set(new.daten, '{tippgeberVerguetung}',
      jsonb_build_object('art', v -> 'art', 'wert', v -> 'wert'));
  end if;
  return new;
end $$;
create trigger tippgeber_verguetung before insert or update on public.anfragen
  for each row execute function intern.anfragen_tippgeber();

-- ---------- Dateien und Live-Abgleich --------------------------------
alter publication supabase_realtime add table public.tippgeber_intern;
