export type PayrollScreen =
  | "login"
  | "controls"
  | "new"
  | "upload"
  | "processing"
  | "review"
  | "results"
  | "report";

export type WorkerStatus = "Correcto" | "Con diferencias" | "Pendiente";

export type Worker = {
  name: string;
  id: string;
  area: string;
  status: WorkerStatus;
  amount: string;
};

export type UploadCategory = {
  name: string;
  description: string;
  accept: string;
  icon: "workers" | "payroll" | "receipts" | "transfers";
};
