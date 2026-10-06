-- Schema for Swagruha Foods Project

-- 1. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT NOT NULL,
    name_te TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description_en TEXT NOT NULL,
    description_te TEXT NOT NULL,
    category TEXT NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}',
    ingredients_en TEXT NOT NULL,
    ingredients_te TEXT NOT NULL,
    price NUMERIC NOT NULL,
    compare_price NUMERIC,
    stock INTEGER NOT NULL DEFAULT 0,
    weight TEXT NOT NULL,
    sku TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID, -- If you have user authentication
    items JSONB NOT NULL, -- Array of OrderItem
    subtotal NUMERIC NOT NULL,
    delivery_charge NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_id TEXT,
    razorpay_order_id TEXT,
    order_status TEXT NOT NULL CHECK (order_status IN ('placed', 'confirmed', 'preparing', 'packed', 'shipped', 'delivered', 'cancelled')),
    delivery_address JSONB NOT NULL, -- DeliveryAddress
    customer_name TEXT NOT NULL,
    customer_mobile TEXT NOT NULL,
    customer_whatsapp TEXT NOT NULL,
    customer_email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT NOT NULL,
    image_url TEXT,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Products: Read for all, Write for admin only (for now, allow read for anon)
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);

-- Orders: Users can read their own orders via mobile/order_number, but here we can just create basic policies
-- Allow insert for anon users (since they place orders without logging in)
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
-- Allow select for anon users so they can track their order
CREATE POLICY "Anyone can select orders" ON public.orders FOR SELECT USING (true);
-- Allow update for anon users (for admin status updates via anon key)
CREATE POLICY "Anyone can update orders" ON public.orders FOR UPDATE USING (true);
-- Allow delete for anon users (for admin order deletion)
CREATE POLICY "Anyone can delete orders" ON public.orders FOR DELETE USING (true);

-- Reviews: Allow insert and select
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);
