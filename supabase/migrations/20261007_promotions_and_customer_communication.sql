-- ==============================================================================
-- Enterprise Migration: Promotions, Offers, Vouchers & Customer Communication
-- Migration File: supabase/migrations/20261007_promotions_and_customer_communication.sql
-- Description:
--   1. Creates `public.promotions` table for marketing campaigns
--   2. Creates `public.promotion_templates` table for email & SMS reusable templates
--   3. Creates `public.campaign_recipients` table for granular delivery logs & metrics
--   4. Creates `public.customer_preferences` table for promotional opt-outs
--   5. Configures RLS policies and Supabase Realtime replication
-- ==============================================================================

-- 1. Create Promotional Campaigns Table
CREATE TABLE IF NOT EXISTS public.promotions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'offer',
    title TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    voucher_code TEXT,
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    min_order_amount NUMERIC(10, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'processing', 'sent', 'failed', 'cancelled')),
    audience_type TEXT NOT NULL DEFAULT 'all',
    audience_filter JSONB DEFAULT '{}'::jsonb,
    selected_customer_keys JSONB DEFAULT '[]'::jsonb,
    channels JSONB NOT NULL DEFAULT '["email", "sms"]'::jsonb,
    email_subject TEXT,
    email_title TEXT,
    email_message TEXT,
    email_cta_text TEXT DEFAULT 'Shop Now',
    email_cta_link TEXT,
    sms_message TEXT,
    start_date DATE,
    end_date DATE,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by TEXT NOT NULL DEFAULT 'Root Admin',
    total_recipients INTEGER DEFAULT 0,
    email_queued INTEGER DEFAULT 0,
    email_sent INTEGER DEFAULT 0,
    email_failed INTEGER DEFAULT 0,
    sms_queued INTEGER DEFAULT 0,
    sms_sent INTEGER DEFAULT 0,
    sms_failed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_status ON public.promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_type ON public.promotions(type);
CREATE INDEX IF NOT EXISTS idx_promotions_scheduled_at ON public.promotions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_promotions_created_at ON public.promotions(created_at DESC);

-- 2. Create Promotion Templates Table
CREATE TABLE IF NOT EXISTS public.promotion_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'offer',
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'both')),
    email_subject TEXT,
    email_message TEXT,
    sms_message TEXT,
    default_cta_text TEXT DEFAULT 'Shop Now',
    default_cta_link TEXT,
    created_by TEXT DEFAULT 'System',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default initial marketing templates
INSERT INTO public.promotion_templates (id, name, category, channel, email_subject, email_message, sms_message, default_cta_text)
VALUES
(
    'tmpl_diwali_mega',
    'Festival Mega Sale (Email + SMS)',
    'festival_sale',
    'both',
    '🎉 Festival Mega Offer! Get 25% OFF on Traditional Sweets & Delicacies',
    'Celebrate this festive season with freshly prepared Andhra sweets, hot savories, and traditional pickles crafted with authentic homestyle love.\n\nUse your exclusive promo voucher at checkout for an instant discount on your order!',
    'Namaskaram {{customerName}}! Celebrate with {{businessName}} sweets & savories. Get 25% OFF using code {{voucherCode}}. Order now: {{shopUrl}}',
    'Claim Festive Discount'
),
(
    'tmpl_flash_sale',
    'Weekend Flash Sale (SMS & Email)',
    'flash_sale',
    'both',
    '⚡ 48-Hour Weekend Flash Sale — Limited Stock Delicacies!',
    'Our kitchen has just rolled out limited-edition batches of premium Bellam Pootharekulu, Bandar Laddu, and spicy Gongura pickles. Enjoy lightning-fast delivery and extra savings this weekend only.',
    '⚡ 48-Hour Flash Sale at {{businessName}}! Enjoy special savings on authentic sweets. Use code {{voucherCode}}. Limited stock: {{shopUrl}}',
    'Shop Flash Sale'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Campaign Recipient Delivery Logs Table
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
    campaign_name TEXT NOT NULL,
    customer_key TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
    recipient TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'skipped')),
    provider TEXT,
    provider_message_id TEXT,
    failure_reason TEXT,
    attempt_count INTEGER DEFAULT 1,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_customer ON public.campaign_recipients(customer_key);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.campaign_recipients(status);

-- 4. Customer Communication Preferences Table (Opt-in / Opt-out)
CREATE TABLE IF NOT EXISTS public.customer_preferences (
    customer_key TEXT PRIMARY KEY,
    customer_name TEXT,
    email TEXT,
    phone TEXT,
    opt_out_promotional_email BOOLEAN DEFAULT FALSE,
    opt_out_promotional_sms BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_prefs_email ON public.customer_preferences(email);
CREATE INDEX IF NOT EXISTS idx_customer_prefs_phone ON public.customer_preferences(phone);

-- 5. Row Level Security Policies
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;

-- Admins full access
DROP POLICY IF EXISTS "Admins can manage promotions" ON public.promotions;
CREATE POLICY "Admins can manage promotions" ON public.promotions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage promotion templates" ON public.promotion_templates;
CREATE POLICY "Admins can manage promotion templates" ON public.promotion_templates
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage campaign recipients" ON public.campaign_recipients;
CREATE POLICY "Admins can manage campaign recipients" ON public.campaign_recipients
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view customer preferences" ON public.customer_preferences;
CREATE POLICY "Admins can view customer preferences" ON public.customer_preferences
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Supabase Realtime Replication
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Table promotions already in supabase_realtime';
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_recipients;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Table campaign_recipients already in supabase_realtime';
END $$;
