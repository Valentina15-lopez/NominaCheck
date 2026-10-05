import type { EmploymentRecord, NominaCheckResult } from "@/types/nominacheck";

export type ReportDiagnosis = {
  title: string;
  paragraphs: string[];
  missingPieces: {
    withoutPayroll: number;
    withoutReceipt: number;
    withoutTransfer: number;
  };
};

export function countExtractedReceipts(result: NominaCheckResult) {
  const matched = result.workers.reduce(
    (sum, worker) =>
      sum + worker.employment_records.filter((record) => record.receipt).length,
    0,
  );
  return matched + result.unmatched_records.receipts.length;
}

export function recordGaps(record: EmploymentRecord) {
  return {
    payroll: !record.payroll,
    receipt: !record.receipt,
    transfer: record.transfers.length === 0,
  };
}

export function buildReportDiagnosis(
  result: NominaCheckResult,
): ReportDiagnosis | null {
  const records = result.workers.flatMap((worker) => worker.employment_records);
  const missingPieces = {
    withoutPayroll: records.filter((record) => !record.payroll).length,
    withoutReceipt: records.filter((record) => !record.receipt).length,
    withoutTransfer: records.filter((record) => record.transfers.length === 0)
      .length,
  };
  const extractedReceipts = countExtractedReceipts(result);
  const liquidationDocs = result.documents.filter(
    (document) => document.classification === "LIQUIDACION_ODOO",
  );
  const receiptDocs = result.documents.filter(
    (document) => document.classification === "RECIBO_SUELDO",
  );
  const paragraphs: string[] = [];

  if (result.summary.incomplete === 0 && extractedReceipts > 0) {
    return null;
  }

  if (extractedReceipts === 0 && records.length > 0) {
    paragraphs.push(
      "No se extrajo ningún recibo de sueldo. Sin recibo no se puede cruzar el líquido a cobrar con la transferencia, y el control queda en documentación incompleta.",
    );
    if (receiptDocs.length === 0 && liquidationDocs.length > 1) {
      paragraphs.push(
        "Hay más de un archivo clasificado como liquidación de Odoo. Es muy probable que el PDF de recibos (por ejemplo h.cuidados) se haya leído como otra LS en vez de como RECIBO_SUELDO.",
      );
    } else if (receiptDocs.length === 0) {
      paragraphs.push(
        "Ningún documento quedó clasificado como RECIBO_SUELDO. Revisá que el archivo de recibos individuales no se haya tomado como planilla resumen.",
      );
    }
  } else if (missingPieces.withoutReceipt > 0) {
    paragraphs.push(
      `${missingPieces.withoutReceipt} registros no tienen recibo vinculado. Falta esa evidencia para cerrar la conciliación.`,
    );
  }

  if (missingPieces.withoutPayroll > 0) {
    paragraphs.push(
      `${missingPieces.withoutPayroll} registros no tienen fila de nómina BPS asociada.`,
    );
  }
  if (missingPieces.withoutTransfer > 0) {
    paragraphs.push(
      `${missingPieces.withoutTransfer} registros no tienen transferencia bancaria asociada.`,
    );
  }

  if (paragraphs.length === 0) {
    return null;
  }

  return {
    title:
      extractedReceipts === 0
        ? "Por qué aparece documentación incompleta"
        : "Qué falta para cerrar el control",
    paragraphs,
    missingPieces,
  };
}
