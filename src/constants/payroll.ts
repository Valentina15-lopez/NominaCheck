import type { PayrollScreen, UploadCategory, Worker } from "@/types/payroll";

export const PAYROLL_STEPS = [
  "Nuevo control",
  "Documentos",
  "Procesamiento",
  "Revisión",
  "Resultados",
  "Informe",
] as const;

export const WORKFLOW_SCREENS: PayrollScreen[] = [
  "new",
  "upload",
  "processing",
  "review",
  "results",
  "report",
];

export const WORKERS: Worker[] = [
  {
    name: "Ana Martínez",
    id: "24.568.921",
    area: "Administración",
    status: "Correcto",
    amount: "$ 1.245.800",
  },
  {
    name: "Carlos Rodríguez",
    id: "28.114.332",
    area: "Operaciones",
    status: "Con diferencias",
    amount: "$ 982.450",
  },
  {
    name: "Lucía Fernández",
    id: "31.662.094",
    area: "Comercial",
    status: "Pendiente",
    amount: "$ 1.108.200",
  },
  {
    name: "Marcos Gómez",
    id: "26.734.109",
    area: "Logística",
    status: "Correcto",
    amount: "$ 876.300",
  },
];

export const UPLOAD_CATEGORIES: UploadCategory[] = [
  {
    name: "Nómina",
    description: "Listado de trabajadores y sueldos",
    icon: "workers",
    accept: ".csv,.xlsx,.pdf",
  },
  {
    name: "LS",
    description: "Liquidación de salarios",
    icon: "payroll",
    accept: ".csv,.xlsx,.pdf",
  },
  {
    name: "Recibos",
    description: "Recibos de sueldo digitalizados",
    icon: "receipts",
    accept: ".pdf,.jpg,.png",
  },
  {
    name: "Transferencias",
    description: "Extractos y comprobantes bancarios",
    icon: "transfers",
    accept: ".csv,.xlsx,.pdf",
  },
];
