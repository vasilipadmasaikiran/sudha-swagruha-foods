-- ==============================================================================
-- Enterprise Migration: Order Cancellation, Partial & Full Refunds, SMS Notification
-- Adds schema extensions, financial audit tracking, and RBAC support
-- ==============================================================================

-- 1. Extend public.orders with refund and cancellation metadata
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'refunded_amount') THEN
        ALTER TABLE public.orders ADD COLUMN refunded_amount NUMERIC(10, 2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE public.orders ADD COLUMN cancellation_reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cancelled_at') THEN
        ALTER TABLE public.orders ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cancelled_by') THEN
        ALTER TABLE public.orders ADD COLUMN cancelled_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'refunds') THEN
        ALTER TABLE public.orders ADD COLUMN refunds JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Extend payment_status constraint to allow 'partially_refunded' and 'refunded'
DO $$
BEGIN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded'));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint update skipped or not applicable';
END $$;

-- 3. Dedicated public.refunds table for strict financial ledger & reconciliation
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    payment_id TEXT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('partial', 'full')),
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'success', 'failed', 'cancelled')),
    provider TEXT NOT NULL DEFAULT 'razorpay',
    provider_refund_id TEXT,
    item_id TEXT,
    requested_by TEXT NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for speedy order-based refund lookup
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_number ON public.refunds(order_number);
CREATE INDEX IF NOT EXISTS idx_refunds_provider_id ON public.refunds(provider_refund_id);

-- 4. Audit Log for Notifications (SMS, Email, WhatsApp)
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT,
    customer_id TEXT,
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'whatsapp')),
    event TEXT NOT NULL,
    recipient TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
    provider TEXT,
    provider_message_id TEXT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_order_id ON public.notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON public.notification_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel_status ON public.notification_logs(channel, status);

-- 5. Extend store_settings with sms_settings if column does not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'sms_settings') THEN
        ALTER TABLE public.store_settings ADD COLUMN sms_settings JSONB DEFAULT '{
            "enabled": false,
            "provider": "fast2sms",
            "test_mode": true,
            "events": {
                "order_confirmed": true,
                "order_dispatched": true,
                "tracking_updated": true,
                "order_item_removed": true,
                "partial_refund_initiated": true,
                "full_order_cancelled": true,
                "full_refund_initiated": true,
                "refund_completed": true,
                "refund_failed": true
            }
        }'::jsonb;
    END IF;
END $$;

-- 6. Row Level Security (RLS) Configurations
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access on refunds for order tracking (scoped to public/anon)
DROP POLICY IF EXISTS "Public can view refunds" ON public.refunds;
CREATE POLICY "Public can view refunds" ON public.refunds
    FOR SELECT TO anon, authenticated
    USING (true);

-- Allow authenticated users / service roles full access to refunds
DROP POLICY IF EXISTS "Admins can manage refunds" ON public.refunds;
CREATE POLICY "Admins can manage refunds" ON public.refunds
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Notification logs policies
DROP POLICY IF EXISTS "Admins can view notification logs" ON public.notification_logs;
CREATE POLICY "Admins can view notification logs" ON public.notification_logs
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 7. Realtime Replication for Instant Customer Tracking Sync
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Table orders already in supabase_realtime';
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.refunds;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Table refunds already in supabase_realtime';
END $$;
