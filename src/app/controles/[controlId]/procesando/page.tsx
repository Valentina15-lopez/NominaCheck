"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, LoaderCircle, RefreshCw } from "lucide-react";
import { useControlStore } from "@/components/nomina/control-store";
import { formatPeriod, PageShell } from "@/components/nomina/ui";
import { processingSteps } from "@/constants/nomina";

export default function ProcessingPage() {
  const { controlId } = useParams<{ controlId: string }>();
  const router = useRouter();
  const { controls, refresh } = useControlStore();
  const control = controls.find((item) => item.id === controlId);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // El análisis se dispara una vez por intento, incluso si el efecto se
  // vuelve a ejecutar al releer los controles.
  const launchedAttempt = useRef(-1);

  const exists = Boolean(control);
  const status = control?.status;

  useEffect(() => {
    if (!exists) return;
    if (status === "completed") {
      router.replace(`/controles/${controlId}`);
      return;
    }
    if (launchedAttempt.current === attempt) return;
    launchedAttempt.current = attempt;

    let active = true;
    void (async () => {
      try {
        const response = await fetch(`/api/controles/${controlId}/analizar`, {
          method: "POST",
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(
            payload.error ?? "No fue posible completar el análisis.",
          );
        }
        await refresh();
        if (active) router.replace(`/controles/${controlId}`);
      } catch (cause) {
        await refresh();
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "No fue posible completar el análisis.",
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt, controlId, exists, refresh, router, status]);

  if (!control) {
    return (
      <PageShell
        eyebrow="Control no encontrado"
        title="No pudimos iniciar el análisis"
        description="El control solicitado no existe."
      >
        <Link
          href="/"
          className="text-primary mt-8 inline-flex text-sm font-medium hover:underline"
        >
          Volver a controles
        </Link>
      </PageShell>
    );
  }

  const steps = processingSteps(error ? "error" : "processing");

  return (
    <PageShell
      eyebrow={`${control.company} · ${formatPeriod(control.period)}`}
      title="Analizando documentación"
      description="Estamos leyendo los archivos cargados y conciliando la información por trabajador. Puede tardar unos minutos."
    >
      <section className="border-border bg-card mt-10 max-w-2xl rounded-2xl border p-5 sm:p-6">
        <div className="grid gap-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className="border-border flex items-center gap-4 rounded-xl border px-4 py-4"
            >
              <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full">
                {step.status === "completed" ? (
                  <Check className="size-4" />
                ) : step.status === "error" ? (
                  <AlertCircle className="size-4 text-red-700" />
                ) : (
                  <LoaderCircle className="size-4 animate-spin" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {step.status === "error" ? "Interrumpido" : "Procesando…"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {error ? (
          <div className="mt-5 rounded-xl bg-red-50 p-4">
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setError(null);
                  setAttempt((value) => value + 1);
                }}
                className="bg-primary text-primary-foreground inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold"
              >
                <RefreshCw className="size-4" /> Reintentar análisis
              </button>
              <Link
                href={`/controles/${control.id}/documentos`}
                className="border-border bg-card hover:bg-muted inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium"
              >
                Revisar documentos
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground mt-5 text-xs leading-5">
            Al finalizar vas a ser redirigido automáticamente a los resultados.
            No cierres esta pestaña.
          </p>
        )}
      </section>
    </PageShell>
  );
}
