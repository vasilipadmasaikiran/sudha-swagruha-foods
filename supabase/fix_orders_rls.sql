-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- to add the missing UPDATE and DELETE policies for orders

-- Allow admin to update order statuses
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
CREATE POLICY "Anyone can update orders" ON public.orders
  FOR UPDATE USING (true) WITH CHECK (true);

-- Allow admin to delete orders  
DROP POLICY IF EXISTS "Anyone can delete orders" ON public.orders;
CREATE POLICY "Anyone can delete orders" ON public.orders
  FOR DELETE USING (true);
