-- Tatsächlicher Aufschlag der Firma (v5.43)
-- Der dem Vertrieb mitgeteilte Aufschlag steht im Vorgang (anfragen.daten).
-- Der tatsächliche Aufschlag (aufschlagEcht) liegt nur hier: lesen und schreiben dürfen
-- Kalkulation und Geschäftsführung, lesen auch die Finanzbuchhaltung. Vertriebspartner,
-- Teamleiter und Leitung Vertrieb bekommen ihn nicht in den Browser.

create table public.aufschlaege_intern (
  id        text primary key references public.anfragen (id) on delete cascade,
  daten     jsonb not null default '{}'::jsonb,
  erstellt  timestamptz not null default now(),
  geaendert timestamptz not null default now()
);
comment on table public.aufschlaege_intern is
  'Tatsächlicher Aufschlag je Vorgang (Varianten, Lieferstellen, Versorgerbestätigung). Nur Kalkulation, Geschäftsführung, Finanzbuchhaltung.';

create trigger geaendert before update on public.aufschlaege_intern
  for each row execute function intern.geaendert();
alter table public.aufschlaege_intern enable row level security;
revoke all on public.aufschlaege_intern from anon;
grant select, insert, update, delete on public.aufschlaege_intern to authenticated;

create policy "lesen: Kalkulation, GF, FiBu" on public.aufschlaege_intern for select to authenticated
  using ((select intern.aktiv()) and (select intern.hat_rolle('Kalkulation', 'Geschäftsführung', 'Finanzbuchhaltung')));
create policy "anlegen: Kalkulation, GF" on public.aufschlaege_intern for insert to authenticated
  with check ((select intern.aktiv()) and (select intern.hat_rolle('Kalkulation', 'Geschäftsführung')));
create policy "ändern: Kalkulation, GF" on public.aufschlaege_intern for update to authenticated
  using ((select intern.aktiv()) and (select intern.hat_rolle('Kalkulation', 'Geschäftsführung')))
  with check ((select intern.aktiv()) and (select intern.hat_rolle('Kalkulation', 'Geschäftsführung')));
create policy "löschen: Kalkulation, GF" on public.aufschlaege_intern for delete to authenticated
  using ((select intern.aktiv()) and (select intern.hat_rolle('Kalkulation', 'Geschäftsführung')));

-- Sicherheitsnetz: der tatsächliche Aufschlag darf nie im Vorgang selbst landen
-- (z. B. von einer veralteten App-Fassung). Er wird beim Speichern entfernt.
create or replace function intern.ohne_schluessel(j jsonb, k text) returns jsonb
language sql immutable set search_path = '' as $$
  select case jsonb_typeof(j)
    when 'object' then coalesce((select jsonb_object_agg(e.key, intern.ohne_schluessel(e.value, k))
                                 from jsonb_each(j) e where e.key <> k), '{}'::jsonb)
    when 'array' then coalesce((select jsonb_agg(intern.ohne_schluessel(e.value, k) order by e.ord)
                                from jsonb_array_elements(j) with ordinality as e(value, ord)), '[]'::jsonb)
    else j end
$$;

create or replace function intern.anfragen_ohne_echt() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.daten::text like '%"aufschlagEcht"%' then
    new.daten := intern.ohne_schluessel(new.daten, 'aufschlagEcht');
  end if;
  return new;
end $$;
create trigger ohne_echt before insert or update on public.anfragen
  for each row execute function intern.anfragen_ohne_echt();

-- Live-Abgleich
alter publication supabase_realtime add table public.aufschlaege_intern;
