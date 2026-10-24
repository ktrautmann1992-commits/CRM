-- ====================================================================
--  Zeilenrechte je Rolle
--
--  Rollen: Vertriebspartner · Teamleiter · Leitung Vertrieb · Kalkulation ·
--  Vertragsmanagement · Leadmanagement · Finanzbuchhaltung · Geschäftsführung
--
--  Grundsatz: Nur freigeschaltete Zugänge (Status aktiv) sehen Daten.
--  Vertriebsrollen sehen sich selbst und ihre Struktur darunter.
-- ====================================================================

-- ---------- mitarbeiter ---------------------------------------------
create policy "lesen: aktive alle, gesperrte nur sich" on public.mitarbeiter for select to authenticated
  using ((select intern.aktiv()) or auth_id = (select auth.uid()));
create policy "anlegen: GF alle, Leitung Vertrieb nur Vertrieb" on public.mitarbeiter for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.hat_rolle('Leitung Vertrieb')) and rolle in ('Vertriebspartner', 'Teamleiter')));
create policy "ändern: GF, Leitung Vertrieb im Vertrieb, jeder sich selbst" on public.mitarbeiter for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.hat_rolle('Leitung Vertrieb')) and rolle in ('Vertriebspartner', 'Teamleiter'))
    or auth_id = (select auth.uid()))
  with check ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.hat_rolle('Leitung Vertrieb')) and rolle in ('Vertriebspartner', 'Teamleiter'))
    or auth_id = (select auth.uid()));
create policy "löschen: GF" on public.mitarbeiter for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung')) and auth_id is distinct from (select auth.uid()));

-- Feldschutz: was jemand an Mitarbeitern ändern darf
create or replace function intern.mitarbeiter_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r text := intern.rolle();
  selbst boolean := (old.auth_id is not null and old.auth_id = auth.uid());
begin
  if auth.uid() is null then return new; end if;              -- Server (Dienstschlüssel)
  if new.id is distinct from old.id then raise exception 'Die Kennung eines Mitarbeiters ist unveränderlich.'; end if;
  if r = 'Geschäftsführung' and intern.aktiv() then
    if selbst and (new.daten ->> 'rolle') is distinct from (old.daten ->> 'rolle') then
      raise exception 'Die eigene Rolle kann nicht geändert werden.';
    end if;
    return new;
  end if;

  if r = 'Leitung Vertrieb' and intern.aktiv() and not selbst then
    -- Struktur und Kontakt pflegen ja, freigeben/ablehnen nur die Geschäftsführung
    if (new.daten ->> 'status') is distinct from (old.daten ->> 'status')
       or (new.daten -> 'freigabe') is distinct from (old.daten -> 'freigabe') then
      raise exception 'Freigeben und Zurückweisen ist der Geschäftsführung vorbehalten.';
    end if;
    return new;
  end if;

  -- sich selbst: nur eigene Oberflächen- und Kontaktfelder
  if (new.daten ->> 'rolle')  is distinct from (old.daten ->> 'rolle')
     or (new.daten ->> 'upline') is distinct from (old.daten ->> 'upline')
     or (new.daten ->> 'team')   is distinct from (old.daten ->> 'team')
     or (new.daten ->> 'email')  is distinct from (old.daten ->> 'email')
     or (new.daten -> 'freigabe') is distinct from (old.daten -> 'freigabe') then
    raise exception 'Rolle, Struktur, E-Mail und Freigabe ändert nur die Geschäftsführung.';
  end if;
  if (new.daten ->> 'status') is distinct from (old.daten ->> 'status')
     and not ((new.daten ->> 'status') = 'pruefung' and (old.daten ->> 'status') in ('registriert', 'abgelehnt', 'pruefung', 'aktiv')) then
    raise exception 'Den Freischaltstatus ändert nur die Geschäftsführung.';
  end if;
  return new;
end $$;
create trigger schutz before update on public.mitarbeiter for each row execute function intern.mitarbeiter_schutz();

