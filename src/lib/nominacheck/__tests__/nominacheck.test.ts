import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCOUNTANT_REPORT_HEADERS,
  buildAccountantReportRows,
} from "@/components/payroll/accountant-report";
import { buildReportDiagnosis } from "@/components/payroll/report-diagnosis";
import {
  buildResultFromExtractions,
  type ExtractedDocument,
} from "@/lib/nominacheck/process";
import {
  accountsMatch,
  nameSimilarity,
  normalizeDocumentNumber,
  normalizeName,
  normalizePeriod,
  parseMoney,
} from "@/lib/nominacheck/normalize";
import {
  inlineOcrTables,
  parseTransferRowsFromOcr,
  reclassifyReceiptsMistakenAsLiquidation,
  recoverTransfersFromOcr,
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

test("trata nombres intermedios y errores ortográficos menores como la misma persona", () => {
  assert.equal(
    nameSimilarity(normalizeName("Pérez, Ana"), normalizeName("Ana María Pérez")),
    1,
  );
  assert.ok(
    nameSimilarity(
      normalizeName("Estevez, Marcela"),
      normalizeName("ESTEVES MARCELA"),
    ) >= 0.66,
  );
  assert.ok(
    nameSimilarity(
      normalizeName("Cabrera, Andrea Viviana"),
      normalizeName("VIVIANA CABRERA"),
    ) >= 0.66,
  );
  assert.ok(accountsMatch("2201000003488706300", "3488706300"));
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

test("vincula el sueldo BPS cuando la misma cédula tiene canasta u otro concepto", () => {
  const ls = baseExtraction("LIQUIDACION_ODOO");
  const odoo = odooEntry();
  odoo.concept = field("Salario mensual");
  odoo.concept_code = field(null);
  odoo.nominal = {
    ...odoo.nominal,
    original: "80.013,34",
  };
  ls.odoo_entries.push(odoo);

  const payroll = baseExtraction("NOMINA");
  const sueldo = payrollEntry();
  sueldo.full_name = field("ESTEVES MARCELA");
  sueldo.nominal = { ...sueldo.nominal, original: "78.297,34" };
  const canasta = payrollEntry();
  canasta.concept = field("5");
  canasta.concept_code = field("5");
  canasta.nominal = { ...canasta.nominal, original: "1.716,00" };
  canasta.full_name = field("ESTEVES MARCELA");
  payroll.payroll_entries.push(sueldo, canasta);

  const receipts = baseExtraction("RECIBO_SUELDO");
  const receipt = receiptEntry();
  receipt.full_name = field("ESTEVES - MARCELA");
  receipt.nominal = { ...receipt.nominal, original: "80.013,34" };
  receipt.net = { ...receipt.net, original: "24.842,00" };
  receipts.receipts.push(receipt);

  const result = buildResultFromExtractions(
    {
      organization: "Empresa Demo S.A.",
      period: "2026-08",
      roundingTolerance: 1,
      observations: "",
    },
    [
      document("ls", "ls.pdf", "LS", ls),
      document("payroll", "nomina.pdf", "Nómina", payroll),
      document("receipts", "recibo.pdf", "Recibos", receipts),
    ],
    [],
  );

  const record = result.workers[0]?.employment_records[0];
  assert.equal(record?.payroll?.concept_code.original, "1");
  assert.equal(record?.payroll?.nominal.normalized, 78297.34);
  assert.equal(record?.receipt?.net.normalized, 24842);
  assert.equal(record?.nominal_differences.odoo_payroll, -1716);
});

test("el informe usa las columnas y el estado de la planilla de la contadora", () => {
  const ls = baseExtraction("LIQUIDACION_ODOO");
  const odoo = odooEntry();
  odoo.full_name = field("Estevez, Marcela");
  odoo.document_number = field("26217784");
  odoo.category = field("G20-03 COORDINADOR/A 3951/2024, 2825/2025");
  odoo.concept = field("Salario mensual");
  odoo.concept_code = field(null);
  odoo.hours_worked = field("128.55");
  odoo.nominal = { ...odoo.nominal, original: "80.013,34" };
  ls.odoo_entries.push(odoo);

  const payroll = baseExtraction("NOMINA");
  const sueldo = payrollEntry();
  sueldo.document_number = field("26217784");
  sueldo.nominal = { ...sueldo.nominal, original: "78.297,34" };
  payroll.payroll_entries.push(sueldo);

  const receipts = baseExtraction("RECIBO_SUELDO");
  const receipt = receiptEntry();
  receipt.document_number = field("26217784");
  receipt.nominal = { ...receipt.nominal, original: "80.013,34" };
  receipt.net = { ...receipt.net, original: "24.842,00" };
  receipts.receipts.push(receipt);

  const bank = baseExtraction("COMPROBANTE_TRANSFERENCIAS");
  bank.transfers.push(transferEntry("4.842,00", "PAGO_DE_SALDO"));
  bank.transfers[0]!.beneficiary = field("MARCELA ESTEVES");

  const result = buildResultFromExtractions(
    {
      organization: "Empresa Demo S.A.",
      period: "2026-02",
      roundingTolerance: 1,
      observations: "",
    },
    [
      document("ls", "ls.pdf", "LS", ls),
      document("payroll", "nomina.pdf", "Nómina", payroll),
      document("receipts", "recibo.pdf", "Recibos", receipts),
      document("bank", "banco.pdf", "Transferencias", bank),
    ],
    [],
  );

  const rows = buildAccountantReportRows(result);
  assert.deepEqual([...ACCOUNTANT_REPORT_HEADERS], [
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
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.empleado, "26217784 - Estevez, Marcela");
  assert.equal(
    rows[0]?.categoriaMides,
    "G20-03 COORDINADOR/A 3951/2024, 2825/2025",
  );
  assert.equal(rows[0]?.concepto, "Salario mensual");
  assert.equal(rows[0]?.horasMensuales, "128.55");
  assert.equal(rows[0]?.importeNominalLs, 80013.34);
  assert.equal(rows[0]?.importeNominalRecibo, 80013.34);
  assert.equal(rows[0]?.importeNomina, 78297.34);
  assert.equal(rows[0]?.reciboLiquido, 24842);
  assert.equal(rows[0]?.transferencia, 4842);
  assert.equal(rows[0]?.diferenciaNominalReciboNomina, 1716);
  assert.equal(rows[0]?.diferenciaLiquidoReciboTransferencia, 20000);
  assert.equal(rows[0]?.diferenciaNominalReciboLs, 0);
  assert.equal(
    rows[0]?.estado,
    "falta transferencia/ nomina menor que el recibo",
  );
});

test("asocia el saldo bancario aunque el nombre use el segundo nombre o un prefijo de cuenta", () => {
  const ls = baseExtraction("LIQUIDACION_ODOO");
  const odoo = odooEntry();
  odoo.full_name = field("Cabrera, Andrea");
  odoo.document_number = field("4.595.502-2");
  ls.odoo_entries.push(odoo);

  const receipts = baseExtraction("RECIBO_SUELDO");
  const receipt = receiptEntry();
  receipt.full_name = field("CABRERA ANDREA VIVIANA");
  receipt.document_number = field("45955022");
  receipt.account = field("3488706300");
  receipt.net = { ...receipt.net, original: "35.919,00" };
  receipts.receipts.push(receipt);

  const bank = baseExtraction("COMPROBANTE_TRANSFERENCIAS");
  bank.transfers.push({
    beneficiary: field("VIVIANA CABRERA"),
    document_number: field(null),
    account: field("2201000003488706300"),
    amount: {
      original: "15.919,00",
      confidence: 0.98,
      page: 1,
      evidence: "15.919,00",
      currency: "UYU",
    },
    payment_date: field("06/04/2026"),
    bank: field("Cuenta"),
    transaction_reference: field(null),
    payment_status: field("Enviados"),
    payment_type: "PAGO_DE_SALDO",
  });

  const result = buildResultFromExtractions(
    {
      organization: "Empresa Demo S.A.",
      period: "2026-08",
      roundingTolerance: 1,
      observations: "",
    },
    [
      document("ls", "ls.pdf", "LS", ls),
      document("receipts", "recibo.pdf", "Recibos", receipts),
      document("bank", "scotia.pdf", "Transferencias", bank),
    ],
    [],
  );

  const record = result.workers[0]?.employment_records[0];
  assert.equal(record?.transfers.length, 1);
  assert.equal(record?.transfers[0]?.amount.normalized, 15919);
  assert.equal(record?.transfer_difference, -20000);
});

test("recupera las filas de un comprobante de sueldos si el modelo solo extrae la primera", () => {
  const partial = baseExtraction("COMPROBANTE_TRANSFERENCIAS");
  partial.transfers.push({
    beneficiary: field("MARCELA ESTEVES"),
    document_number: field(null),
    account: field("2201000001331594900"),
    amount: {
      original: "4.842,00",
      confidence: 0.99,
      page: 1,
      evidence: "4.842,00",
      currency: "UYU",
    },
    payment_date: field("06/04/2026"),
    bank: field("Cuenta"),
    transaction_reference: field(null),
    payment_status: field(null),
    payment_type: "NO_DETERMINADO",
  });

  const ocr = `Nro. total de pagos 10
06/04/2026 4.842,00 Cuenta 2201000001331594900 MARCELA ESTEVES N/A N/A
06/04/2026 35.616,00 Cuenta 2201000003460611000 FACUNDO MENDARO N/A N/A
06/04/2026 15.919,00 Cuenta 2201000003488706300 VIVIANA CABRERA N/A N/A`;

  const recovered = recoverTransfersFromOcr(partial, ocr);
  assert.equal(recovered.transfers.length, 3);
  assert.equal(parseTransferRowsFromOcr(ocr).length, 3);
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
