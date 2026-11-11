-- ====================================================================
--  Beschaffung: freie Aufträge ohne Vorgang
--
--  Die Beschaffung (sowie GF, VM und Leitung Vertrieb) kann einen
--  Beschaffungsplan auch für einen Kunden erstellen, der im Portal
--  nicht angelegt ist: Kundendaten von Hand, Lastgang per Upload.
--  Ein freier Auftrag hat keine anfrageId und keinen Partner.
--  Freie Aufträge darf die Beschaffung auch wieder löschen.
-- ====================================================================

drop policy "anlegen: GF, VM, Vertrieb" on public.beschaffung;
create policy "anlegen: GF, VM, Vertrieb, Beschaffung (frei)" on public.beschaffung for insert to authenticated
  with check ((select intern.hat_rolle('Geschäftsführung', 'Vertragsmanagement', 'Leitung Vertrieb'))
    or ((select intern.hat_rolle('Beschaffung')) and anfrage_id is null)
    or ((select intern.hat_rolle('Vertriebspartner', 'Teamleiter'))
        and partner_id = any ((select intern.struktur())::text[])));

drop policy "löschen: GF, VM" on public.beschaffung;
create policy "löschen: GF, VM, Beschaffung (frei)" on public.beschaffung for delete to authenticated
  using ((select intern.hat_rolle('Geschäftsführung', 'Vertragsmanagement'))
    or ((select intern.hat_rolle('Beschaffung')) and anfrage_id is null));

create or replace function intern.beschaffung_schutz() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v record;
begin
  -- Provisionsangaben gehören nicht in den Auftrag
  new.daten := new.daten - 'aufschlag' - 'provisionErhalten' - 'ausgezahlt' - 'provision' - 'kalkulation';

  if auth.uid() is null then return new; end if;              -- Server (Dienstschlüssel)

  if tg_op = 'INSERT' then
    -- freier Auftrag: ohne Vorgang, ohne Partner
    if coalesce(new.daten ->> 'anfrageId', '') = '' then
      if not intern.hat_rolle('Beschaffung', 'Geschäftsführung', 'Vertragsmanagement', 'Leitung Vertrieb') then
        raise exception 'Freie Beschaffungsaufträge legen nur Beschaffung, GF, VM und Leitung Vertrieb an.';
      end if;
      new.daten := (new.daten - 'anfrageId' - 'partnerId') || '{"frei": true}'::jsonb;
      return new;
    end if;

    select a.id, a.partner_id, a.status, a.beteiligte into v
      from public.anfragen a where a.id = new.daten ->> 'anfrageId';
    if v.id is null then
      raise exception 'Zu diesem Auftrag gibt es keinen Vorgang.';
    end if;
    if v.status is distinct from 'abgeschlossen' then
      raise exception 'An die Beschaffung übergeben werden nur abgeschlossene Kunden.';
    end if;
    if not intern.anfrage_sichtbar(v.partner_id, v.beteiligte, v.status) then
      raise exception 'Diesen Vorgang darfst du nicht übergeben.';
    end if;
    new.daten := jsonb_set(new.daten - 'frei', '{partnerId}', to_jsonb(v.partner_id));
    return new;
  end if;

  if new.id is distinct from old.id
     or (new.daten ->> 'anfrageId') is distinct from (old.daten ->> 'anfrageId')
     or (new.daten ->> 'partnerId') is distinct from (old.daten ->> 'partnerId')
     or (new.daten -> 'frei') is distinct from (old.daten -> 'frei') then
    raise exception 'Vorgang und Vertriebspartner eines Beschaffungsauftrags sind unveränderlich.';
  end if;
  return new;
end $$;
revoke all on function intern.beschaffung_schutz() from public, anon, authenticated;
