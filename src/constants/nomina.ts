import type {
  ControlStatus,
  DocumentKind,
  ProcessingStep,
} from "@/types/nomina";

export const REQUIRED_DOCUMENT_KINDS: DocumentKind[] = [
  "ls",
  "payroll",
  "receipt",
  "transfer",
];

export const ACCEPTED_DOCUMENT_PATTERN = /\.(pdf|png|jpe?g|csv|xlsx)$/i;

const PROCESSING_STEP_LABELS: ProcessingStep[] = [
  {
    id: "classification",
    label: "Clasificación de documentos",
    status: "pending",
  },
  { id: "extraction", label: "Extracción de datos", status: "pending" },
  { id: "association", label: "Asociación por trabajador", status: "pending" },
  { id: "comparison", label: "Comparación de importes", status: "pending" },
];

/**
 * El análisis corre en una sola llamada al motor, así que no hay progreso
 * parcial real para informar: los pasos se derivan del estado del control en
 * vez de simularse con temporizadores.
 */
export function processingSteps(status: ControlStatus): ProcessingStep[] {
  const stepStatus: ProcessingStep["status"] =
    status === "completed"
      ? "completed"
      : status === "error"
        ? "error"
        : status === "processing"
          ? "active"
          : "pending";
  return PROCESSING_STEP_LABELS.map((step) => ({
    ...step,
    status: stepStatus,
  }));
}
