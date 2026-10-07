-- ==============================================================================
-- Migration: Add 'partially_paid' and 'unpaid' to Orders Payment Status Constraint
-- Description: Ensures public.orders accepts all modern payment lifecycle statuses:
--              'pending', 'paid', 'failed', 'refunded', 'partially_refunded',
--              'partially_paid', 'unpaid'
-- ==============================================================================

DO $$
BEGIN
    -- Drop existing check constraint if present
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

    -- Re-add check constraint supporting all statuses
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check 
        CHECK (payment_status IN (
            'pending',
            'paid',
            'failed',
            'refunded',
            'partially_refunded',
            'partially_paid',
            'unpaid'
        ));

    RAISE NOTICE 'orders_payment_status_check constraint updated successfully.';
END $$;
