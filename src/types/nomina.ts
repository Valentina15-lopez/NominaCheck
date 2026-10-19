export type ControlStatus =
  "draft" | "ready" | "processing" | "completed" | "error";
export type WorkerStatus =
  "correct" | "warning" | "incomplete" | "manual-review";
export type DocumentStatus = "uploaded" | "error" | "processed";
export type DocumentKind = "ls" | "payroll" | "receipt" | "transfer";

export type ControlDocument = {
  id: string;
  name: string;
  kind: DocumentKind;
  size: number;
  status: DocumentStatus;
  error?: string;
};

export type PaymentDocument = {
  id: string;
  name: string;
  amount: number;
  date?: string;
  reference?: string;
  sharedWith?: string[];
  associationStatus?: "confirmed" | "suggested" | "unassigned";
  /** Id que el motor le dio al archivo del que salió este pago. */
  sourceDocumentId?: string;
};

export type Worker = {
  /** Identificador de la fila en la base, usado en las URLs. */
  id: string;
  /** Cédula extraída de los documentos. */
  documentNumber: string;
  name: string;
  role: string;
  status: WorkerStatus;
  odooNominal: number;
  payrollNominal?: number;
  receiptNominal?: number;
  receiptLiquid?: number;
  receipts: PaymentDocument[];
  transfers: PaymentDocument[];
  observation?: string;
  reviewed: boolean;
};

export type ProcessingStep = {
  id: "classification" | "extraction" | "association" | "comparison";
  label: string;
  status: "pending" | "active" | "completed" | "error";
};

export type SalaryControl = {
  id: string;
  company: string;
  period: string;
  status: ControlStatus;
  createdAt: string;
  roundingTolerance: number | null;
  observations: string;
  /** `proposed_general_status` del último análisis, si ya corrió. */
  generalStatus: string | null;
  processingError: string | null;
  hasResult: boolean;
  documents: ControlDocument[];
  workers: Worker[];
};

export type NewControlInput = {
  company: string;
  period: string;
  roundingTolerance?: number | null;
  observations?: string;
};

export type UserSettings = {
  currency: "UYU" | "ARS" | "USD";
  warnDifferences: boolean;
  roundingTolerance: number | null;
};
