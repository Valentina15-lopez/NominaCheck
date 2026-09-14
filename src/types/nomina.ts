export type ControlStatus = "draft" | "ready" | "processing" | "completed";
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
};

export type Worker = {
  id: string;
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
  documents: ControlDocument[];
  workers: Worker[];
  processingSteps: ProcessingStep[];
};

export type NewControlInput = {
  company: string;
  period: string;
};
