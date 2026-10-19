// La integración de Supabase del Marketplace de Vercel publica las
// credenciales con el prefijo DATABASE_. Se leen en runtime (process.env[name])
// para que Next no las reemplace por undefined en el build: en Vercel esas
// variables están marcadas como Secret y no se inlinan.

function envValue(name: string) {
  const value = process.env[name];
  return value?.trim() ? value : undefined;
}

export function getSupabaseUrl() {
  return (
    envValue("NEXT_PUBLIC_DATABASE_SUPABASE_URL") ||
    envValue("NEXT_PUBLIC_SUPABASE_URL") ||
    envValue("DATABASE_SUPABASE_URL")
  );
}

export function getSupabaseAnonKey() {
  return (
    envValue("NEXT_PUBLIC_DATABASE_SUPABASE_ANON_KEY") ||
    envValue("NEXT_PUBLIC_DATABASE_SUPABASE_PUBLISHABLE_KEY") ||
    envValue("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    envValue("DATABASE_SUPABASE_ANON_KEY") ||
    envValue("DATABASE_SUPABASE_PUBLISHABLE_KEY")
  );
}

export function hasSupabaseConfiguration() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
