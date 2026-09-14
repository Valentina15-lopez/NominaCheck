"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { useControlStore } from "@/components/nomina/control-store";
import { formatPeriod, LoadingState, PageShell } from "@/components/nomina/ui";
import { PROCESSING_STEPS } from "@/lib/nomina/mock-data";

export default function ProcessingPage() {
  const { controlId } = useParams<{ controlId: string }>();
  const router = useRouter();
  const {
    controls,
    hydrated,
    startProcessing,
    setProcessingSteps,
    completeProcessing,
  } = useControlStore();
  const control = controls.find((item) => item.id === controlId);
  const controlExists = Boolean(control);
  const status = control?.status;

  useEffect(() => {
    if (!hydrated || !controlExists) return;
    if (status === "completed") {
      router.replace(`/controles/${controlId}`);
      return;
    }
    if (status !== "processing") {
      startProcessing(controlId);
      return;
    }

    const timers = PROCESSING_STEPS.map((_, index) =>
      window.setTimeout(() => {
        setProcessingSteps(
          controlId,
          PROCESSING_STEPS.map((step, stepIndex) => ({
            ...step,
            status:
              stepIndex < index
                ? "completed"
                : stepIndex === index
                  ? "active"
                  : "pending",
          })),
        );
      }, index * 750),
    );
    timers.push(
      window.setTimeout(
        () => {
          completeProcessing(controlId);
          router.replace(`/controles/${controlId}`);
        },
        PROCESSING_STEPS.length * 750 + 350,
      ),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [
    completeProcessing,
    controlExists,
    controlId,
    hydrated,
    router,
    setProcessingSteps,
    startProcessing,
    status,
  ]);

  if (!hydrated) {
    return (
      <PageShell
        eyebrow="Procesamiento"
        title="Preparando el análisis"
        description=""
      >
        <LoadingState />
      </PageShell>
    );
  }

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
          Volver al dashboard
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={`${control.company} · ${formatPeriod(control.period)}`}
      title="Analizando documentación"
      description="Estamos procesando los archivos mock y conciliando la información por trabajador."
    >
      <section className="border-border bg-card mt-10 max-w-2xl rounded-2xl border p-5 sm:p-6">
        <div className="grid gap-3">
          {control.processingSteps.map((step) => (
            <div
              key={step.id}
              className="border-border flex items-center gap-4 rounded-xl border px-4 py-4"
            >
              <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full">
                {step.status === "completed" ? (
                  <Check className="size-4" />
                ) : step.status === "active" ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <span className="bg-muted-foreground/40 size-2 rounded-full" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {step.status === "completed"
                    ? "Completado"
                    : step.status === "active"
                      ? "Procesando…"
                      : "Pendiente"}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-5 text-xs leading-5">
          Al finalizar vas a ser redirigido automáticamente a los resultados.
        </p>
      </section>
    </PageShell>
  );
}
