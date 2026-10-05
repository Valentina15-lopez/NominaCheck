import assert from "node:assert/strict";
import test from "node:test";
import { buildReportDiagnosis } from "@/components/payroll/report-diagnosis";
import {
  buildResultFromExtractions,
  type ExtractedDocument,
} from "@/lib/nominacheck/process";
import {
  normalizeDocumentNumber,
  normalizeName,
  normalizePeriod,
  parseMoney,
} from "@/lib/nominacheck/normalize";
import {
  inlineOcrTables,
  reclassifyReceiptsMistakenAsLiquidation,
} from "@/lib/nominacheck/extract";
import { nominaCheckResultSchema } from "@/lib/nominacheck/schema";
import {
  baseExtraction,
  field,
  odooEntry,
  payrollEntry,
  receiptEntry,
  transferEntry,
} from "@/lib/nominacheck/__tests__/synthetic-fixtures";

test("normaliza cédulas sin reconstruir datos", () => {
  assert.equal(normalizeDocumentNumber("4.567.890-5"), "45678905");
  assert.equal(normalizeDocumentNumber("LS-2602-0000120"), null);
  assert.equal(normalizeDocumentNumber("226_7"), null);
  assert.equal(normalizeDocumentNumber("ilegible"), null);
  assert.equal(normalizeDocumentNumber(null), null);
});

test("incorpora las tablas separadas que devuelve Mistral OCR", () => {
  const content = inlineOcrTables({
    index: 0,
    markdown: "Encabezado\n\n[tbl-0.md](tbl-0.md)",
    tables: [
      {
        id: "tbl-0.md",
        content: "| C.I. | Nombre |\n| --- | --- |\n| 45678905 | Ana Pérez |",
      },
    ],
  });

  assert.match(content, /45678905/);
  assert.doesNotMatch(content, /\[tbl-0\.md\]/);
});

test("normaliza nombres, períodos y formatos monetarios", () => {
  assert.equal(normalizeName("Pérez, Ana María"), "ana maria perez");
  assert.equal(normalizeName("Ana Maria Perez"), "ana maria perez");
  assert.equal(normalizePeriod("Agosto 2026"), "2026-08");
  assert.deepEqual(parseMoney("UYU 60.045,98"), {
    value: 60045.98,
    separators: "URUGUAYO",
  });
  assert.deepEqual(parseMoney("60,045.98"), {
    value: 60045.98,
    separators: "INTERNACIONAL",
  });
});

test("concilia pagos a cuenta y saldo como movimientos individuales", () => {
  const ls = baseExtraction("LIQUIDACION_ODOO");
  ls.odoo_entries.push(odooEntry());
  const payroll = baseExtraction("NOMINA");
  payroll.payroll_entries.push(payrollEntry());
  const receipts = baseExtraction("RECIBO_SUELDO");
  receipts.receipts.push(receiptEntry());
  const bank = baseExtraction("COMPROBANTE_TRANSFERENCIAS");
  bank.transfers.push(
    transferEntry("20.000,00", "PAGO_A_CUENTA"),
    transferEntry("30.000,00", "PAGO_DE_SALDO"),
  );

  const result = buildResultFromExtractions(
    {
      organization: "Empresa Demo S.A.",
      period: "2026-08",
      roundingTolerance: 0.01,
      observations: "",
    },
    [
      document("ls", "ls.pdf", "LS", ls),
      document("payroll", "nomina.xlsx", "Nómina", payroll),
      document("receipts", "recibo.pdf", "Recibos", receipts),
      document("bank", "banco.pdf", "Transferencias", bank),
    ],
    [],
  );

  const record = result.workers[0]?.employment_records[0];
  assert.doesNotThrow(() => nominaCheckResultSchema.parse(result));
  assert.ok(record);
  assert.equal(record.transfers.length, 2);
  assert.notEqual(
    record.transfers[0]?.transfer_id,
    record.transfers[1]?.transfer_id,
  );
  assert.equal(record.proposed_transfer_total, 50000);
  assert.equal(record.transfer_difference, 0);
  assert.equal(record.proposed_status, "CORRECTO_CON_OBSERVACION");
});

