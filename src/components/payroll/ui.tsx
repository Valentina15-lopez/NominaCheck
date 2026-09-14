import type { LucideIcon } from "lucide-react";
import type { WorkerStatus } from "@/types/payroll";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`bg-primary text-primary-foreground flex items-center justify-center rounded-xl font-bold ${
          compact ? "size-9" : "size-10 text-lg"
        }`}
      >
        S
      </div>
      <div>
        <p className="font-semibold">NóminaCheck</p>
        <p className="text-muted-foreground text-xs">Control de salarios</p>
      </div>
    </div>
  );
}

export function StatusBadge({ label }: { label: string }) {
  const positive =
    label === "Correcto" ||
    label === "Completado" ||
    label.includes("cargados");
  const warning = label === "Pendiente" || label === "En revisión";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        positive
          ? "bg-primary/10 text-primary"
          : warning
            ? "bg-accent text-accent-foreground"
            : "bg-destructive/10 text-destructive"
      }`}
    >
      {label}
    </span>
  );
}

export function StatusDot({ status }: { status: WorkerStatus }) {
  return (
    <span
      className={`size-2.5 rounded-full ${
        status === "Correcto"
          ? "bg-primary"
          : status === "Pendiente"
            ? "bg-accent-foreground"
            : "bg-destructive"
      }`}
      aria-label={`Estado: ${status}`}
    />
  );
}

export function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <Icon className="text-primary size-5" aria-hidden />
      <p className="text-muted-foreground mt-4 text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted rounded-xl p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
