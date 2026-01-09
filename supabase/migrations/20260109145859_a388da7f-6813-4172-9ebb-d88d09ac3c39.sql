-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Superadmins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage non-superadmin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create simple, non-recursive policies
-- Users can view their own roles (no function call needed)
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins and superadmins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'superadmin')
  )
);

-- Admins can insert/update/delete non-superadmin roles (using direct check, not function)
CREATE POLICY "Admins can manage non-superadmin roles"
ON public.user_roles
FOR ALL
USING (
  -- Requester is admin or superadmin
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'superadmin')
  )
  AND
  -- Target is not superadmin OR requester is superadmin
  (
    NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2 
      WHERE ur2.user_id = user_roles.user_id 
      AND ur2.role = 'superadmin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur3 
      WHERE ur3.user_id = auth.uid() 
      AND ur3.role = 'superadmin'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'superadmin')
  )
);