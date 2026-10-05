// La integración de Supabase del Marketplace de Vercel publica las credenciales
// con el prefijo DATABASE_. Se leen primero esas y, si no están, se usan los
// nombres sin prefijo del entorno local. Los accesos a process.env tienen que
// quedar escritos literalmente para que Next pueda reemplazarlos en el build
// del cliente.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_DATABASE_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_DATABASE_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabaseConfiguration() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