test("no distribuye transferencias entre múltiples acumulaciones", () => {
  const ls = baseExtraction("LIQUIDACION_ODOO");
  ls.odoo_entries.push(odooEntry("Cargo A"), odooEntry("Cargo B"));
  const bank = baseExtraction("COMPROBANTE_TRANSFERENCIAS");
  bank.transfers.push(transferEntry("50.000,00", "PAGO_A_CUENTA"));

  const result = buildResultFromExtractions(
    {
      organization: "Empresa Demo S.A.",
      period: "2026-08",
      roundingTolerance: null,
      observations: "",
    },
    [
      document("ls", "ls.pdf", "LS", ls),
      document("bank", "banco.pdf", "Transferencias", bank),
    ],
    [],
  );

  assert.equal(result.workers[0]?.employment_records.length, 2);
  assert.equal(result.workers[0]?.unallocated_transfers.length, 1);
  assert.ok(
    result.incidents.some(
      (incident) => incident.code === "DISTRIBUCION_TRANSFERENCIAS_PENDIENTE",
    ),
  );
});

test("conserva recibos probablemente duplicados", () => {
  const ls = baseExtraction("LIQUIDACION_ODOO");
  ls.odoo_entries.push(odooEntry());
  const receipts = baseExtraction("RECIBO_SUELDO");
  receipts.receipts.push(receiptEntry(), receiptEntry());

  const result = buildResultFromExtractions(
    {
      organization: "Empresa Demo S.A.",
      period: "2026-08",
      roundingTolerance: null,
      observations: "",
    },
    [
      document("ls", "ls.pdf", "LS", ls),
      document("receipts", "recibos.pdf", "Recibos", receipts),
    ],
    [],
  );

  assert.equal(result.possible_duplicates.length, 1);
  assert.equal(result.unmatched_records.receipts.length, 2);
  assert.equal(result.unmatched_records.workers_not_in_ls.length, 0);
  assert.equal(
    result.workers[0]?.employment_records[0]?.matching
      .requires_human_confirmation,
    true,
  );
});

test("aplica tolerancia sin ocultar la diferencia exacta", () => {
  const ls = baseExtraction("LIQUIDACION_ODOO");
  ls.odoo_entries.push(odooEntry());
  const payroll = baseExtraction("NOMINA");
  payroll.payroll_entries.push(payrollEntry());
  const receipts = baseExtraction("RECIBO_SUELDO");
  receipts.receipts.push(receiptEntry());
  const bank = baseExtraction("COMPROBANTE_TRANSFERENCIAS");
  bank.transfers.push(transferEntry("49.999,99", "PAGO_DE_SALDO"));

  const result = buildResultFromExtractions(
    {
      organization: "Empresa Demo S.A.",
      period: "2026-08",
      roundingTolerance: 0.01,
      observations: "",
    },
    [
      document("ls", "ls.pdf", "LS", ls),
      document("payroll", "nomina.csv", "Nómina", payroll),
      document("receipt", "recibo.png", "Recibos", receipts),
      document("bank", "banco.xlsx", "Transferencias", bank),
    ],
    [],
  );

  const record = result.workers[0]?.employment_records[0];
  assert.equal(record?.proposed_status, "CORRECTO_CON_OBSERVACION");
  assert.equal(record?.transfer_difference, -0.01);
});

test("sin tolerancia deriva las diferencias a revisión manual", () => {
  const ls = baseExtraction("LIQUIDACION_ODOO");
  ls.odoo_entries.push(odooEntry());
  const payroll = baseExtraction("NOMINA");
  payroll.payroll_entries.push(payrollEntry());
  const receipts = baseExtraction("RECIBO_SUELDO");
  receipts.receipts.push(receiptEntry());
  const bank = baseExtraction("COMPROBANTE_TRANSFERENCIAS");
  bank.transfers.push(transferEntry("49.999,99", "PAGO_DE_SALDO"));

  const result = buildResultFromExtractions(
    {
      organization: "Empresa Demo S.A.",
      period: "2026-08",
      roundingTolerance: null,
      observations: "",
    },
    [
      document("ls", "ls.pdf", "LS", ls),
      document("payroll", "nomina.csv", "Nómina", payroll),
      document("receipt", "recibo.pdf", "Recibos", receipts),
      document("bank", "banco.pdf", "Transferencias", bank),
    ],
    [],
  );

  assert.equal(
    result.workers[0]?.employment_records[0]?.proposed_status,
    "REVISION_MANUAL",
  );
  assert.equal(
    result.incidents.some(
      (incident) => incident.code === "ERROR_PAGO_INCOMPLETO",
    ),
    false,
  );
});

