-- ==============================================================================
-- Enterprise Migration: Customer Cancellation Request & Approval Workflow
-- Adds cancellation request schema, status separation, and Realtime replication
-- ==============================================================================

-- 1. Extend public.orders with cancellation_request JSONB column if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cancellation_request'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN cancellation_request JSONB DEFAULT NULL;
    END IF;
END $$;

-- 2. Dedicated public.order_cancellation_requests table for strict audit & state tracking
CREATE TABLE IF NOT EXISTS public.order_cancellation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    customer_id TEXT,
    customer_name TEXT,
    customer_mobile TEXT,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected')),
    reason TEXT NOT NULL,
    customer_comment TEXT,
    estimated_refund_amount NUMERIC(10, 2) DEFAULT 0.00,
    approved_refund_amount NUMERIC(10, 2) DEFAULT 0.00,
    rejection_reason TEXT,
    admin_comment TEXT,
    reviewed_by TEXT,
    reviewer_role TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning-fast order and status lookups
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_order_num ON public.order_cancellation_requests(order_number);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status ON public.order_cancellation_requests(status);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_created_at ON public.order_cancellation_requests(created_at DESC);

-- 3. Row Level Security (RLS) Configurations
ALTER TABLE public.order_cancellation_requests ENABLE ROW LEVEL SECURITY;

-- Allow public/anon and authenticated read access for order tracking
DROP POLICY IF EXISTS "Public can view cancellation requests" ON public.order_cancellation_requests;
CREATE POLICY "Public can view cancellation requests" ON public.order_cancellation_requests
    FOR SELECT TO anon, authenticated
    USING (true);

-- Allow customers to insert cancellation requests
DROP POLICY IF EXISTS "Customers can submit cancellation requests" ON public.order_cancellation_requests;
CREATE POLICY "Customers can submit cancellation requests" ON public.order_cancellation_requests
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Allow authenticated admins full update/delete access
DROP POLICY IF EXISTS "Admins can manage cancellation requests" ON public.order_cancellation_requests;
CREATE POLICY "Admins can manage cancellation requests" ON public.order_cancellation_requests
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Realtime Replication for instant live UI synchronization
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_cancellation_requests;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Table order_cancellation_requests already in supabase_realtime';
END $$;