create or replace function intern.mitarbeiter_neu() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if intern.rolle() <> 'Geschäftsführung' and (new.daten ->> 'status') is distinct from 'eingeladen' then
    raise exception 'Neue Mitarbeiter beginnen mit dem Status eingeladen.';
  end if;
  return new;
end $$;
create trigger neu before insert on public.mitarbeiter for each row execute function intern.mitarbeiter_neu();

-- ---------- mitarbeiter_konditionen ---------------------------------
create policy "lesen: Struktur, GF, FiBu, Kalkulation, Leitung" on public.mitarbeiter_konditionen for select to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Finanzbuchhaltung', 'Kalkulation', 'Leitung Vertrieb'))
    or id = any ((select intern.struktur())::text[]));
create policy "anlegen: GF, Leitung" on public.mitarbeiter_konditionen for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb')));
create policy "ändern: GF, Leitung, Teamleiter für Struktur, jeder eigene Ziele" on public.mitarbeiter_konditionen for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb'))
    or id = any ((select intern.struktur())::text[]))
  with check ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb'))
    or id = any ((select intern.struktur())::text[]));

create or replace function intern.konditionen_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r text := intern.rolle();
begin
  if auth.uid() is null or r = 'Geschäftsführung' then return new; end if;
  -- Eigenakquise-Bonus und Bonusziele: nur Geschäftsführung
  if (new.daten -> 'eigenBonus') is distinct from (old.daten -> 'eigenBonus')
     or (new.daten -> 'bonusziele') is distinct from (old.daten -> 'bonusziele') then
    raise exception 'Bonus und Bonusziele legt die Geschäftsführung fest.';
  end if;
  -- Provisionssatz: Leitung Vertrieb, aber nicht den eigenen und nicht über der Obergrenze
  if (new.daten -> 'satz') is distinct from (old.daten -> 'satz') then
    if r <> 'Leitung Vertrieb' or new.id = intern.ich() then
      raise exception 'Provisionssätze legt die Leitung Vertrieb oder die Geschäftsführung fest.';
    end if;
    if coalesce((new.daten ->> 'satz')::numeric, 0) > 50 then
      raise exception 'Der Satz liegt über der Obergrenze von 50 Prozent.';
    end if;
  end if;
  return new;
end $$;
create trigger schutz before update on public.mitarbeiter_konditionen for each row execute function intern.konditionen_schutz();

-- ---------- mitarbeiter_stammdaten (Bank, Ausweis) ------------------
create policy "lesen: selbst, GF, FiBu" on public.mitarbeiter_stammdaten for select to authenticated
  using (id = (select intern.ich()) or (select intern.hat_rolle('Geschäftsführung', 'Finanzbuchhaltung')));
