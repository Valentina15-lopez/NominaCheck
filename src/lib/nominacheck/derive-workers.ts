import type {
  GeneralStatus,
  NominaCheckResult,
  TransferRecord,
  WorkerRecord,
} from "@/types/nominacheck";
import type { PaymentDocument, WorkerStatus } from "@/types/nomina";

/**
 * El motor devuelve un NominaCheckResult muy detallado, con una fila por
 * trabajador + acumulación + concepto. El espacio de trabajo necesita una
 * vista por persona para listar y filtrar, así que acá se agrega el resultado
 * sin perder el original: el JSON completo se sigue guardando en el control.
 */
export type DerivedPayment = {
  name: string;
  amount: number;
  date?: string;
  reference?: string;
  sharedWith: string[];
  associationStatus: NonNullable<PaymentDocument["associationStatus"]>;
  sourceDocumentId: string | null;
};

export type DerivedWorker = {
  documentNumber: string;
  fullName: string;
  role: string;
  status: WorkerStatus;
  odooNominal: number;
  payrollNominal: number | null;
  receiptNominal: number | null;
  receiptLiquid: number | null;
  observation: string | null;
  receipts: DerivedPayment[];
  transfers: DerivedPayment[];
};

const WORKER_STATUS_BY_GENERAL_STATUS: Record<GeneralStatus, WorkerStatus> = {
  CORRECTO: "correct",
  CORRECTO_CON_REDONDEO: "correct",
  CORRECTO_CON_OBSERVACION: "correct",
  ADVERTENCIA: "warning",
  ERROR: "warning",
  REVISION_MANUAL: "manual-review",
  DOCUMENTACION_INCOMPLETA: "incomplete",
  NO_PROCESABLE: "incomplete",
};

// Cuanto más alto, más crítico: el estado de la persona nunca es más favorable
// que su peor acumulación.
const WORKER_STATUS_PRIORITY: Record<WorkerStatus, number> = {
  correct: 0,
  warning: 1,
  "manual-review": 2,
  incomplete: 3,
};

export function deriveWorkers(result: NominaCheckResult): DerivedWorker[] {
  const filenames = new Map(
    result.documents.map((document) => [
      document.document_id,
      document.filename,
    ]),
  );
  // La cédula identifica a la persona dentro del control. Si el motor devolvió
  // dos grupos con la misma, se desambiguan en vez de perder uno.
  const seenDocumentNumbers = new Set<string>();
  // Una transferencia puede coincidir con más de una persona: el motor no la
  // reparte sin evidencia. Ese reparto es justamente lo que hay que confirmar.
  const transferOwners = new Map<string, string[]>();
  for (const worker of result.workers) {
    const name = worker.identity.full_name.original?.trim();
    for (const transfer of allTransfers(worker)) {
      const owners = transferOwners.get(transfer.transfer_id) ?? [];
      if (name && !owners.includes(name)) {
        transferOwners.set(transfer.transfer_id, [...owners, name]);
      }
    }
  }

  return result.workers.map((worker, index) => {
    const records = worker.employment_records;
    const observations = [
      ...new Set(records.flatMap((record) => record.observations)),
    ];

    const transfers = [
      ...records.flatMap((record) =>
        record.transfers.map((transfer) =>
          toPayment(transfer, filenames, transferOwners, worker, "confirmed"),
        ),
      ),
      ...worker.unallocated_transfers.map((transfer) =>
        toPayment(transfer, filenames, transferOwners, worker, "suggested"),
      ),
    ];

    const documentNumber =
      worker.identity.document_number.original?.trim() ||
      worker.identity.document_number.normalized ||
      `sin-cedula-${index + 1}`;
    const uniqueDocumentNumber = seenDocumentNumbers.has(documentNumber)
      ? `${documentNumber} (${index + 1})`
      : documentNumber;
    seenDocumentNumbers.add(uniqueDocumentNumber);

    return {
      documentNumber: uniqueDocumentNumber,
      fullName: worker.identity.full_name.original?.trim() || "Sin nombre",
      role:
        records
          .map((record) => record.position.original ?? record.category.original)
          .find((value) => Boolean(value?.trim())) ?? "Sin cargo",
      status: records.length
        ? records
            .map(
              (record) =>
                WORKER_STATUS_BY_GENERAL_STATUS[record.proposed_status],
            )
            .reduce((worst, status) =>
              WORKER_STATUS_PRIORITY[status] > WORKER_STATUS_PRIORITY[worst]
                ? status
                : worst,
            )
        : "incomplete",
      odooNominal:
        sum(records.map((record) => record.odoo?.nominal.normalized ?? null)) ??
        0,
      payrollNominal: sum(
        records.map((record) => record.payroll?.nominal.normalized ?? null),
      ),
      receiptNominal: sum(
        records.map((record) => record.receipt?.nominal.normalized ?? null),
      ),
      receiptLiquid: sum(
        records.map((record) => record.receipt?.net.normalized ?? null),
      ),
      observation: observations.length ? observations.join(" ") : null,
      receipts: records.flatMap((record) =>
        record.receipt
          ? [
              {
                name:
                  filenames.get(record.receipt.net.source?.document_id ?? "") ??
                  record.receipt.receipt_id,
                amount: record.receipt.net.normalized ?? 0,
                sharedWith: [],
                associationStatus: "confirmed" as const,
                sourceDocumentId:
                  record.receipt.net.source?.document_id ?? null,
              },
            ]
          : [],
      ),
      transfers,
    };
  });
}

function toPayment(
  transfer: TransferRecord,
  filenames: Map<string, string>,
  transferOwners: Map<string, string[]>,
  worker: WorkerRecord,
  associationStatus: "confirmed" | "suggested",
): DerivedPayment {
  const ownName = worker.identity.full_name.original?.trim();
  const sharedWith = (transferOwners.get(transfer.transfer_id) ?? []).filter(
    (name) => name !== ownName,
  );
  return {
    name: filenames.get(transfer.source.document_id) ?? transfer.transfer_id,
    amount: transfer.amount.normalized ?? 0,
    date: transfer.payment_date.original ?? undefined,
    reference: transfer.transaction_reference.original ?? undefined,
    sharedWith,
    // Un pago que coincide con varias personas no se puede dar por confirmado.
    associationStatus: sharedWith.length ? "suggested" : associationStatus,
    sourceDocumentId: transfer.source.document_id,
  };
}

function allTransfers(worker: WorkerRecord) {
  return [
    ...worker.employment_records.flatMap((record) => record.transfers),
    ...worker.unallocated_transfers,
  ];
}

/** Suma en centavos para no arrastrar error de punto flotante. */
function sum(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  if (!present.length) return null;
  return (
    present.reduce((total, value) => total + Math.round(value * 100), 0) / 100
  );
}
