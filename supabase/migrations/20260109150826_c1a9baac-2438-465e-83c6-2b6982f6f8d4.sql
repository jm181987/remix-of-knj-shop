-- Update all RLS policies to use is_admin_or_superadmin instead of has_role(..., 'admin')
-- This ensures superadmins have ALL admin permissions plus more

-- customer_addresses
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.customer_addresses;
CREATE POLICY "Admins and superadmins can view all addresses" 
ON public.customer_addresses FOR SELECT 
USING (public.is_admin_or_superadmin(auth.uid()));

-- customer_profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.customer_profiles;
CREATE POLICY "Admins and superadmins can view all profiles" 
ON public.customer_profiles FOR SELECT 
USING (public.is_admin_or_superadmin(auth.uid()));

-- customers
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can view customers" ON public.customers;

CREATE POLICY "Admins and superadmins can view customers" 
ON public.customers FOR SELECT 
USING (public.is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins and superadmins can insert customers" 
ON public.customers FOR INSERT 
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins and superadmins can update customers" 
ON public.customers FOR UPDATE 
USING (public.is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins and superadmins can delete customers" 
ON public.customers FOR DELETE 
USING (public.is_admin_or_superadmin(auth.uid()));

-- deliveries
DROP POLICY IF EXISTS "Admins can manage deliveries" ON public.deliveries;
CREATE POLICY "Admins and superadmins can manage deliveries" 
ON public.deliveries FOR ALL 
USING (public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- drivers
DROP POLICY IF EXISTS "Admins can manage drivers" ON public.drivers;
CREATE POLICY "Admins and superadmins can manage drivers" 
ON public.drivers FOR ALL 
USING (public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- order_items
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins and superadmins can manage order items" 
ON public.order_items FOR ALL 
USING (public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- orders
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins and superadmins can manage orders" 
ON public.orders FOR ALL 
USING (public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- product_variants
DROP POLICY IF EXISTS "Admins can manage variants" ON public.product_variants;
CREATE POLICY "Admins and superadmins can manage variants" 
ON public.product_variants FOR ALL 
USING (public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- products
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins and superadmins can manage products" 
ON public.products FOR ALL 
USING (public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- shipping_tiers_uruguay
DROP POLICY IF EXISTS "Admins can manage shipping tiers" ON public.shipping_tiers_uruguay;
CREATE POLICY "Admins and superadmins can manage shipping tiers" 
ON public.shipping_tiers_uruguay FOR ALL 
USING (public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));