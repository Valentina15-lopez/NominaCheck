import "server-only";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export { hasSupabaseConfiguration };

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export async function currentUser(): Promise<SessionUser | null> {
  if (!hasSupabaseConfiguration()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const fullName = user.user_metadata.full_name;
  return {
    id: user.id,
    name:
      typeof fullName === "string" && fullName.trim()
        ? fullName
        : (user.email ?? "Usuario"),
    email: user.email ?? "",
  };
}
