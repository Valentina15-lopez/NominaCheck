"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 py-24">
      <h1 className="text-3xl font-semibold">Algo salió mal</h1>
      <p className="text-foreground/70">
        Ocurrió un error inesperado. Podés intentar de nuevo.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
