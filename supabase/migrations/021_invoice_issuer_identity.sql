-- ============================================================
-- StockFlow MVP — Migration 021
-- Tenant-scoped invoice issuer settings and immutable snapshots
-- ============================================================

BEGIN;

-- Editable current settings. They are deliberately separate from companies:
-- changing them must never change an already issued invoice.
CREATE TABLE public.company_invoice_settings (
  company_id  uuid        PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  legal_name  text        NOT NULL,
  address     text        NOT NULL,
  eik         text        NOT NULL,
  vat_number  text,
  mol         text        NOT NULL,
  email       text,
  phone       text,
  bank_name   text,
  iban        text,
  bic         text,
  created_at  timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at  timestamptz NOT NULL DEFAULT pg_catalog.now(),

  CONSTRAINT company_invoice_settings_legal_name_required
    CHECK (pg_catalog.btrim(legal_name) <> ''),
  CONSTRAINT company_invoice_settings_address_required
    CHECK (pg_catalog.btrim(address) <> ''),
  CONSTRAINT company_invoice_settings_eik_required
    CHECK (pg_catalog.btrim(eik) <> ''),
  CONSTRAINT company_invoice_settings_mol_required
    CHECK (pg_catalog.btrim(mol) <> '')
);

CREATE TRIGGER trg_company_invoice_settings_updated_at
  BEFORE UPDATE ON public.company_invoice_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.company_invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_invoice_settings_admin_select
  ON public.company_invoice_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = (SELECT auth.uid())
        AND p.company_id = company_invoice_settings.company_id
        AND p.status = 'active'
        AND p.role = 'admin'
    )
  );

REVOKE ALL ON TABLE public.company_invoice_settings
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.company_invoice_settings TO authenticated;

-- The composite key makes the snapshot-to-invoice tenant relationship a
-- database invariant even though invoices.id is already globally unique.
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_id_company_id_key UNIQUE (id, company_id);

ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_invoice_company_fk
  FOREIGN KEY (invoice_id, company_id)
  REFERENCES public.invoices(id, company_id)
  ON DELETE CASCADE;

CREATE TABLE public.invoice_issuer_snapshots (
  invoice_id   uuid        PRIMARY KEY,
  company_id   uuid        NOT NULL,
  legal_name   text        NOT NULL,
  address      text        NOT NULL,
  eik          text        NOT NULL,
  vat_number   text,
  mol          text        NOT NULL,
  email        text,
  phone        text,
  bank_name    text,
  iban         text,
  bic          text,
  created_at   timestamptz NOT NULL DEFAULT pg_catalog.now(),

  CONSTRAINT invoice_issuer_snapshots_invoice_company_fk
    FOREIGN KEY (invoice_id, company_id)
    REFERENCES public.invoices(id, company_id)
    ON DELETE RESTRICT,
  CONSTRAINT invoice_issuer_snapshots_legal_name_required
    CHECK (pg_catalog.btrim(legal_name) <> ''),
  CONSTRAINT invoice_issuer_snapshots_address_required
    CHECK (pg_catalog.btrim(address) <> ''),
  CONSTRAINT invoice_issuer_snapshots_eik_required
    CHECK (pg_catalog.btrim(eik) <> ''),
  CONSTRAINT invoice_issuer_snapshots_mol_required
    CHECK (pg_catalog.btrim(mol) <> '')
);

CREATE INDEX idx_invoice_issuer_snapshots_company
  ON public.invoice_issuer_snapshots(company_id, invoice_id);

ALTER TABLE public.invoice_issuer_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_issuer_snapshots_company_select
  ON public.invoice_issuer_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = (SELECT auth.uid())
        AND p.company_id = invoice_issuer_snapshots.company_id
        AND p.status = 'active'
        AND p.role IN ('admin', 'operator')
    )
  );

REVOKE ALL ON TABLE public.invoice_issuer_snapshots
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.invoice_issuer_snapshots TO authenticated;

-- Defense in depth: snapshots cannot be rewritten or deleted after INSERT,
-- even if a future application path accidentally receives table privileges.
CREATE FUNCTION public.reject_invoice_issuer_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'Invoice issuer snapshots are immutable';
END;
$$;

CREATE TRIGGER trg_invoice_issuer_snapshots_immutable
  BEFORE UPDATE OR DELETE ON public.invoice_issuer_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.reject_invoice_issuer_snapshot_mutation();

