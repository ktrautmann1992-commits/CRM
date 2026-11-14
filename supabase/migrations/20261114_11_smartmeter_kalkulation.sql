-- Smartmeter-Angebot: Positionsvorlagen und Texte pflegt die Kalkulation selbst.
-- Wie bei den Umlagen darf die Kalkulation genau eine weitere Einstellung anlegen und ändern:
-- den Schlüssel 'smartmeter'. Lesen dürfen ihn wie bisher alle aktiven Mitarbeiter.

create policy "schreiben: Kalkulation nur Smartmeter" on public.einstellungen for insert to authenticated
  with check (
    (select intern.hat_rolle(variadic array['Kalkulation']))
    and (select intern.aktiv())
    and schluessel = 'smartmeter'
  );

create policy "ändern: Kalkulation nur Smartmeter" on public.einstellungen for update to authenticated
  using (
    (select intern.hat_rolle(variadic array['Kalkulation']))
    and schluessel = 'smartmeter'
  )
  with check (
    (select intern.hat_rolle(variadic array['Kalkulation']))
    and (select intern.aktiv())
    and schluessel = 'smartmeter'
  );
