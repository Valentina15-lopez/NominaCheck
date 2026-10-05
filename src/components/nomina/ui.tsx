"use client";

import { useEffect } from "react";
import { Check, FileText, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ControlStatus, WorkerStatus } from "@/types/nomina";

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-10 lg:px-12 lg:py-14">
      <p className="text-primary mb-3 text-sm font-medium">{eyebrow}</p>
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
        {description}
      </p>
      {children}
    </div>
  );
}

export function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <Icon className="text-primary size-5" />
      <p className="text-muted-foreground mt-5 text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

const workerLabels: Record<WorkerStatus, string> = {
  correct: "Correcto",
  warning: "Advertencia",
  incomplete: "Incompleto",
  "manual-review": "Revisión manual",
};

const controlLabels: Record<ControlStatus, string> = {
  draft: "Pendiente",
  ready: "Listo para analizar",
  processing: "Procesando",
  completed: "Completado",
};

export function StatusBadge({
  status,
}: {
  status: WorkerStatus | ControlStatus;
}) {
  const isPositive = status === "correct" || status === "completed";
  const isAttention =
    status === "warning" ||
    status === "manual-review" ||
    status === "processing";
  const label =
    status in workerLabels
      ? workerLabels[status as WorkerStatus]
      : controlLabels[status as ControlStatus];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        isPositive
          ? "bg-primary/10 text-primary"
          : isAttention
            ? "bg-amber-50 text-amber-700"
            : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="border-border bg-card text-muted-foreground mt-10 flex items-center gap-3 rounded-2xl border p-6 text-sm">
      <div className="border-primary/25 border-t-primary size-4 animate-spin rounded-full border-2" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-border bg-card rounded-2xl border border-dashed p-10 text-center">
      <FileText className="text-muted-foreground mx-auto size-6" />
      <p className="mt-4 font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    </div>
  );
}

export function DocumentPreview({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <div
      className="bg-foreground/30 fixed inset-0 z-30 flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div className="bg-card w-full max-w-3xl rounded-2xl p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="preview-title" className="text-lg font-semibold">
              {name}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Vista previa del documento original
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar vista previa"
            className="text-muted-foreground hover:bg-muted rounded-lg p-1"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="border-border bg-muted/50 mt-6 flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed text-center">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
            <FileText className="size-5" />
          </div>
          <p className="mt-4 text-sm font-medium">
            Documento disponible en modo demostración
          </p>
          <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-5">
            En esta versión mock se conserva la referencia al archivo, sin subir
            contenido a un servidor.
          </p>
          <span className="text-primary mt-4 inline-flex items-center gap-2 text-xs font-medium">
            <Check className="size-3.5" /> Referencia cargada
          </span>
        </div>
      </div>
    </div>
  );
}

export function formatMoney(value?: number) {
  if (value === undefined) return "Sin datos";
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  const value = new Date(year, month - 1, 1).toLocaleDateString("es-UY", {
    month: "long",
    year: "numeric",
  });
  return value.charAt(0).toUpperCase() + value.slice(1);
}