REVOKE ALL ON FUNCTION public.reject_invoice_issuer_snapshot_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

-- Admin-only settings writer. company_id is derived from the active profile
-- and is intentionally absent from the public contract.
CREATE FUNCTION public.save_company_invoice_settings(
  p_legal_name text,
  p_address text,
  p_eik text,
  p_vat_number text,
  p_mol text,
  p_email text,
  p_phone text,
  p_bank_name text,
  p_iban text,
  p_bic text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_legal_name text := pg_catalog.btrim(p_legal_name);
  v_address text := pg_catalog.btrim(p_address);
  v_eik text := pg_catalog.btrim(p_eik);
  v_mol text := pg_catalog.btrim(p_mol);
BEGIN
  SELECT p.company_id
    INTO v_company_id
  FROM public.profiles AS p
  WHERE p.id = v_user_id
    AND p.status = 'active'
    AND p.role = 'admin';

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Active administrator is required';
  END IF;

  IF v_legal_name IS NULL OR v_legal_name = ''
     OR v_address IS NULL OR v_address = ''
     OR v_eik IS NULL OR v_eik = ''
     OR v_mol IS NULL OR v_mol = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'ISSUER_SETTINGS_REQUIRED_FIELDS';
  END IF;

  IF pg_catalog.char_length(v_legal_name) > 300
     OR pg_catalog.char_length(v_address) > 500
     OR pg_catalog.char_length(v_eik) > 50
     OR pg_catalog.char_length(v_mol) > 200
     OR pg_catalog.char_length(COALESCE(p_vat_number, '')) > 50
     OR pg_catalog.char_length(COALESCE(p_email, '')) > 320
     OR pg_catalog.char_length(COALESCE(p_phone, '')) > 100
     OR pg_catalog.char_length(COALESCE(p_bank_name, '')) > 200
     OR pg_catalog.char_length(COALESCE(p_iban, '')) > 100
     OR pg_catalog.char_length(COALESCE(p_bic, '')) > 50 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22001',
      MESSAGE = 'ISSUER_SETTINGS_FIELD_TOO_LONG';
  END IF;

  INSERT INTO public.company_invoice_settings (
    company_id, legal_name, address, eik, vat_number, mol,
    email, phone, bank_name, iban, bic
  ) VALUES (
    v_company_id, v_legal_name, v_address, v_eik,
    NULLIF(pg_catalog.btrim(p_vat_number), ''), v_mol,
    NULLIF(pg_catalog.btrim(p_email), ''),
    NULLIF(pg_catalog.btrim(p_phone), ''),
    NULLIF(pg_catalog.btrim(p_bank_name), ''),
    NULLIF(pg_catalog.btrim(p_iban), ''),
    NULLIF(pg_catalog.btrim(p_bic), '')
  )
  ON CONFLICT (company_id)
  DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    address = EXCLUDED.address,
    eik = EXCLUDED.eik,
    vat_number = EXCLUDED.vat_number,
    mol = EXCLUDED.mol,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    bank_name = EXCLUDED.bank_name,
    iban = EXCLUDED.iban,
    bic = EXCLUDED.bic;
END;
$$;

REVOKE ALL ON FUNCTION public.save_company_invoice_settings(
  text, text, text, text, text, text, text, text, text, text
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.save_company_invoice_settings(
  text, text, text, text, text, text, text, text, text, text
) TO authenticated;

-- No caller may mark a new invoice as issued without a snapshot created in
-- the same transaction. Historical issued invoices are left untouched.
CREATE FUNCTION public.enforce_invoice_issuer_snapshot_on_issue()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'issued' THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Invoice must be issued through issue_invoice';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM 'issued'
       AND NEW.status = 'issued'
       AND NOT EXISTS (
         SELECT 1
         FROM public.invoice_issuer_snapshots AS s
         WHERE s.invoice_id = NEW.id
           AND s.company_id = NEW.company_id
       ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Invoice issuer snapshot is required';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoices_require_issuer_snapshot_on_insert
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_issuer_snapshot_on_issue();

CREATE TRIGGER trg_invoices_require_issuer_snapshot_on_update
  BEFORE UPDATE OF status ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_issuer_snapshot_on_issue();

REVOKE ALL ON FUNCTION public.enforce_invoice_issuer_snapshot_on_issue()
  FROM PUBLIC, anon, authenticated, service_role;

-- Issuance, total recalculation, issuer snapshot creation and the status
-- transition are one database statement and therefore one transaction.
CREATE FUNCTION public.issue_invoice(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_invoice public.invoices%ROWTYPE;
  v_settings public.company_invoice_settings%ROWTYPE;
  v_item_count integer;
  v_subtotal numeric;
  v_vat_amount numeric;
  v_total numeric;
BEGIN
  SELECT p.company_id
    INTO v_company_id
  FROM public.profiles AS p
  WHERE p.id = v_user_id
    AND p.status = 'active'
    AND p.role IN ('admin', 'operator');

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Active operator or administrator is required';
  END IF;

  SELECT i.*
    INTO v_invoice
  FROM public.invoices AS i
  WHERE i.id = p_invoice_id
    AND i.company_id = v_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'INVOICE_NOT_FOUND';
  END IF;
  IF v_invoice.status <> 'draft' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'INVOICE_LOCKED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.customers AS c
    WHERE c.id = v_invoice.customer_id AND c.company_id = v_company_id
  ) OR (
    v_invoice.outgoing_order_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.outgoing_orders AS o
      WHERE o.id = v_invoice.outgoing_order_id
        AND o.company_id = v_company_id
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'INVOICE_TENANT_LINK_INVALID';
  END IF;

  SELECT s.*
    INTO v_settings
  FROM public.company_invoice_settings AS s
  WHERE s.company_id = v_company_id
  FOR SHARE;

  IF NOT FOUND
     OR pg_catalog.btrim(v_settings.legal_name) = ''
     OR pg_catalog.btrim(v_settings.address) = ''
     OR pg_catalog.btrim(v_settings.eik) = ''
     OR pg_catalog.btrim(v_settings.mol) = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'ISSUER_SETTINGS_REQUIRED';
  END IF;

  PERFORM 1
  FROM public.invoice_items AS ii
  WHERE ii.invoice_id = p_invoice_id
    AND ii.company_id = v_company_id
  ORDER BY ii.id
  FOR UPDATE;

  SELECT pg_catalog.count(*)::integer
    INTO v_item_count
  FROM public.invoice_items AS ii
  WHERE ii.invoice_id = p_invoice_id
    AND ii.company_id = v_company_id;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVOICE_ITEMS_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.invoice_items AS ii
    WHERE ii.invoice_id = p_invoice_id
      AND ii.company_id <> v_company_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'INVOICE_TENANT_LINK_INVALID';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.invoice_items AS ii
    WHERE ii.invoice_id = p_invoice_id
      AND ii.company_id = v_company_id
      AND ii.product_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.products AS p
        WHERE p.id = ii.product_id AND p.company_id = v_company_id
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'INVOICE_TENANT_LINK_INVALID';
  END IF;

  UPDATE public.invoice_items AS ii
  SET amount = pg_catalog.round(ii.quantity * ii.unit_price, 2)
  WHERE ii.invoice_id = p_invoice_id
    AND ii.company_id = v_company_id;

  SELECT pg_catalog.round(COALESCE(pg_catalog.sum(ii.amount), 0), 2)
    INTO v_subtotal
  FROM public.invoice_items AS ii
  WHERE ii.invoice_id = p_invoice_id
    AND ii.company_id = v_company_id;

  v_vat_amount := pg_catalog.round(v_subtotal * v_invoice.vat_rate / 100, 2);
  v_total := pg_catalog.round(v_subtotal + v_vat_amount, 2);

  INSERT INTO public.invoice_issuer_snapshots (
    invoice_id, company_id, legal_name, address, eik, vat_number, mol,
    email, phone, bank_name, iban, bic
  ) VALUES (
    p_invoice_id, v_company_id, v_settings.legal_name, v_settings.address,
    v_settings.eik, v_settings.vat_number, v_settings.mol,
    v_settings.email, v_settings.phone, v_settings.bank_name,
    v_settings.iban, v_settings.bic
  );

  UPDATE public.invoices AS i
  SET status = 'issued',
      subtotal = v_subtotal,
      vat_amount = v_vat_amount,
      total = v_total
  WHERE i.id = p_invoice_id
    AND i.company_id = v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_invoice(uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.issue_invoice(uuid) TO authenticated;

COMMIT;
