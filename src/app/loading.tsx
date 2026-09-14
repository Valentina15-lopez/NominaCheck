import { LoadingState, PageShell } from "@/components/nomina/ui";

export default function Loading() {
  return (
    <PageShell
      eyebrow="NóminaCheck"
      title="Cargando"
      description="Estamos preparando la información del control."
    >
      <LoadingState />
    </PageShell>
  );
}
