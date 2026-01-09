-- Drop existing management policies
DROP POLICY IF EXISTS "Admins can manage settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admins can view settings" ON public.store_settings;

-- Create new policy that allows both admins AND superadmins to manage settings
CREATE POLICY "Admins and superadmins can manage settings" 
ON public.store_settings 
FOR ALL 
USING (public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));