create policy "anlegen: selbst, GF, Leitung bei Neuanlage" on public.mitarbeiter_stammdaten for insert to authenticated
  with check (id = (select intern.ich()) or (select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb')));
create policy "ändern: selbst, GF" on public.mitarbeiter_stammdaten for update to authenticated
  using (id = (select intern.ich()) or (select intern.hat_rolle('Geschäftsführung')))
  with check (id = (select intern.ich()) or (select intern.hat_rolle('Geschäftsführung')));

create or replace function intern.stammdaten_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or intern.rolle() = 'Geschäftsführung' then return new; end if;
  if (new.daten -> 'pruefHinweis') is distinct from (old.daten -> 'pruefHinweis') then
    raise exception 'Den Prüfhinweis schreibt die Geschäftsführung.';
  end if;
  return new;
end $$;
create trigger schutz before update on public.mitarbeiter_stammdaten for each row execute function intern.stammdaten_schutz();

-- ---------- einladungen ---------------------------------------------
create policy "GF und Leitung" on public.einladungen for all to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb')))
  with check ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb')));

-- ---------- anfragen ------------------------------------------------
create or replace function intern.anfrage_sichtbar(p_partner text, p_beteiligte text[], p_status text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when not intern.aktiv() then false
    when intern.rolle() in ('Geschäftsführung', 'Finanzbuchhaltung', 'Leitung Vertrieb') then true
    when intern.rolle() in ('Kalkulation', 'Vertragsmanagement') then p_status is distinct from 'entwurf'
    when intern.rolle() in ('Vertriebspartner', 'Teamleiter') then
      p_partner = any (intern.struktur()) or p_beteiligte && intern.struktur()
    else false
  end
$$;

create policy "lesen" on public.anfragen for select to authenticated
  using ((select intern.anfrage_sichtbar(partner_id, beteiligte, status)));
create policy "anlegen: Vertrieb für sich und Struktur, GF" on public.anfragen for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb'))
    or ((select intern.hat_rolle('Vertriebspartner', 'Teamleiter')) and partner_id = any ((select intern.struktur())::text[])));
create policy "ändern: wer sie sieht (außer Leadmanagement)" on public.anfragen for update to authenticated
  using ((select intern.anfrage_sichtbar(partner_id, beteiligte, status)))
  with check ((select intern.anfrage_sichtbar(partner_id, beteiligte, status)) or (select intern.hat_rolle('Kalkulation')));
create policy "löschen: Entwürfe der Struktur, GF" on public.anfragen for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or (status = 'entwurf' and partner_id = any ((select intern.struktur())::text[])));

-- Der Weg eines Vorgangs ist festgelegt; niemand außer der Geschäftsführung kürzt ihn ab.
create or replace function intern.anfragen_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r text := intern.rolle();
  vertrieb boolean := r in ('Vertriebspartner', 'Teamleiter', 'Leitung Vertrieb');
  alt text := case when tg_op = 'UPDATE' then old.daten ->> 'status' end;
  neu text := new.daten ->> 'status';
begin
  if auth.uid() is null or r = 'Geschäftsführung' then return new; end if;

  if tg_op = 'INSERT' then
    if neu not in ('entwurf', 'eingereicht') then
      raise exception 'Neue Vorgänge beginnen als Entwurf oder eingereicht.';
    end if;
    if coalesce(new.daten -> 'bestaetigung', 'null') <> 'null'
       or coalesce(new.daten -> 'ausgezahlt', '{}') not in ('{}', 'null') then
      raise exception 'Bestätigung und Auszahlung werden nicht beim Anlegen gesetzt.';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id then raise exception 'Die Vorgangsnummer ist unveränderlich.'; end if;

  -- Statuswechsel je Rolle
  if neu is distinct from alt then
    if alt = 'abgeschlossen' or neu = 'abgeschlossen' then
      raise exception 'Abschließen und Wiederöffnen ist der Geschäftsführung vorbehalten.';
    end if;
    if neu in ('angefragt', 'angebot', 'einreichung', 'bestaetigt', 'klaerfall') and r <> 'Kalkulation' then
      raise exception 'Diesen Schritt (%) setzt die Kalkulation.', neu;
    end if;
    if neu = 'ruecksprache' and r not in ('Kalkulation', 'Leitung Vertrieb') then
      raise exception 'Rücksprachen stellt die Kalkulation.';
    end if;
    if neu in ('entwurf', 'eingereicht', 'uebermittelt', 'abgelehnt')
       and not (vertrieb or r = 'Kalkulation') then
      raise exception 'Diesen Schritt (%) darf die Rolle % nicht setzen.', neu, r;
    end if;
    if neu = 'uebermittelt' and vertrieb and alt <> 'angebot' then
      raise exception 'Ein Auftrag kann nur aus einem vorliegenden Angebot übermittelt werden.';
    end if;
  end if;

  -- Versorgerbestätigung (Grundlage der Provision): nur Kalkulation
  if (new.daten -> 'bestaetigung') is distinct from (old.daten -> 'bestaetigung') and r <> 'Kalkulation' then
    raise exception 'Die Versorgerbestätigung erfasst die Kalkulation.';
  end if;
  -- Auszahlungen: nur Finanzbuchhaltung
  if (new.daten -> 'ausgezahlt') is distinct from (old.daten -> 'ausgezahlt') and r <> 'Finanzbuchhaltung' then
    raise exception 'Auszahlungen vermerkt die Finanzbuchhaltung.';
  end if;
  -- Die Finanzbuchhaltung vermerkt nur Auszahlungen
  if r = 'Finanzbuchhaltung' and (new.daten - 'ausgezahlt') is distinct from (old.daten - 'ausgezahlt') then
    raise exception 'Die Finanzbuchhaltung ändert an Vorgängen nur die Auszahlung.';
  end if;
  -- Betreuer und Anteile: Vertragsmanagement, im Entwurf auch der Vertrieb
  if ((new.daten -> 'beteiligte') is distinct from (old.daten -> 'beteiligte')
      or (new.daten ->> 'partnerId') is distinct from (old.daten ->> 'partnerId'))
     and not (r = 'Vertragsmanagement' or (vertrieb and alt in ('entwurf', 'klaerfall'))) then
    raise exception 'Betreuer eines laufenden Vorgangs ändert das Vertragsmanagement.';
  end if;
  return new;
end $$;
create trigger schutz before insert or update on public.anfragen for each row execute function intern.anfragen_schutz();

-- ---------- anfragen_intern (Provisionseingang) ---------------------
create policy "lesen: GF, FiBu" on public.anfragen_intern for select to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Finanzbuchhaltung')));
create policy "schreiben: GF" on public.anfragen_intern for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung')));
create policy "ändern: GF" on public.anfragen_intern for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))) with check ((select intern.hat_rolle('Geschäftsführung')));
create policy "löschen: GF" on public.anfragen_intern for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung')));

