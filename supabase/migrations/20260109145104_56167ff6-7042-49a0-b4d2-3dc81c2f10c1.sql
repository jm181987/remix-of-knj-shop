-- Create function to check if user is superadmin
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

-- Assign superadmin role to the first user (jorgitom18@gmail.com)
INSERT INTO public.user_roles (user_id, role)
VALUES ('a971cdb1-2e30-4514-80bb-217527543a54', 'superadmin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Drop existing policies on user_roles that allow deletion
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Create new policies that protect superadmin
CREATE POLICY "Superadmins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.is_superadmin(auth.uid()))
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Admins can manage non-superadmin roles"
ON public.user_roles
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = user_roles.user_id 
    AND ur.role = 'superadmin'
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = user_roles.user_id 
    AND ur.role = 'superadmin'
  )
);

-- Recreate policy for users to view their own roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);