-- Make purchase_date nullable in clients and units tables.
-- When a client or unit has status = 'inactive', no purchase date is required.

ALTER TABLE clients
  ALTER COLUMN purchase_date DROP NOT NULL;

ALTER TABLE units
  ALTER COLUMN purchase_date DROP NOT NULL;