-- ---------- leads ---------------------------------------------------
create policy "lesen" on public.leads for select to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb', 'Leadmanagement', 'Finanzbuchhaltung'))
    or zugewiesen = any ((select intern.struktur())::text[]));
create policy "anlegen" on public.leads for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb', 'Leadmanagement'))
    or ((select intern.hat_rolle('Vertriebspartner', 'Teamleiter')) and zugewiesen = any ((select intern.struktur())::text[])));
create policy "ändern" on public.leads for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb', 'Leadmanagement'))
    or zugewiesen = any ((select intern.struktur())::text[]))
  with check ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb', 'Leadmanagement'))
    or zugewiesen = any ((select intern.struktur())::text[]));
create policy "löschen" on public.leads for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb', 'Leadmanagement')));

-- ---------- tickets -------------------------------------------------
create policy "lesen und antworten: Absender und Empfängerrolle" on public.tickets for select to authenticated
  using ((select intern.aktiv()) and (von_id = (select intern.ich()) or empfaenger = (select intern.rolle())));
create policy "anlegen: im eigenen Namen" on public.tickets for insert to authenticated
  with check ((select intern.aktiv()) and von_id = (select intern.ich()));
create policy "ändern" on public.tickets for update to authenticated
  using ((select intern.aktiv()) and (von_id = (select intern.ich()) or empfaenger = (select intern.rolle())))
  with check ((select intern.aktiv()) and (von_id = (select intern.ich()) or empfaenger = (select intern.rolle())));
create policy "löschen: GF" on public.tickets for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung')));

-- ---------- smartmeter ----------------------------------------------
create policy "lesen" on public.smartmeter for select to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Kalkulation', 'Vertragsmanagement'))
    or ((select intern.aktiv()) and partner_id = any ((select intern.struktur())::text[])));
create policy "anlegen" on public.smartmeter for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung', 'Vertragsmanagement'))
    or ((select intern.aktiv()) and partner_id = any ((select intern.struktur())::text[])));
create policy "ändern" on public.smartmeter for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Kalkulation', 'Vertragsmanagement'))
    or ((select intern.aktiv()) and partner_id = any ((select intern.struktur())::text[])))
  with check ((select intern.hat_rolle('Geschäftsführung', 'Kalkulation', 'Vertragsmanagement'))
    or ((select intern.aktiv()) and partner_id = any ((select intern.struktur())::text[])));
