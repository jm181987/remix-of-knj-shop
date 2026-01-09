import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateDriverRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
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
        JSON.stringify({ error: "Solo los administradores pueden crear entregadores" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, fullName, phone }: CreateDriverRequest = await req.json();

    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: "Email, contraseña y nombre son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating driver with email:", email);

    // 1. Create auth user using admin API
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

    console.log("Auth user created:", authData.user.id);

    // 2. Add driver role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: "driver",
      });

    if (roleError) {
      console.error("Error adding role:", roleError);
      // Cleanup: delete the auth user if role creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw roleError;
    }

    console.log("Driver role added");

    // 3. Create driver profile
    const { error: driverError } = await supabaseAdmin
      .from("drivers")
      .insert({
        user_id: authData.user.id,
        full_name: fullName,
        phone: phone || null,
        email: email,
      });

    if (driverError) {
      console.error("Error creating driver profile:", driverError);
      // Cleanup: delete role and auth user if driver creation fails
      await supabaseAdmin.from("user_roles").delete().eq("user_id", authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw driverError;
    }

    console.log("Driver profile created successfully");

    return new Response(
      JSON.stringify({ success: true, userId: authData.user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in create-driver function:", error);
    const errorMessage = error instanceof Error ? error.message : "Error al crear entregador";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
