import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManageUserRequest {
  action: "create" | "update" | "delete" | "update-credentials" | "get-emails";
  userId?: string;
  userIds?: string[];
  email?: string;
  password?: string;
  role?: "admin" | "driver";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Solo los administradores pueden gestionar usuarios" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, userId, userIds, email, password, role }: ManageUserRequest = await req.json();

    // GET EMAILS - returns email for given user IDs
    if (action === "get-emails") {
      if (!userIds || userIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "userIds es requerido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emails: Record<string, string> = {};
      
      for (const uid of userIds) {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (authUser?.user?.email) {
            emails[uid] = authUser.user.email;
          }
        } catch (e) {
          console.error(`Error getting email for user ${uid}:`, e);
        }
      }

      return new Response(
        JSON.stringify({ emails }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CREATE USER
    if (action === "create") {
      if (!email || !password || !role) {
        return new Response(
          JSON.stringify({ error: "Email, contraseña y rol son requeridos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Creating user with email:", email, "and role:", role);

      // Create auth user
      const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createUserError) {
        console.error("Error creating auth user:", createUserError);
        if (createUserError.message.includes("already")) {
          return new Response(
            JSON.stringify({ error: "Este correo ya está registrado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw createUserError;
      }

      if (!authData.user) {
        throw new Error("No se pudo crear el usuario");
      }

      // Add user role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: role,
        });

      if (roleError) {
        console.error("Error adding role:", roleError);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw roleError;
      }

      // If role is driver, also create driver profile
      if (role === "driver") {
        const { error: driverError } = await supabaseAdmin
          .from("drivers")
          .insert({
            user_id: authData.user.id,
            full_name: email.split("@")[0],
            email: email,
          });

        if (driverError) {
          console.error("Error creating driver profile:", driverError);
          await supabaseAdmin.from("user_roles").delete().eq("user_id", authData.user.id);
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          throw driverError;
        }
      }

      return new Response(
        JSON.stringify({ success: true, userId: authData.user.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UPDATE USER ROLE
    if (action === "update") {
      if (!userId || !role) {
        return new Response(
          JSON.stringify({ error: "userId y rol son requeridos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent self-demotion
      if (userId === requestingUser.id) {
        return new Response(
          JSON.stringify({ error: "No puedes cambiar tu propio rol" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete existing roles and add new one
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: role });

      if (roleError) {
        throw roleError;
      }

      // Handle driver profile based on role change
      if (role === "driver") {
        const { data: existingDriver } = await supabaseAdmin
          .from("drivers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingDriver) {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
          await supabaseAdmin.from("drivers").insert({
            user_id: userId,
            full_name: authUser?.user?.email?.split("@")[0] || "Usuario",
            email: authUser?.user?.email,
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UPDATE CREDENTIALS
    if (action === "update-credentials") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId es requerido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: { email?: string; password?: string } = {};
      if (email) updateData.email = email;
      if (password) {
        if (password.length < 6) {
          return new Response(
            JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        updateData.password = password;
      }

      if (Object.keys(updateData).length === 0) {
        return new Response(
          JSON.stringify({ error: "Se requiere email o contraseña para actualizar" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);

      if (updateError) {
        console.error("Error updating user credentials:", updateError);
        if (updateError.message.includes("already")) {
          return new Response(
            JSON.stringify({ error: "Este correo ya está en uso" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw updateError;
      }

      // Update email in drivers table if user is a driver
      if (email) {
        await supabaseAdmin
          .from("drivers")
          .update({ email })
          .eq("user_id", userId);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE USER
    if (action === "delete") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId es requerido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent self-deletion
      if (userId === requestingUser.id) {
        return new Response(
          JSON.stringify({ error: "No puedes eliminar tu propia cuenta" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete driver profile if exists
      await supabaseAdmin.from("drivers").delete().eq("user_id", userId);
      
      // Delete roles
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      
      // Delete auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) {
        throw deleteError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Acción no válida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in manage-user function:", error);
    const errorMessage = error instanceof Error ? error.message : "Error al gestionar usuario";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
