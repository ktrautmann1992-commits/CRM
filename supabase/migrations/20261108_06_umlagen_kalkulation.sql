-- Staatliche Umlagen und Abgaben (ct/kWh je Sparte) pflegt die Kalkulation selbst.
-- Bisher durfte nur die Geschäftsführung Einstellungen schreiben. Die Kalkulation darf jetzt
-- genau eine Einstellung anlegen und ändern: den Schlüssel 'umlagen'. Alles andere bleibt bei der GF.
-- Lesen dürfen ihn wie bisher alle aktiven Mitarbeiter (nur der Firmenanteil ist der GF vorbehalten).

create policy "schreiben: Kalkulation nur Umlagen" on public.einstellungen for insert to authenticated
  with check (
    (select intern.hat_rolle(variadic array['Kalkulation']))
    and (select intern.aktiv())
    and schluessel = 'umlagen'
  );

create policy "ändern: Kalkulation nur Umlagen" on public.einstellungen for update to authenticated
  using (
    (select intern.hat_rolle(variadic array['Kalkulation']))
    and schluessel = 'umlagen'
  )
  with check (
    (select intern.hat_rolle(variadic array['Kalkulation']))
    and (select intern.aktiv())
    and schluessel = 'umlagen'
  );
