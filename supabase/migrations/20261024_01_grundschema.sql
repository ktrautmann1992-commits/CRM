-- ====================================================================
--  EGC-Vertriebsportal · Grundschema mit Zeilenrechten
--
--  Aufbau: Jede Sammlung der App ist eine Tabelle (id, daten jsonb).
--  Die Spalten, nach denen die Rechte entscheiden (Partner, Status,
--  Zuständige …), werden aus `daten` abgeleitet (generierte Spalten),
--  damit App und Rechte nicht auseinanderlaufen können.
--  Wer was sehen und ändern darf, steht ausschließlich hier.
-- ====================================================================

create schema if not exists intern;
revoke all on schema intern from public, anon;
grant usage on schema intern to authenticated;

-- ---------- Hilfsfunktionen für die Rechte -------------------------

-- Ids aus einer JSON-Liste ziehen: ["a","b"] oder [{"id":"a"}, …] oder "a"
create or replace function intern.ids_aus(j jsonb) returns text[]
language sql immutable parallel safe set search_path = '' as $$
  select case
    when j is null or jsonb_typeof(j) = 'null' then '{}'::text[]
    when jsonb_typeof(j) = 'string' then array[j #>> '{}']
    when jsonb_typeof(j) = 'array' then coalesce((
      select array_agg(coalesce(e ->> 'id', case when jsonb_typeof(e) = 'string' then e #>> '{}' end))
      from jsonb_array_elements(j) e
      where coalesce(e ->> 'id', case when jsonb_typeof(e) = 'string' then e #>> '{}' end) is not null
    ), '{}'::text[])
    else '{}'::text[]
  end
$$;

-- ---------- Mitarbeiter ---------------------------------------------

create table public.mitarbeiter (
  id        text primary key,
  auth_id   uuid unique references auth.users (id) on delete set null,
  daten     jsonb not null default '{}'::jsonb,
  rolle     text generated always as (daten ->> 'rolle') stored,
  upline    text generated always as (daten ->> 'upline') stored,
  status    text generated always as (daten ->> 'status') stored,
  erstellt  timestamptz not null default now(),
  geaendert timestamptz not null default now()
);
comment on table public.mitarbeiter is
  'Mitarbeiter, für alle aktiven Nutzer sichtbar: Name, Rolle, Struktur, Kontakt. Sätze und Stammdaten liegen getrennt.';
create index on public.mitarbeiter (upline);

create or replace function intern.ich() returns text
language sql stable security definer set search_path = '' as $$
  select id from public.mitarbeiter where auth_id = (select auth.uid())
$$;

create or replace function intern.rolle() returns text
language sql stable security definer set search_path = '' as $$
  select rolle from public.mitarbeiter where auth_id = (select auth.uid())
$$;

-- freigeschaltet? Gesperrte Zugänge (registriert, Prüfung, abgelehnt) sehen nur sich selbst.
create or replace function intern.aktiv() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select status = 'aktiv' from public.mitarbeiter where auth_id = (select auth.uid())), false)
$$;

create or replace function intern.hat_rolle(variadic rollen text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select status = 'aktiv' and rolle = any (rollen)
                   from public.mitarbeiter where auth_id = (select auth.uid())), false)
$$;

-- eigene id und alle, die direkt oder indirekt darunter hängen
create or replace function intern.struktur() returns text[]
language sql stable security definer set search_path = '' as $$
  with recursive s(id, tiefe) as (
    select id, 0 from public.mitarbeiter where auth_id = (select auth.uid()) and status = 'aktiv'
    union
    select m.id, s.tiefe + 1 from public.mitarbeiter m join s on m.upline = s.id where s.tiefe < 20
  )
  select coalesce(array_agg(distinct id), '{}'::text[]) from s
$$;

create table public.mitarbeiter_konditionen (
  id        text primary key references public.mitarbeiter (id) on delete cascade,
  daten     jsonb not null default '{}'::jsonb,
  erstellt  timestamptz not null default now(),
  geaendert timestamptz not null default now()
);
comment on table public.mitarbeiter_konditionen is
  'Provisionssatz, Eigenakquise-Bonus, Ziele und Bonusziele je Mitarbeiter.';

create table public.mitarbeiter_stammdaten (
  id        text primary key references public.mitarbeiter (id) on delete cascade,
  daten     jsonb not null default '{}'::jsonb,
  erstellt  timestamptz not null default now(),
  geaendert timestamptz not null default now()
);
comment on table public.mitarbeiter_stammdaten is
  'SENSIBEL: Firmierung, Bankverbindung, Steuernummer, Ausweis- und Gewerbenachweise. Nur die Person selbst, Geschäftsführung und Finanzbuchhaltung.';

create table public.einladungen (
  id        text primary key references public.mitarbeiter (id) on delete cascade,
  daten     jsonb not null default '{}'::jsonb,
  erstellt  timestamptz not null default now(),
  geaendert timestamptz not null default now()
);
comment on table public.einladungen is 'Offene Einladungscodes. Eingelöst wird über die Server-Funktion einladung.';

-- ---------- Vorgänge ------------------------------------------------

create table public.anfragen (
  id         text primary key,
  daten      jsonb not null default '{}'::jsonb,
  partner_id text generated always as (daten ->> 'partnerId') stored,
  status     text generated always as (daten ->> 'status') stored,
  beteiligte text[] generated always as (intern.ids_aus(daten -> 'beteiligte')) stored,
  erstellt   timestamptz not null default now(),
  geaendert  timestamptz not null default now()
);
create index on public.anfragen (partner_id);
create index on public.anfragen using gin (beteiligte);

create table public.anfragen_intern (
  id        text primary key references public.anfragen (id) on delete cascade,
  daten     jsonb not null default '{}'::jsonb,
  erstellt  timestamptz not null default now(),
  geaendert timestamptz not null default now()
);
comment on table public.anfragen_intern is
  'Provisionseingang je Vorgang (Betrag, Datum). Daraus ließe sich der Firmenanteil ableiten: nur Geschäftsführung und Finanzbuchhaltung.';

-- ---------- übrige Sammlungen ---------------------------------------

create table public.leads (
  id          text primary key,
  daten       jsonb not null default '{}'::jsonb,
  zugewiesen  text generated always as (daten ->> 'zugewiesen') stored,
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);
create index on public.leads (zugewiesen);

create table public.tickets (
  id          text primary key,
  daten       jsonb not null default '{}'::jsonb,
  von_id      text generated always as (daten ->> 'vonId') stored,
  empfaenger  text generated always as (daten ->> 'empfaenger') stored,
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);

create table public.smartmeter (
  id          text primary key,
  daten       jsonb not null default '{}'::jsonb,
  partner_id  text generated always as (daten ->> 'partnerId') stored,
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);

create table public.probleme (
  id          text primary key,
  daten       jsonb not null default '{}'::jsonb,
  betroffene  text[] generated always as (intern.ids_aus(daten -> 'betroffene')) stored,
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);
create index on public.probleme using gin (betroffene);

create table public.termine (
  id          text primary key,
  daten       jsonb not null default '{}'::jsonb,
  fuer_id     text generated always as (daten ->> 'fuerId') stored,
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);

create table public.akquise (
  id          text primary key,
  daten       jsonb not null default '{}'::jsonb,
  zugewiesen  text[] generated always as (intern.ids_aus(daten -> 'zugewiesen')) stored,
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);
create index on public.akquise using gin (zugewiesen);

create table public.aufgaben (
  id          text primary key,
  daten       jsonb not null default '{}'::jsonb,
  fuer_id     text generated always as (daten ->> 'fuerId') stored,
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);

create table public.protokoll (
  id          text primary key,
  daten       jsonb not null default '{}'::jsonb,
  erstellt_von text default intern.ich(),
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);

create table public.tippgeber (
  id          text primary key,
  daten       jsonb not null default '{}'::jsonb,
  besitzer_id text generated always as (daten ->> 'besitzerId') stored,
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);

create table public.ablage (
  id          text primary key,
  daten       jsonb not null default '{}'::jsonb,
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);

create table public.versorger (
  id          text primary key,
  daten       jsonb not null default '{}'::jsonb,
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);

create table public.versorger_intern (
  id          text primary key references public.versorger (id) on delete cascade,
  daten       jsonb not null default '{}'::jsonb,
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now()
);
comment on table public.versorger_intern is 'Firmenanteil je Versorger: nur Geschäftsführung.';

create table public.einstellungen (
  schluessel  text primary key,
  wert        jsonb,
  geaendert   timestamptz not null default now()
);
comment on table public.einstellungen is
  'bonus, bonusziele: für alle lesbar. firmenanteil: nur Geschäftsführung.';

-- ---------- Änderungszeitpunkt --------------------------------------

create or replace function intern.geaendert() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.geaendert := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['mitarbeiter','mitarbeiter_konditionen','mitarbeiter_stammdaten','einladungen',
    'anfragen','anfragen_intern','leads','tickets','smartmeter','probleme','termine','akquise','aufgaben',
    'protokoll','tippgeber','ablage','versorger','versorger_intern','einstellungen']
  loop
    execute format('create trigger geaendert before update on public.%I
                    for each row execute function intern.geaendert()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- generierte Spalten und auth_id darf der Client nicht direkt schreiben
revoke insert, update on public.mitarbeiter from authenticated;
grant insert (id, daten) , update (daten) on public.mitarbeiter to authenticated;
revoke insert, update on public.protokoll from authenticated;
grant insert (id, daten) on public.protokoll to authenticated;