create policy "löschen: GF" on public.smartmeter for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung')));

create or replace function intern.smartmeter_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or intern.rolle() = 'Geschäftsführung' then return new; end if;
  if (new.daten -> 'provision') is distinct from (case when tg_op = 'UPDATE' then old.daten -> 'provision' end)
     and coalesce(new.daten -> 'provision', 'null') <> 'null' then
    raise exception 'Die Smartmeter-Provision erfasst die Geschäftsführung.';
  end if;
  return new;
end $$;
create trigger schutz before insert or update on public.smartmeter for each row execute function intern.smartmeter_schutz();

-- ---------- probleme (Problemfälle, Stornos) ------------------------
create policy "lesen" on public.probleme for select to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Vertragsmanagement', 'Leitung Vertrieb', 'Finanzbuchhaltung'))
    or ((select intern.aktiv()) and betroffene && (select intern.struktur())));
create policy "anlegen: VM, GF" on public.probleme for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung', 'Vertragsmanagement')));
create policy "ändern: wer ihn sieht" on public.probleme for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Vertragsmanagement', 'Leitung Vertrieb', 'Finanzbuchhaltung'))
    or ((select intern.aktiv()) and betroffene && (select intern.struktur())))
  with check ((select intern.hat_rolle('Geschäftsführung', 'Vertragsmanagement', 'Leitung Vertrieb', 'Finanzbuchhaltung'))
    or ((select intern.aktiv()) and betroffene && (select intern.struktur())));
create policy "löschen: VM, GF" on public.probleme for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Vertragsmanagement')));

-- ---------- persönliche Listen: Termine, Aufgaben, Tippgeber --------
create policy "nur eigene" on public.termine for all to authenticated
  using ((select intern.aktiv()) and fuer_id = (select intern.ich()))
  with check ((select intern.aktiv()) and fuer_id = (select intern.ich()));
create policy "nur eigene" on public.aufgaben for all to authenticated
  using ((select intern.aktiv()) and fuer_id = (select intern.ich()))
  with check ((select intern.aktiv()) and fuer_id = (select intern.ich()));
create policy "nur eigene" on public.tippgeber for all to authenticated
  using ((select intern.aktiv()) and besitzer_id = (select intern.ich()))
  with check ((select intern.aktiv()) and besitzer_id = (select intern.ich()));

-- ---------- akquise -------------------------------------------------
create policy "lesen" on public.akquise for select to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb', 'Leadmanagement'))
    or ((select intern.aktiv()) and zugewiesen && (select intern.struktur())));
create policy "anlegen" on public.akquise for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb', 'Leadmanagement')));
create policy "ändern" on public.akquise for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb', 'Leadmanagement'))
    or ((select intern.aktiv()) and zugewiesen && (select intern.struktur())))
  with check ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb', 'Leadmanagement'))
    or ((select intern.aktiv()) and zugewiesen && (select intern.struktur())));
create policy "löschen" on public.akquise for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb', 'Leadmanagement')));

-- ---------- protokoll: jeder schreibt, nur GF liest, keiner ändert --
create policy "lesen: GF" on public.protokoll for select to authenticated
  using ((select intern.hat_rolle('Geschäftsführung')));
create policy "anlegen: alle aktiven" on public.protokoll for insert to authenticated
  with check ((select intern.aktiv()));

-- ---------- ablage (Unterlagen) -------------------------------------
create policy "lesen: alle aktiven" on public.ablage for select to authenticated
  using ((select intern.aktiv()));
create policy "anlegen: GF, Leitung" on public.ablage for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb')));
create policy "ändern: GF, Leitung" on public.ablage for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb')))
  with check ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb')));
create policy "löschen: GF, Leitung" on public.ablage for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Leitung Vertrieb')));

-- ---------- versorger -----------------------------------------------
create policy "lesen: alle aktiven" on public.versorger for select to authenticated
  using ((select intern.aktiv()));
