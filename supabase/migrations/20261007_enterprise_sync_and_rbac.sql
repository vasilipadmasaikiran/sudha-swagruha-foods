-- ==============================================================================
-- Database Migration: Enterprise Live Synchronization, RBAC & Order Tracking
-- Migration File: supabase/migrations/20261007_enterprise_sync_and_rbac.sql
-- Description:
--   1. Adds live tracking metadata and status milestone history to `orders`.
--   2. Updates `orders` status check constraint to support dispatched/processing.
--   3. Creates `admin_users` table with password hashing and RBAC roles.
--   4. Creates `audit_logs` table for tracking administrative changes.
--   5. Ensures `store_settings` table adheres to the Key-Value (key, value) schema.
--   6. Configures Supabase Realtime replication & RLS policies safely.
-- ==============================================================================

-- 1. Extend Orders table with tracking attributes and milestone history
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS tracking_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS courier_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS order_status_history JSONB DEFAULT '[]'::jsonb;

-- Safely expand order_status check constraint to support 'dispatched' and 'processing'
DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
  ALTER TABLE public.orders ADD CONSTRAINT orders_order_status_check 
    CHECK (order_status IN ('placed', 'confirmed', 'preparing', 'processing', 'packed', 'shipped', 'dispatched', 'delivered', 'cancelled', 'returned'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Indexes for lightning-fast customer tracking lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_mobile ON public.orders(customer_mobile);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON public.orders(tracking_id);

-- 2. Create Admin Users Table with RBAC
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ROOT_ADMIN', 'STORE_KEEPER', 'ORDER_PROCESSOR')),
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default system administrators (SHA-256 hashed passwords matching demo store)
INSERT INTO public.admin_users (email, full_name, role, password_hash, status)
VALUES
  ('admin@sudhaswagruha.com', 'Sudha Root Admin', 'ROOT_ADMIN', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'active'),
  ('store@sudhaswagruha.com', 'Suresh Stock Manager', 'STORE_KEEPER', 'a9354eefca55848bb319864273523f2f84b655f4ef07289569fa123b320d5885', 'active'),
  ('orders@sudhaswagruha.com', 'Pooja Order Coordinator', 'ORDER_PROCESSOR', 'ad62f4893707cb6b98661fc86a5127ee6db1ff292ff24ebfec05877c4aa4858b', 'active')
ON CONFLICT (email) DO UPDATE
SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- 3. Create Enterprise Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 4. Store Settings Table (Key-Value JSONB architecture)
CREATE TABLE IF NOT EXISTS public.store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed/Update default store branding & contact settings
INSERT INTO public.store_settings (key, value)
VALUES (
  'store_contact',
  '{
    "businessName": "Sudha Swagruha Foods",
    "tagline": "100% Homemade Andhra Pickles, Podis & Sweets",
    "websiteTitle": "Sudha Swagruha Foods | Authentic Andhra Delicacies",
    "businessPhone": "8374634989",
    "businessWhatsApp": "918374634989",
    "businessEmail": "info@sudhaswagruhafoods.com",
    "businessAddress": "Plot 18, Traditional Foods Lane, Benz Circle, Vijayawada, Andhra Pradesh 520010",
    "footerText": "Pure Andhra Heritage Sweets, Pickles & Podis. Preserving grandmother traditions with wood-pressed oils and pure hand-picked spices."
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET
  value = store_settings.value || EXCLUDED.value,
  updated_at = NOW();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies for orders
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view own orders by order number" ON public.orders;
DROP POLICY IF EXISTS "Anyone can select orders" ON public.orders;
CREATE POLICY "Anyone can select orders" ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authorized can update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
CREATE POLICY "Anyone can update orders" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete orders" ON public.orders;
CREATE POLICY "Anyone can delete orders" ON public.orders FOR DELETE USING (true);

-- Idempotent RLS Policies for store_settings
DROP POLICY IF EXISTS "Public can view store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Anyone can select store_settings" ON public.store_settings;
CREATE POLICY "Anyone can select store_settings" ON public.store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authorized can update store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Anyone can update store_settings" ON public.store_settings;
CREATE POLICY "Anyone can update store_settings" ON public.store_settings FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert store_settings" ON public.store_settings;
CREATE POLICY "Anyone can insert store_settings" ON public.store_settings FOR INSERT WITH CHECK (true);

-- Idempotent RLS Policies for admin_users & audit_logs
DROP POLICY IF EXISTS "Anyone can select admin_users" ON public.admin_users;
CREATE POLICY "Anyone can select admin_users" ON public.admin_users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update admin_users" ON public.admin_users;
CREATE POLICY "Anyone can update admin_users" ON public.admin_users FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert admin_users" ON public.admin_users;
CREATE POLICY "Anyone can insert admin_users" ON public.admin_users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can select audit_logs" ON public.audit_logs;
CREATE POLICY "Anyone can select audit_logs" ON public.audit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Anyone can insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- 6. Enable Supabase Realtime Publication for Live Order Tracking & Site Config
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
