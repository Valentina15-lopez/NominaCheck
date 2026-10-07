import { redirect } from "next/navigation";
import { ControlStoreProvider } from "@/components/nomina/control-store";
import { WorkspaceShell } from "@/components/nomina/workspace-shell";
import { listControls } from "@/lib/db/controls";
import { currentUser } from "@/lib/supabase/user";

// Envoltorio del espacio de trabajo de controles: el store vive acá y no en el
// layout raíz para no afectar a `/registro`. También es el único punto donde se
// exige sesión y donde se hace la primera lectura de la base, así las pantallas
// ya reciben los controles renderizados.
export async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();
  if (!user) redirect("/");

  const controls = await listControls();

  return (
    <ControlStoreProvider initialControls={controls}>
      <WorkspaceShell userName={user.name} userEmail={user.email}>
        {children}
      </WorkspaceShell>
    </ControlStoreProvider>
  );
}
