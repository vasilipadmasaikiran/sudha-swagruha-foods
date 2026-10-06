-- ============================================================
-- Supabase Schema for Coupons & Store Settings (Realtime Cloud Sync)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/yhakphwljyjpfnsmkjnz/sql
-- ============================================================

-- 1. Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_percent NUMERIC NOT NULL,
    description TEXT NOT NULL,
    min_order NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Store Settings & Announcement Table (Key-Value JSONB)
CREATE TABLE IF NOT EXISTS public.store_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Policies for public.coupons
DROP POLICY IF EXISTS "Anyone can select coupons" ON public.coupons;
CREATE POLICY "Anyone can select coupons" ON public.coupons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert coupons" ON public.coupons;
CREATE POLICY "Anyone can insert coupons" ON public.coupons FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update coupons" ON public.coupons;
CREATE POLICY "Anyone can update coupons" ON public.coupons FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete coupons" ON public.coupons;
CREATE POLICY "Anyone can delete coupons" ON public.coupons FOR DELETE USING (true);

-- Policies for public.store_settings
DROP POLICY IF EXISTS "Anyone can select store_settings" ON public.store_settings;
CREATE POLICY "Anyone can select store_settings" ON public.store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert store_settings" ON public.store_settings;
CREATE POLICY "Anyone can insert store_settings" ON public.store_settings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update store_settings" ON public.store_settings;
CREATE POLICY "Anyone can update store_settings" ON public.store_settings FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete store_settings" ON public.store_settings;
CREATE POLICY "Anyone can delete store_settings" ON public.store_settings FOR DELETE USING (true);

-- Enable Supabase Realtime for instant live updates across all customer devices
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Seed Default Announcement
INSERT INTO public.store_settings (key, value)
VALUES (
    'announcement',
    '{
        "id": "ann-1",
        "enabled": true,
        "tag": "FESTIVE SPECIAL",
        "headline": "Flat 15% OFF on Authentic Andhra Pickles & Podis! Free delivery above ₹499",
        "headline_te": "అన్ని ఆంధ్ర ఊరగాయలు & పొడులపై 15% ప్రత్యేక తగ్గింపు!",
        "couponCode": "SWAGRUHA15",
        "discountPercent": 15,
        "minOrderValue": 499,
        "linkUrl": "/products",
        "linkText": "Order Now",
        "theme": "crimson",
        "showCountdown": false
    }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Seed Default Contact Settings
INSERT INTO public.store_settings (key, value)
VALUES (
    'store_contact',
    '{
        "businessPhone": "8374634989",
        "businessWhatsApp": "8374634989",
        "businessEmail": "info@sudhaswagruha.com",
        "businessAddress": "Plot 18, Traditional Foods Lane, Benz Circle, Vijayawada, Andhra Pradesh - 520010",
        "businessHours": "9:00 AM - 9:00 PM (All Days)",
        "paymentGatewayEnabled": false,
        "razorpayKeyId": "",
        "razorpayKeySecret": "",
        "isTestMode": true
    }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Seed Default Coupons
INSERT INTO public.coupons (code, discount_percent, description, min_order, is_active, usage_count)
VALUES
    ('AMMA10', 10, '10% OFF on all homemade delicacies', 0, true, 28),
    ('SWAGRUHA15', 15, 'Special 15% OFF festive announcement offer', 499, true, 64),
    ('UGADI20', 20, 'Grand festive discount for orders above ₹999', 999, true, 19)
ON CONFLICT (code) DO NOTHING;
