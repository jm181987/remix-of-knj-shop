-- Drop all existing policies on user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage non-superadmin roles" ON public.user_roles;

-- Update is_superadmin function to be SECURITY DEFINER (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'superadmin'
  )
$$;

-- Create a function to check if user is admin or superadmin
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'superadmin')
  )
$$;

-- Create simple policies using SECURITY DEFINER functions
-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins/Superadmins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin_or_superadmin(auth.uid()));

-- Superadmins can do everything
CREATE POLICY "Superadmins full access"
ON public.user_roles
FOR ALL
USING (public.is_superadmin(auth.uid()))
WITH CHECK (public.is_superadmin(auth.uid()));

-- Admins can manage non-superadmin roles only
CREATE POLICY "Admins manage non-superadmin"
ON public.user_roles
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin')
  AND NOT public.is_superadmin(user_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND NOT public.is_superadmin(user_id)
);