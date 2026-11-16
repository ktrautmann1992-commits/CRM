-- Angebot an den Kunden senden: persönlicher Link, Öffnen messen, Annahme mit Unterschrift.
-- Je Versand eine Zeile. Die id ist zugleich das Geheimnis im Link (zufällig, 32 Zeichen).
-- Schreiben nur die Funktion „kundenangebot“ (Dienstschlüssel). Lesen darf, wer den Vorgang sieht.
-- daten: { partnerId, an, satz, felder: { iban, funktion, geburtsdatum, steuernummer },
--          gesendet, von, geoeffnet: [Zeitpunkte], angesehen: [{ variante, zeit }],
--          angenommen: { zeit, variante, name, funktion, iban, geburtsdatum, steuernummer, datei, stellen } ,
--          gesperrt }

create table public.kundenlinks (
  id         text primary key check (length(id) >= 32),
  anfrage_id text not null references public.anfragen (id) on delete cascade,
  daten      jsonb not null default '{}'::jsonb,
  erstellt   timestamptz not null default now(),
  geaendert  timestamptz not null default now()
);
create index on public.kundenlinks (anfrage_id);

alter table public.kundenlinks enable row level security;

create policy "lesen: wer den Vorgang sieht" on public.kundenlinks for select to authenticated
  using ((select intern.aktiv()) and exists (select 1 from public.anfragen a where a.id = anfrage_id));

revoke all on public.kundenlinks from anon;
grant select on public.kundenlinks to authenticated;

create trigger geaendert before update on public.kundenlinks
  for each row execute function intern.geaendert();

alter publication supabase_realtime add table public.kundenlinks;
