import { ControlsDashboard } from "@/components/nomina/controls-dashboard";
import { LoginGate } from "@/components/nomina/login-gate";
import { WorkspaceLayout } from "@/components/nomina/workspace-layout";
import { currentUser, hasSupabaseConfiguration } from "@/lib/supabase/user";

export default async function HomePage() {
  if (!hasSupabaseConfiguration()) {
    return (
      <main className="bg-muted/40 flex min-h-screen items-center justify-center px-5">
        <div className="border-border bg-card max-w-md rounded-2xl border p-8 text-center">
          <h1 className="text-xl font-semibold">Falta configurar Supabase</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Definí las credenciales de Supabase en tu entorno para poder
            iniciar sesión y guardar los controles.
          </p>
        </div>
      </main>
    );
  }

  const user = await currentUser();
  if (!user) return <LoginGate />;

  return (
    <WorkspaceLayout>
      <ControlsDashboard />
    </WorkspaceLayout>
  );
}
