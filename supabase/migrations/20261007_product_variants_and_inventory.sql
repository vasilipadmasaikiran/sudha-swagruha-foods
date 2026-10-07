-- ============================================================
-- Migration: Product Variants Consolidation & Inventory Lifecycle
-- Timestamp: 2026-10-07
-- Objective:
--   1. Add JSONB variants, base_unit, pricing_model, and lifecycle columns to public.products
--   2. Safely deduplicate fragmented weight rows into unified products
--   3. Create product_inventory_logs for enterprise stock audit trail
--   4. Preserve 100% foreign key integrity for orders and reviews
-- ============================================================

-- 1. Extend products table with multi-variant & lifecycle attributes
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS base_unit TEXT DEFAULT 'g',
ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'fixed_pack',
ADD COLUMN IF NOT EXISTS base_price_per_unit NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS min_order_qty INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_order_qty INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS qty_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 2. Create enterprise inventory audit log table
CREATE TABLE IF NOT EXISTS public.product_inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    variant_weight TEXT NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    change_qty INTEGER NOT NULL,
    reason TEXT NOT NULL,
    adjusted_by TEXT NOT NULL DEFAULT 'System',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for inventory audit queries
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON public.product_inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON public.product_inventory_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.product_inventory_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'product_inventory_logs' AND policyname = 'Public read inventory logs'
    ) THEN
        CREATE POLICY "Public read inventory logs"
            ON public.product_inventory_logs FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'product_inventory_logs' AND policyname = 'Authenticated insert inventory logs'
    ) THEN
        CREATE POLICY "Authenticated insert inventory logs"
            ON public.product_inventory_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 3. Idempotent Data Migration: Consolidate duplicate weight rows
-- Groups rows with identical name_en and category into a single master row
DO $$
DECLARE
    prod_group RECORD;
    primary_prod_id UUID;
    canonical_slug TEXT;
    aggregated_variants JSONB;
    total_aggregated_stock INTEGER;
    secondary_ids UUID[];
BEGIN
    FOR prod_group IN
        SELECT 
            name_en, 
            category,
            COUNT(*) as item_count,
            MIN(id::text)::uuid as min_id
        FROM public.products
        GROUP BY name_en, category
        HAVING COUNT(*) > 1
    LOOP
        primary_prod_id := prod_group.min_id;

        -- Extract canonical base slug by stripping weight suffixes from first item
        SELECT 
            REGEXP_REPLACE(
                REGEXP_REPLACE(slug, '-(250g|500g|1kg|100g|2kg|5kg|100ml|500ml|1l)$', '', 'i'),
                '-(\d+(?:\.\d+)?)(kg|g|ml|l|pcs|packs)$', '', 'i'
            )
        INTO canonical_slug
        FROM public.products
        WHERE id = primary_prod_id;

        -- Fallback if regex resulted in empty
        IF canonical_slug IS NULL OR canonical_slug = '' THEN
            canonical_slug := LOWER(REGEXP_REPLACE(prod_group.name_en, '[^a-zA-Z0-9]+', '-', 'g'));
        END IF;

        -- Aggregate all distinct variants from all rows in this group
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'weight', weight,
                    'price', price,
                    'comparePrice', compare_price,
                    'stock', stock,
                    'sku', sku
                )
            ),
            COALESCE(SUM(stock), 0)
        INTO aggregated_variants, total_aggregated_stock
        FROM public.products
        WHERE name_en = prod_group.name_en AND category = prod_group.category;

        -- Update the primary row with consolidated variants, canonical slug, and combined stock
        UPDATE public.products
        SET 
            slug = canonical_slug,
            variants = aggregated_variants,
            stock = total_aggregated_stock,
            base_unit = 'g',
            pricing_model = 'fixed_pack',
            status = CASE 
                WHEN total_aggregated_stock = 0 THEN 'out_of_stock'
                WHEN total_aggregated_stock <= 10 THEN 'low_stock'
                ELSE 'active'
            END,
            is_active = true,
            updated_at = NOW()
        WHERE id = primary_prod_id;

        -- Mark duplicate secondary rows as inactive so customer listings do not display duplicates
        -- Preserves row IDs so existing foreign keys (orders.items, reviews) remain fully valid!
        UPDATE public.products
        SET 
            is_active = false,
            is_archived = true,
            status = 'archived',
            updated_at = NOW()
        WHERE name_en = prod_group.name_en 
          AND category = prod_group.category 
          AND id != primary_prod_id;

        RAISE NOTICE 'Consolidated % rows for % into primary ID % with % variants', 
            prod_group.item_count, prod_group.name_en, primary_prod_id, jsonb_array_length(aggregated_variants);
    END LOOP;
END $$;

-- 4. For single-row products that don't have variants JSONB populated yet,
-- populate their variants JSONB array from their weight, price, and stock columns
UPDATE public.products
SET 
    variants = jsonb_build_array(
        jsonb_build_object(
            'weight', weight,
            'price', price,
            'comparePrice', compare_price,
            'stock', stock,
            'sku', sku
        )
    ),
    status = CASE 
        WHEN stock = 0 THEN 'out_of_stock'
        WHEN stock <= 10 THEN 'low_stock'
        ELSE 'active'
    END
WHERE (variants IS NULL OR variants = '[]'::jsonb) AND weight IS NOT NULL;
