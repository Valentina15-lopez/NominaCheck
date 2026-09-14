"use client";

import { PageShell } from "@/components/nomina/ui";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell
      eyebrow="Error"
      title="Algo salió mal"
      description="Ocurrió un error inesperado. Podés intentar de nuevo."
    >
      <button
        onClick={reset}
        className="bg-primary text-primary-foreground mt-8 h-10 rounded-xl px-4 text-sm font-semibold"
      >
        Reintentar
      </button>
    </PageShell>
  );
}
