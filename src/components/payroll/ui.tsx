import type { LucideIcon } from "lucide-react";
import { SITE } from "@/constants/site";
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
        <p className="font-semibold">{SITE.name}</p>
        <p className="text-muted-foreground text-xs">Control de salarios</p>
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  CORRECTO: "Correcto",
  CORRECTO_CON_REDONDEO: "Correcto con redondeo",
  CORRECTO_CON_OBSERVACION: "Correcto con observación",
  ADVERTENCIA: "Advertencia",
  ERROR: "Error",
  DOCUMENTACION_INCOMPLETA: "Documentación incompleta",
  REVISION_MANUAL: "Revisión manual",
  NO_PROCESABLE: "No procesable",
  COMPLETED: "Completado",
  PARTIAL: "Parcial",
  FAILED: "Fallido",
  LIQUIDACION_ODOO: "Liquidación Odoo (LS)",
  NOMINA: "Nómina BPS",
  RECIBO_SUELDO: "Recibos de sueldo",
  COMPROBANTE_TRANSFERENCIAS: "Comprobante de transferencias",
  DOCUMENTO_MIXTO: "Documento mixto",
  OTRO: "Otro",
  NO_IDENTIFICADO: "No identificado",
};

export function statusLabel(label: string) {
  return STATUS_LABELS[label] ?? label;
}

export function StatusBadge({ label }: { label: string }) {
  const positive =
    label === "Correcto" ||
    label === "Completado" ||
    label.startsWith("CORRECTO") ||
    label.includes("cargados");
  const warning =
    label === "Pendiente" ||
    label === "En revisión" ||
    ["ADVERTENCIA", "REVISION_MANUAL", "DOCUMENTACION_INCOMPLETA"].includes(
      label,
    );
  const informational = [
    "LIQUIDACION_ODOO",
    "NOMINA",
    "RECIBO_SUELDO",
    "COMPROBANTE_TRANSFERENCIAS",
    "DOCUMENTO_MIXTO",
    "OTRO",
    "NO_IDENTIFICADO",
    "PARTIAL",
    "COMPLETED",
  ].includes(label);

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        positive
          ? "bg-primary/10 text-primary"
          : warning
            ? "bg-accent text-accent-foreground"
            : informational
              ? "bg-muted text-muted-foreground"
              : "bg-destructive/10 text-destructive"
      }`}
    >
      {statusLabel(label)}
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
