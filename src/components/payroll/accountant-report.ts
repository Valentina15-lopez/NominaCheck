import type {
  EmploymentRecord,
  NominaCheckResult,
  WorkerRecord,
} from "@/types/nominacheck";

export const ACCOUNTANT_REPORT_HEADERS = [
  "Empleado",
  "Categoría MIDES",
  "Concepto",
  "Cantidad Hs. Trabajadas mensuales",
  "Importe Nominal LS",
  "Importe Nominal RECIBO",
  "IMPORTE NOMINA",
  "RECIBO LIQUIDO",
  "TRANSFERENCIA",
  "diferencias nominal recibo/ nomina",
  "diferencias liquido recibo/ transferencia",
  "diferencias nominal recibo/ nominal LS",
  "ESTADO",
] as const;

export type AccountantReportRow = {
  empleado: string;
  categoriaMides: string | null;
  concepto: string | null;
  horasMensuales: string | null;
  importeNominalLs: number | null;
  importeNominalRecibo: number | null;
  importeNomina: number | null;
  reciboLiquido: number | null;
  transferencia: number;
  diferenciaNominalReciboNomina: number | null;
  diferenciaLiquidoReciboTransferencia: number | null;
  diferenciaNominalReciboLs: number | null;
  estado: string;
};

export function buildAccountantReportRows(
  result: NominaCheckResult,
): AccountantReportRow[] {
  return result.workers.flatMap((worker) =>
    worker.employment_records.map((record) =>
      buildAccountantReportRow(worker, record),
    ),
  );
}

export function buildAccountantReportRow(
  worker: WorkerRecord,
  record: EmploymentRecord,
): AccountantReportRow {
  const lsNominal = record.odoo?.nominal.normalized ?? null;
  const receiptNominal = record.receipt?.nominal.normalized ?? null;
  const payrollNominal = record.payroll?.nominal.normalized ?? null;
  const receiptNet = record.receipt?.net.normalized ?? null;
  const transferencia = record.proposed_transfer_total ?? 0;
  const diferenciaNominalReciboNomina = moneyDiff(
    receiptNominal,
    payrollNominal,
  );
  const diferenciaLiquidoReciboTransferencia = moneyDiff(
    receiptNet,
    transferencia,
  );
  const diferenciaNominalReciboLs = moneyDiff(receiptNominal, lsNominal);

  return {
    empleado: employeeLabel(worker, record),
    categoriaMides: record.odoo?.category.original ?? record.category.original,
    concepto: record.odoo?.concept.original ?? record.concept.original,
    horasMensuales:
      record.odoo?.hours_worked.original ??
      (record.odoo?.hours_worked.normalized != null
        ? String(record.odoo.hours_worked.normalized)
        : null),
    importeNominalLs: lsNominal,
    importeNominalRecibo: receiptNominal,
    importeNomina: payrollNominal,
    reciboLiquido: receiptNet,
    transferencia,
    diferenciaNominalReciboNomina,
    diferenciaLiquidoReciboTransferencia,
    diferenciaNominalReciboLs,
    estado: accountantStatus({
      missingTransfer: record.transfers.length === 0,
      liquidDifference: diferenciaLiquidoReciboTransferencia,
      payrollBelowReceipt: diferenciaNominalReciboNomina,
    }),
  };
}

export function accountantReportCsv(rows: AccountantReportRow[]) {
  const lines = [
    ACCOUNTANT_REPORT_HEADERS.join(";"),
    ...rows.map((row) =>
      [
        row.empleado,
        row.categoriaMides ?? "",
        row.concepto ?? "",
        row.horasMensuales ?? "",
        csvNumber(row.importeNominalLs),
        csvNumber(row.importeNominalRecibo),
        csvNumber(row.importeNomina),
        csvNumber(row.reciboLiquido),
        csvNumber(row.transferencia),
        csvNumber(row.diferenciaNominalReciboNomina),
        csvNumber(row.diferenciaLiquidoReciboTransferencia),
        csvNumber(row.diferenciaNominalReciboLs),
        row.estado,
      ]
        .map(csvCell)
        .join(";"),
    ),
  ];
  return `\uFEFF${lines.join("\n")}`;
}

function employeeLabel(worker: WorkerRecord, record: EmploymentRecord) {
  const documentNumber =
    record.odoo?.document_number.original ??
    worker.identity.document_number.original ??
    worker.identity.document_number.normalized;
  const name =
    record.odoo?.full_name.original ??
    worker.identity.full_name.original ??
    "Sin nombre";
  if (!documentNumber) return name;
  if (name.includes(documentNumber)) return name;
  return `${documentNumber} - ${name}`;
}

function accountantStatus({
  missingTransfer,
  liquidDifference,
  payrollBelowReceipt,
}: {
  missingTransfer: boolean;
  liquidDifference: number | null;
  payrollBelowReceipt: number | null;
}) {
  const parts: string[] = [];
  if (missingTransfer || (liquidDifference !== null && liquidDifference !== 0)) {
    parts.push("falta transferencia");
  }
  if (payrollBelowReceipt !== null && payrollBelowReceipt > 0) {
    parts.push("nomina menor que el recibo");
  }
  return parts.join("/ ");
}

function moneyDiff(left: number | null, right: number | null) {
  if (left === null || right === null) return null;
  return (Math.round(left * 100) - Math.round(right * 100)) / 100;
}

function csvNumber(value: number | null) {
  return value === null ? "" : String(value);
}

function csvCell(value: string) {
  if (!/[;"\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
