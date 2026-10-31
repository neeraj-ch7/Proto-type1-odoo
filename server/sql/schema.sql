-- Brightloop Schema for Supabase Postgres
-- Compatible with all models and indexes defined in CONTRACT.md

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
  reset_token_hash TEXT,
  reset_token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 2. Counters (Atomic sequence generator)
CREATE TABLE IF NOT EXISTS counters (
  key TEXT PRIMARY KEY,
  seq INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'service',
  sales_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12, 2) DEFAULT 0,
  notes TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  variants JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  billing_period TEXT NOT NULL CHECK (billing_period IN ('daily', 'weekly', 'monthly', 'yearly')),
  min_qty INTEGER NOT NULL DEFAULT 1,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  auto_close BOOLEAN NOT NULL DEFAULT false,
  closable BOOLEAN NOT NULL DEFAULT true,
  pausable BOOLEAN NOT NULL DEFAULT true,
  renewable BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Taxes
CREATE TABLE IF NOT EXISTS taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rate NUMERIC(6, 2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Discounts
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'percent')),
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  min_purchase NUMERIC(12, 2) DEFAULT 0,
  min_qty INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  usage_limit INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  applies_to TEXT NOT NULL DEFAULT 'subscription' CHECK (applies_to IN ('product', 'subscription')),
  products TEXT[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Quotation Templates
CREATE TABLE IF NOT EXISTS quotation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  validity_days INTEGER NOT NULL DEFAULT 30,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  start_date TIMESTAMPTZ NOT NULL,
  expiry_date TIMESTAMPTZ,
  payment_terms INTEGER NOT NULL DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'quotation', 'confirmed', 'active', 'closed')),
  next_invoice_date TIMESTAMPTZ,
  quotation_valid_until TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_next_invoice_date ON subscriptions (status, next_invoice_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions (customer_id);

-- 9. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES users(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid', 'cancelled')),
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
  due_date TIMESTAMPTZ NOT NULL,
  issued_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  applied_discounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compound unique index preventing duplicate billing for the same subscription and period start:
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_subscription_period_start ON invoices (subscription_id, period_start);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date ON invoices (status, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_created_at ON invoices (customer_id, created_at DESC);

-- 10. Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id),
  method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'bank_transfer', 'upi', 'other')),
  amount NUMERIC(12, 2) NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT DEFAULT '',
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments (date);

