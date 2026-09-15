import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "npm:@supabase/supabase-js@2.116.0";

const BUSINESS_KEY = "aspire-mobile-detailing";
const allowedOrigins = "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigins,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EditableRole = "admin" | "employee";

type RequestBody = {
  action?: "create" | "update";
  email?: string;
  display_name?: string;
  password?: string;
  role?: EditableRole;
  is_active?: boolean;
  user_id?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

function cleanName(value: unknown) {
  const name = String(value ?? "").trim();
  return name.length >= 1 && name.length <= 120 ? name : null;
}

function cleanRole(value: unknown): EditableRole | null {
  return value === "admin" || value === "employee" ? value : null;
}

async function findUserByEmail(adminClient: ReturnType<typeof createClient>, email: string): Promise<User | null> {
  for (let page = 1; page <= 20; page += 1) {
    const result = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
    if (result.error) throw result.error;
    const user = result.data.users.find((item) => item.email?.toLowerCase() === email);
    if (user) return user;
    if (result.data.users.length < 200) return null;
  }
  throw new Error("The account directory is too large to search safely.");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
      return json({ error: "Employee management is not configured." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const userResult = await userClient.auth.getUser();
    if (userResult.error || !userResult.data.user) return json({ error: "Sign in again to continue." }, 401);

    const managerResult = await userClient
      .from("aspire_employee_access")
      .select("role,is_active")
      .eq("business_key", BUSINESS_KEY)
      .eq("user_id", userResult.data.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (managerResult.error) throw managerResult.error;
    if (!managerResult.data || !["owner", "admin", "support"].includes(managerResult.data.role)) {
      return json({ error: "You do not have permission to manage employees." }, 403);
    }

    const body = await request.json() as RequestBody;
    const displayName = cleanName(body.display_name);
    const role = cleanRole(body.role);
    if (!displayName || !role) return json({ error: "Enter a valid name and choose Employee or Admin." }, 400);

    if (body.action === "create") {
      const email = cleanEmail(body.email);
      if (!email) return json({ error: "Enter a valid employee email address." }, 400);
      const password = String(body.password ?? "");
      if (password.length < 8 || password.length > 72) {
        return json({ error: "The temporary password must be between 8 and 72 characters." }, 400);
      }

      const existingUser = await findUserByEmail(adminClient, email);
      if (existingUser) {
        return json({ error: "An account with that email already exists. Use a different email address." }, 409);
      }

      const createResult = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });
      if (createResult.error) throw createResult.error;
      const employeeUser = createResult.data.user;
      if (!employeeUser) throw new Error("Supabase did not return the created user.");

      const accessResult = await adminClient
        .from("aspire_employee_access")
        .upsert({
          business_key: BUSINESS_KEY,
          user_id: employeeUser.id,
          email,
          display_name: displayName,
          role,
          is_active: true,
          is_hidden: false,
        }, { onConflict: "business_key,user_id" })
        .select("business_key,user_id,email,display_name,role,is_active,is_hidden")
        .single();

      if (accessResult.error) {
        await adminClient.auth.admin.deleteUser(employeeUser.id);
        throw accessResult.error;
      }
      return json({ employee: accessResult.data, created: true }, 201);
    }

    if (body.action === "update") {
      const userId = String(body.user_id ?? "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
        return json({ error: "Choose a valid employee." }, 400);
      }

      const targetResult = await adminClient
        .from("aspire_employee_access")
        .select("user_id,role,is_hidden")
        .eq("business_key", BUSINESS_KEY)
        .eq("user_id", userId)
        .maybeSingle();

      if (targetResult.error) throw targetResult.error;
      if (!targetResult.data || targetResult.data.is_hidden || targetResult.data.role === "owner" || targetResult.data.role === "support") {
        return json({ error: "That protected account cannot be changed from this dashboard." }, 403);
      }
      if (userId === userResult.data.user.id && body.is_active === false) {
        return json({ error: "You cannot deactivate your own account." }, 400);
      }

      const updateResult = await adminClient
        .from("aspire_employee_access")
        .update({
          display_name: displayName,
          role,
          is_active: body.is_active !== false,
          is_hidden: false,
        })
        .eq("business_key", BUSINESS_KEY)
        .eq("user_id", userId)
        .select("business_key,user_id,email,display_name,role,is_active,is_hidden")
        .single();

      if (updateResult.error) throw updateResult.error;
      return json({ employee: updateResult.data });
    }

    return json({ error: "Unsupported employee action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Employee management failed.";
    return json({ error: message }, 500);
  }
});