create policy "anlegen: GF" on public.versorger for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung')));
create policy "ändern: GF" on public.versorger for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))) with check ((select intern.hat_rolle('Geschäftsführung')));
create policy "löschen: GF" on public.versorger for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung')));
create policy "nur GF" on public.versorger_intern for all to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))) with check ((select intern.hat_rolle('Geschäftsführung')));

-- ---------- einstellungen -------------------------------------------
create policy "lesen: alle aktiven, Firmenanteil nur GF" on public.einstellungen for select to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))
    or ((select intern.aktiv()) and schluessel <> 'firmenanteil'));
create policy "schreiben: GF" on public.einstellungen for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung')));
create policy "ändern: GF" on public.einstellungen for update to authenticated
  using ((select intern.hat_rolle('Geschäftsführung'))) with check ((select intern.hat_rolle('Geschäftsführung')));

-- ---------- Kundenprüfung über alle Vorgänge ------------------------
-- Antwortet nur „frei / Kunde / in Bearbeitung / Lead" und die Anzahl,
-- nie, wer den Kunden betreut. Rechtsformen werden ausgeblendet.
create or replace function intern.firmenkern(t text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  n text := regexp_replace(lower(coalesce(t, '')), '[^a-zäöüß0-9]', '', 'g');
  r text;
begin
  foreach r in array array['gmbhcokg','gmbhco','gmbh','ohg','kgaa','kg','ag','ek','ev','gbr','ug','mbh'] loop
    if right(n, length(r)) = r then n := left(n, length(n) - length(r)); end if;
  end loop;
  return n;
end $$;

create or replace function public.kunde_pruefen(p_firma text, p_plz text default '', p_malo text default '')
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  g text := intern.firmenkern(p_firma);
  malo text := regexp_replace(coalesce(p_malo, ''), '\s', '', 'g');
  plz text := trim(coalesce(p_plz, ''));
  bestand int; laufend int; leads int;
begin
  if not intern.aktiv() then raise exception 'Nicht angemeldet.'; end if;
  if length(g) < 3 then return jsonb_build_object('art', 'kurz'); end if;

  with treffer as (
    select a.status from public.anfragen a
    where a.status is distinct from 'abgelehnt' and a.status is distinct from 'entwurf'
      and (
        (malo <> '' and exists (select 1 from jsonb_array_elements(coalesce(a.daten -> 'lieferstellen', '[]')) l
                                where regexp_replace(coalesce(l ->> 'maloId', ''), '\s', '', 'g') = malo))
        or (intern.firmenkern(a.daten #>> '{kunde,firma}') <> ''
            and (intern.firmenkern(a.daten #>> '{kunde,firma}') = g
                 or position(g in intern.firmenkern(a.daten #>> '{kunde,firma}')) > 0
                 or position(intern.firmenkern(a.daten #>> '{kunde,firma}') in g) > 0)
            and (plz = '' or a.daten #>> '{kunde,plz}' = plz)))
  )
  select count(*) filter (where status in ('bestaetigt', 'abgeschlossen')),
         count(*) filter (where status not in ('bestaetigt', 'abgeschlossen'))
    into bestand, laufend from treffer;

  select count(*) into leads from public.leads l
  where intern.firmenkern(l.daten ->> 'firma') <> ''
    and (intern.firmenkern(l.daten ->> 'firma') = g
         or position(g in intern.firmenkern(l.daten ->> 'firma')) > 0
         or position(intern.firmenkern(l.daten ->> 'firma') in g) > 0)
    and (plz = '' or l.daten ->> 'plz' = plz);

  return jsonb_build_object(
    'art', case when bestand > 0 then 'kunde' when laufend > 0 then 'bearbeitung'
                when leads > 0 then 'lead' else 'frei' end,
    'anzahl', bestand + laufend + leads);
end $$;
revoke all on function public.kunde_pruefen(text, text, text) from public, anon;
grant execute on function public.kunde_pruefen(text, text, text) to authenticated;

-- Hilfsfunktionen nicht von außen aufrufbar
revoke all on all functions in schema intern from public, anon;
grant execute on all functions in schema intern to authenticated;
