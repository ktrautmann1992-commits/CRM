-- Termine vergeben: Teamleiter und Leitung Vertrieb legen Termine (mit Kundendaten) für Mitarbeiter
-- ihrer eigenen Struktur an. Der Termin gehört dem Empfänger (fuerId); wer ihn vergeben hat, steht in
-- daten.vonId und darf ihn weiter sehen, ändern und löschen. Eigene Termine wie bisher.

drop policy if exists "nur eigene" on public.termine;

create policy "lesen: eigene und selbst vergebene" on public.termine for select to authenticated
  using (
    (select intern.aktiv())
    and (
      fuer_id = (select intern.ich())
      or (daten ->> 'vonId' = (select intern.ich()) and fuer_id = any ((select intern.struktur())))
    )
  );

create policy "anlegen: für sich oder die eigene Struktur" on public.termine for insert to authenticated
  with check (
    (select intern.aktiv())
    and (
      (fuer_id = (select intern.ich()) and coalesce(daten ->> 'vonId', (select intern.ich())) = (select intern.ich()))
      or (
        (select intern.hat_rolle(variadic array['Teamleiter', 'Leitung Vertrieb']))
        and daten ->> 'vonId' = (select intern.ich())
        and fuer_id = any ((select intern.struktur()))
      )
    )
  );

create policy "ändern: eigene und selbst vergebene" on public.termine for update to authenticated
  using (
    (select intern.aktiv())
    and (
      fuer_id = (select intern.ich())
      or (daten ->> 'vonId' = (select intern.ich()) and fuer_id = any ((select intern.struktur())))
    )
  )
  with check (
    (select intern.aktiv())
    and (
      fuer_id = (select intern.ich())
      or (daten ->> 'vonId' = (select intern.ich()) and fuer_id = any ((select intern.struktur())))
    )
  );

create policy "löschen: eigene und selbst vergebene" on public.termine for delete to authenticated
  using (
    (select intern.aktiv())
    and (
      fuer_id = (select intern.ich())
      or (daten ->> 'vonId' = (select intern.ich()) and fuer_id = any ((select intern.struktur())))
    )
  );