test("mantiene visible una persona ajena a la LS", () => {
  const ls = baseExtraction("LIQUIDACION_ODOO");
  ls.odoo_entries.push(odooEntry());
  const payroll = baseExtraction("NOMINA");
  const outside = payrollEntry();
  outside.document_number = {
    ...outside.document_number,
    original: "1.111.111-1",
  };
  outside.full_name = { ...outside.full_name, original: "Otra Persona" };
  payroll.payroll_entries.push(outside);

  const result = buildResultFromExtractions(
    {
      organization: "Empresa Demo S.A.",
      period: "2026-08",
      roundingTolerance: null,
      observations: "",
    },
    [
      document("ls", "ls.pdf", "LS", ls),
      document("payroll", "nomina.xlsx", "Nómina", payroll),
    ],
    [],
  );

  assert.equal(result.unmatched_records.workers_not_in_ls.length, 1);
  assert.ok(
    result.incidents.some(
      (incident) => incident.code === "TRABAJADOR_NO_INCLUIDO_EN_LS",
    ),
  );
});

test("reclasifica un PDF de recibos que Mistral etiquetó como LS", () => {
  const extraction = baseExtraction("LIQUIDACION_ODOO");
  extraction.page_count = 18;
  for (let index = 0; index < 18; index += 1) {
    const entry = odooEntry();
    entry.full_name = field(`Persona ${index} Ejemplo`);
    entry.document_number = field(`${40000000 + index}`);
    extraction.odoo_entries.push(entry);
  }

  const result = reclassifyReceiptsMistakenAsLiquidation(extraction);
  assert.equal(result.classification, "RECIBO_SUELDO");
  assert.equal(result.receipts.length, 18);
  assert.equal(result.odoo_entries.length, 0);
});

test("no reclasifica una LS compacta con varios trabajadores", () => {
  const extraction = baseExtraction("LIQUIDACION_ODOO");
  extraction.page_count = 2;
  for (let index = 0; index < 18; index += 1) {
    extraction.odoo_entries.push(odooEntry());
  }

  const result = reclassifyReceiptsMistakenAsLiquidation(extraction);
  assert.equal(result.classification, "LIQUIDACION_ODOO");
  assert.equal(result.odoo_entries.length, 18);
  assert.equal(result.receipts.length, 0);
});

test("explica documentación incompleta cuando no hay recibos extraídos", () => {
  const ls = baseExtraction("LIQUIDACION_ODOO");
  ls.odoo_entries.push(odooEntry());
  const payroll = baseExtraction("NOMINA");
  payroll.payroll_entries.push(payrollEntry());
  const result = buildResultFromExtractions(
    {
      organization: "Empresa Demo S.A.",
      period: "2026-08",
      roundingTolerance: 1,
      observations: "",
    },
    [
      document("ls", "ls.pdf", "LS", ls),
      document("payroll", "nomina.xlsx", "Nómina", payroll),
    ],
    [],
  );

  const diagnosis = buildReportDiagnosis(result);
  assert.ok(diagnosis);
  assert.match(diagnosis.title, /documentación incompleta/i);
  assert.ok(
    diagnosis.paragraphs.some((paragraph) =>
      paragraph.includes("ningún recibo"),
    ),
  );
});

test("clasifica como no identificado todo archivo que falla", () => {
  const result = buildResultFromExtractions(
    {
      organization: "Empresa Demo S.A.",
      period: "2026-08",
      roundingTolerance: null,
      observations: "",
    },
    [],
    [
      {
        document: {
          id: "fallido",
          fileName: "ilegible.pdf",
          category: "Recibos",
        },
        reason: "Archivo ilegible",
      },
    ],
  );

  assert.equal(result.processing_status, "FAILED");
  assert.equal(result.documents[0]?.classification, "NO_IDENTIFICADO");
  assert.equal(result.summary.proposed_general_status, "NO_PROCESABLE");
});

function document(
  id: string,
  fileName: string,
  category: string,
  extraction: ExtractedDocument["extraction"],
): ExtractedDocument {
  return { id, fileName, category, extraction };
}
