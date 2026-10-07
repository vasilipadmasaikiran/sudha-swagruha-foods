-- ==============================================================================
-- Migration: Authoritative Order Financial Snapshot, GST Rate, Discounts, and Payment History
-- Description: Supports traceable GST calculation snapshots, item/coupon discounts,
--              payment status tracking (amount_paid, amount_due), payment history,
--              and safe backfill for existing historical orders.
-- Date: 2026-10-07
-- ==============================================================================

-- 1. Ensure public.orders has all authoritative financial and tracking fields
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS coupon_code TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS item_discount NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS order_discount NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS amount_due NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS refunds JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tracking_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS courier_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tracking_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Performance indexes for financial dashboards, filtering, and reporting
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- 3. Safe Backfill for historical orders (Requirement 38)
-- Preserves existing totals, calculates taxable amount from subtotal - discount,
-- and safely initializes amount_paid and amount_due without inventing fake data.
UPDATE public.orders
SET 
  amount_paid = CASE 
    WHEN amount_paid IS NOT NULL THEN amount_paid
    WHEN payment_status IN ('paid', 'refunded', 'partially_refunded') THEN total
    ELSE 0.00
  END,
  amount_due = CASE 
    WHEN amount_due IS NOT NULL THEN amount_due
    WHEN payment_status IN ('paid', 'refunded', 'partially_refunded') THEN 0.00
    ELSE total
  END,
  taxable_amount = CASE 
    WHEN taxable_amount IS NOT NULL THEN taxable_amount
    ELSE GREATEST(0.00, subtotal - COALESCE(discount, 0.00))
  END,
  gst_amount = COALESCE(gst_amount, 0.00),
  gst_rate = COALESCE(gst_rate, 0.00),
  payments = CASE 
    WHEN payments IS NOT NULL AND jsonb_array_length(payments) > 0 THEN payments
    WHEN payment_id IS NOT NULL AND payment_status = 'paid' THEN
      jsonb_build_array(
        jsonb_build_object(
          'id', payment_id,
          'order_number', order_number,
          'transaction_id', payment_id,
          'amount', total,
          'status', 'success',
          'provider', 'razorpay',
          'payment_method', 'online',
          'paid_at', created_at,
          'notes', 'Initial order payment'
        )
      )
    ELSE '[]'::jsonb
  END
WHERE amount_paid IS NULL OR amount_due IS NULL OR taxable_amount IS NULL;
