import { ControlStoreProvider } from "@/components/nomina/control-store";
import { WorkspaceShell } from "@/components/nomina/workspace-shell";

// Envoltorio del espacio de trabajo de controles: el store vive acá y no en el
// layout raíz para no afectar a la app de análisis de `/` ni a `/registro`.
export function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ControlStoreProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </ControlStoreProvider>
  );
}
