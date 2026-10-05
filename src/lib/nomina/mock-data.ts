import type { ProcessingStep, SalaryControl, Worker } from "@/types/nomina";

export const COMPANIES = [
  "Estudio González",
  "Peluquería Central SRL",
  "Servicios del Plata SAS",
] as const;

export const PROCESSING_STEPS: ProcessingStep[] = [
  {
    id: "classification",
    label: "Clasificación de documentos",
    status: "pending",
  },
  { id: "extraction", label: "Extracción de datos", status: "pending" },
  { id: "association", label: "Asociación por trabajador", status: "pending" },
  { id: "comparison", label: "Comparación de importes", status: "pending" },
];

export const MOCK_WORKERS: Worker[] = [
  {
    id: "45678901",
    name: "Ana Rodríguez",
    role: "Diseñadora",
    status: "correct",
    odooNominal: 78500,
    payrollNominal: 78500,
    receiptNominal: 78500,
    receiptLiquid: 64230,
    receipts: [{ id: "rec-ana-1", name: "Recibo_Ana.pdf", amount: 64230 }],
    transfers: [
      {
        id: "tra-ana-1",
        name: "Transferencia_0421.pdf",
        amount: 40000,
        date: "2026-09-30",
        reference: "TRX-0421",
        associationStatus: "confirmed",
      },
      {
        id: "tra-ana-2",
        name: "Transferencia_0438.pdf",
        amount: 24230,
        date: "2026-10-01",
        reference: "TRX-0438",
        associationStatus: "confirmed",
      },
    ],
    reviewed: false,
  },
  {
    id: "39921048",
    name: "Bruno Silva",
    role: "Desarrollador",
    status: "warning",
    odooNominal: 112000,
    payrollNominal: 110500,
    receiptNominal: 110500,
    receiptLiquid: 89300,
    receipts: [
      { id: "rec-bruno-1", name: "Recibo_Bruno_haberes.pdf", amount: 86100 },
      { id: "rec-bruno-2", name: "Recibo_Bruno_ajuste.pdf", amount: 3200 },
    ],
    transfers: [
      {
        id: "tra-bruno-1",
        name: "Transferencia_lote_18.pdf",
        amount: 89300,
        date: "2026-09-30",
        reference: "LOTE-18",
        sharedWith: ["Carla Méndez"],
        associationStatus: "confirmed",
      },
    ],
    observation:
      "El nominal de Odoo difiere del nominal informado en la nómina.",
    reviewed: false,
  },
  {
    id: "48213367",
    name: "Carla Méndez",
    role: "Administradora",
    status: "manual-review",
    odooNominal: 96200,
    payrollNominal: 96200,
    receiptNominal: 96200,
    receiptLiquid: 78140,
    receipts: [{ id: "rec-carla-1", name: "Recibo_Carla.pdf", amount: 78140 }],
    transfers: [
      {
        id: "tra-carla-1",
        name: "Transferencia_lote_18.pdf",
        amount: 78140,
        date: "2026-09-30",
        reference: "LOTE-18",
        sharedWith: ["Bruno Silva"],
        associationStatus: "suggested",
      },
    ],
    observation:
      "La transferencia agrupa pagos de varias personas. Confirmá la asociación sugerida.",
    reviewed: false,
  },
  {
    id: "34452192",
    name: "Diego Pereira",
    role: "Soporte",
    status: "incomplete",
    odooNominal: 64800,
    payrollNominal: 64800,
    receiptNominal: 64800,
    receiptLiquid: 52800,
    receipts: [{ id: "rec-diego-1", name: "Recibo_Diego.pdf", amount: 52800 }],
    transfers: [
      {
        id: "tra-diego-1",
        name: "Transferencia_0452.pdf",
        amount: 40000,
        date: "2026-09-30",
        reference: "TRX-0452",
        associationStatus: "confirmed",
      },
    ],
    observation: "La suma transferida no completa el líquido del recibo.",
    reviewed: false,
  },
  {
    id: "51233018",
    name: "Elena Suárez",
    role: "Analista",
    status: "correct",
    odooNominal: 88500,
    payrollNominal: 88500,
    receiptNominal: 88500,
    receiptLiquid: 72110,
    receipts: [{ id: "rec-elena-1", name: "Recibo_Elena.pdf", amount: 72110 }],
    transfers: [
      {
        id: "tra-elena-1",
        name: "Transferencia_0460.pdf",
        amount: 72110,
        date: "2026-09-30",
        reference: "TRX-0460",
        associationStatus: "confirmed",
      },
    ],
    reviewed: false,
  },
];

const processedDocuments = [
  {
    id: "doc-ls-seed",
    name: "LS_setiembre.xlsx",
    kind: "ls" as const,
    size: 18240,
    status: "processed" as const,
  },
  {
    id: "doc-payroll-seed",
    name: "Nomina_setiembre.xlsx",
    kind: "payroll" as const,
    size: 24510,
    status: "processed" as const,
  },
  {
    id: "doc-receipts-seed",
    name: "Recibos_setiembre.zip",
    kind: "receipt" as const,
    size: 4200000,
    status: "processed" as const,
  },
  {
    id: "doc-transfers-seed",
    name: "Transferencias_setiembre.pdf",
    kind: "transfer" as const,
    size: 860000,
    status: "processed" as const,
  },
];

export const INITIAL_CONTROLS: SalaryControl[] = [
  {
    id: "control-set-2026",
    company: "Peluquería Central SRL",
    period: "2026-09",
    status: "completed",
    createdAt: "2026-09-01T12:00:00.000Z",
    documents: processedDocuments,
    workers: MOCK_WORKERS,
    processingSteps: PROCESSING_STEPS.map((step) => ({
      ...step,
      status: "completed",
    })),
  },
  {
    id: "control-ago-2026",
    company: "Servicios del Plata SAS",
    period: "2026-08",
    status: "ready",
    createdAt: "2026-08-04T12:00:00.000Z",
    documents: processedDocuments.map((document) => ({
      ...document,
      id: `${document.id}-ago`,
      status: "uploaded",
    })),
    workers: [],
    processingSteps: PROCESSING_STEPS,
  },
];

export function cloneInitialControls() {
  return structuredClone(INITIAL_CONTROLS);
}
