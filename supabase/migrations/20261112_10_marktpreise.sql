-- ====================================================================
--  Marktpreise (Spotpreise), zuerst Erdgas THE Day-Ahead je Gastag
--
--  Strom-Day-Ahead holt das Portal im Browser von Energy-Charts.
--  Für Erdgas gibt es keine freie Schnittstelle; die Tagespreise liegen
--  deshalb hier und werden von Beschaffung oder GF per CSV ergänzt.
--  Lesen dürfen nur interne Rollen und die Beschaffung (Lizenz der
--  Börsendaten: nicht öffentlich weitergeben).
-- ====================================================================

create table public.marktpreise (
  markt   text not null,            -- z. B. 'THE-DA' (Erdgas THE Day-Ahead)
  tag     date not null,            -- Gastag bzw. Liefertag
  preis   numeric(10, 3) not null,  -- €/MWh netto
  quelle  text,
  geaendert timestamptz not null default now(),
  primary key (markt, tag)
);
alter table public.marktpreise enable row level security;

create policy "lesen: Beschaffung und Innendienst" on public.marktpreise for select to authenticated
  using ((select intern.hat_rolle('Beschaffung', 'Geschäftsführung', 'Vertragsmanagement', 'Leitung Vertrieb', 'Kalkulation')));
create policy "anlegen: Beschaffung, GF" on public.marktpreise for insert to authenticated
  with check ((select intern.hat_rolle('Beschaffung', 'Geschäftsführung')));
create policy "ändern: Beschaffung, GF" on public.marktpreise for update to authenticated
  using ((select intern.hat_rolle('Beschaffung', 'Geschäftsführung')))
  with check ((select intern.hat_rolle('Beschaffung', 'Geschäftsführung')));
create policy "löschen: GF" on public.marktpreise for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung')));

grant select, insert, update, delete on public.marktpreise to authenticated;
