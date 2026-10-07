import { createHash } from "node:crypto";
import { findConceptRules } from "@/config/concept-codes";
import { extractDocument } from "@/lib/nominacheck/extract";
import {
  fieldFromRaw,
  moneyField,
  nameSimilarity,
  normalizeAccount,
  normalizeDocumentNumber,
  normalizeName,
  normalizePeriod,
  normalizeText,
  originalTextField,
  textField,
} from "@/lib/nominacheck/normalize";
import {
  nominaCheckResultSchema,
  type RawExtraction,
} from "@/lib/nominacheck/schema";
import type {
  ControlInput,
  DocumentRecord,
  EmploymentRecord,
  ExtractedField,
  GeneralStatus,
  Incident,
  MatchDetails,
  MoneyField,
  NominaCheckResult,
  OdooRecord,
  PayrollEntry,
  ReceiptRecord,
  SourceReference,
  TransferRecord,
  WorkerRecord,
} from "@/types/nominacheck";

export type ExtractedDocument = {
  id: string;
  fileName: string;
  category: string;
  extraction: RawExtraction;
};

const STATUS_PRIORITY: Record<GeneralStatus, number> = {
  CORRECTO: 0,
  CORRECTO_CON_REDONDEO: 1,
  CORRECTO_CON_OBSERVACION: 2,
  ADVERTENCIA: 3,
  REVISION_MANUAL: 4,
  DOCUMENTACION_INCOMPLETA: 5,
  ERROR: 6,
  NO_PROCESABLE: 7,
};

export async function processDocuments(
  control: ControlInput,
  files: File[],
): Promise<NominaCheckResult> {
  const prepared = await Promise.all(
    files.map(async (file) => ({
      id: await analysisDocumentId(file),
      file,
      fileName: file.name,
      category: "CLASIFICACION_AUTOMATICA",
    })),
  );
  const settled = await Promise.allSettled(
    prepared.map(async (document) => {
      const extraction = await extractDocument(
        document.file,
        control.organization,
        control.period,
        control.observations,
      );
      return {
        id: document.id,
        fileName: document.fileName,
        category: extraction.classification,
        extraction,
      };
    }),
  );

  const extracted = settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const failures = settled.flatMap((result, index) =>
    result.status === "rejected"
      ? [
          {
            document: prepared[index]!,
            reason: errorMessage(result.reason),
          },
        ]
      : [],
  );
  const result = buildResultFromExtractions(control, extracted, failures);
  return nominaCheckResultSchema.parse(result);
}

export function buildResultFromExtractions(
  control: ControlInput,
  documents: ExtractedDocument[],
  failures: Array<{
    document: { id: string; fileName: string; category: string };
    reason: string;
  }>,
): NominaCheckResult {
  const incidents: Incident[] = failures.map(({ document, reason }) => ({
    code: "DOCUMENTO_NO_PROCESABLE",
    severity: "ERROR",
    worker_id: null,
    employment_record_id: null,
    document_id: document.id,
    description: `No se pudo procesar ${document.fileName}: ${reason}`,
    evidence: [],
  }));

  const documentRecords = [
    ...documents.map(toDocumentRecord),
    ...failures.map(({ document, reason }) => ({
      document_id: document.id,
      filename: document.fileName,
      declared_category: document.category,
      classification: "NO_IDENTIFICADO" as const,
      period: emptyField<string>(),
      organization: emptyField<string>(),
      page_count: null,
      confidence: 0,
      warnings: [reason],
    })),
  ];
  const odooEntries = documents.flatMap(({ id, extraction }) =>
    extraction.odoo_entries.map((entry) => toOdooRecord(id, entry)),
  );
  const payrollEntries = documents.flatMap(({ id, extraction }) =>
    extraction.payroll_entries.map((entry, index) =>
      toPayrollEntry(id, entry, index),
    ),
  );
  const receipts = documents.flatMap(({ id, extraction }) =>
    extraction.receipts.map((entry, index) => toReceipt(id, entry, index)),
  );
  const transfers = documents.flatMap(({ id, extraction }) =>
    extraction.transfers.map((entry, index) => toTransfer(id, entry, index)),
  );
  const hasRequiredDocumentation =
    odooEntries.length > 0 &&
    payrollEntries.length > 0 &&
    receipts.length > 0 &&
    transfers.length > 0;

  addDocumentIncidents(control, documentRecords, incidents);

  const workers = buildWorkers(
    odooEntries,
    payrollEntries,
    receipts,
    transfers,
    control.roundingTolerance,
    incidents,
  );
  const usedPayroll = new Set(
    workers.flatMap((worker) =>
      worker.employment_records.flatMap((record) =>
        record.payroll ? [record.payroll.payroll_entry_id] : [],
      ),
    ),
  );
  const usedReceipts = new Set(
    workers.flatMap((worker) =>
      worker.employment_records.flatMap((record) =>
        record.receipt ? [record.receipt.receipt_id] : [],
      ),
    ),
  );
  const usedTransfers = new Set(
    workers.flatMap((worker) => [
      ...worker.unallocated_transfers.map((item) => item.transfer_id),
      ...worker.employment_records.flatMap((record) =>
        record.transfers.map((item) => item.transfer_id),
      ),
    ]),
  );
  const unmatchedPayroll = payrollEntries.filter(
    (entry) => !usedPayroll.has(entry.payroll_entry_id),
  );
  const unmatchedReceipts = receipts.filter(
    (entry) => !usedReceipts.has(entry.receipt_id),
  );
  const unmatchedTransfers = transfers.filter(
    (entry) => !usedTransfers.has(entry.transfer_id),
  );
  const workersNotInLs = [...unmatchedPayroll, ...unmatchedReceipts].filter(
    (record) => !personAppearsInLs(record, odooEntries),
  );
  const liquidationDocument = documents.find((document) =>
    ["LIQUIDACION_ODOO", "DOCUMENTO_MIXTO"].includes(
      document.extraction.classification,
    ),
  );

  for (const record of workersNotInLs) {
    incidents.push({
      code: "TRABAJADOR_NO_INCLUIDO_EN_LS",
      severity: "WARNING",
      worker_id: null,
      employment_record_id: null,
      document_id: record.full_name.source?.document_id ?? null,
      description:
        "Se encontró una persona que no integra la población de la LS.",
      evidence: compactSources([record.full_name.source]),
    });
  }

  const possibleDuplicates = [
    ...detectReceiptRelations(receipts),
    ...detectDocumentDuplicates(documentRecords),
  ];
  const allEmploymentRecords = workers.flatMap(
    (worker) => worker.employment_records,
  );
  let proposedGeneralStatus =
    allEmploymentRecords.length > 0
      ? worstStatus(
          allEmploymentRecords.map((record) => record.proposed_status),
        )
      : "NO_PROCESABLE";
  if (
    failures.length &&
    STATUS_PRIORITY[proposedGeneralStatus] < STATUS_PRIORITY.REVISION_MANUAL
  ) {
    proposedGeneralStatus = "REVISION_MANUAL";
  }
  if (!odooEntries.length) {
    incidents.push({
      code: "LIQUIDACION_ODOO_FALTANTE",
      severity: "ERROR",
      worker_id: null,
      employment_record_id: null,
      document_id: null,
      description:
        "No se encontró una LS de Odoo procesable; no puede definirse la población.",
      evidence: [],
    });
    proposedGeneralStatus = "NO_PROCESABLE";
  } else if (
    incidents.some((incident) => incident.severity === "ERROR") &&
    STATUS_PRIORITY[proposedGeneralStatus] < STATUS_PRIORITY.ERROR
  ) {
    proposedGeneralStatus = "ERROR";
  }

  const firstOdoo = odooEntries[0] ?? null;
  const result: NominaCheckResult = {
    schema_version: "1.0",
    processing_status:
      documents.length === 0
        ? "FAILED"
        : failures.length > 0 || !hasRequiredDocumentation
          ? "PARTIAL"
          : "COMPLETED",
    organization: {
      name:
        firstOdoo?.organization ??
        syntheticField(
          control.organization,
          normalizeText(control.organization),
        ),
      normalized_name: normalizeText(
        firstOdoo?.organization.original ?? control.organization,
      ),
    },
    liquidation: {
      ls_id: firstOdoo?.ls_id ?? emptyField<string>(),
      type: firstOdoo?.type ?? emptyField<string>(),
      period:
        firstOdoo?.period ??
        syntheticField(control.period, normalizePeriod(control.period)),
      agreement: firstOdoo?.agreement ?? emptyField<string>(),
      is_amendment: firstOdoo?.is_amendment ?? emptyField<boolean>(),
      currency:
        odooEntries.map((item) => item.nominal.currency).find(Boolean) ?? null,
      declared_totals: {
        base_salary: liquidationDocument
          ? moneyField(
              liquidationDocument.id,
              liquidationDocument.extraction.liquidation_totals.base_salary,
            )
          : emptyMoney(),
        other_earnings: liquidationDocument
          ? moneyField(
              liquidationDocument.id,
              liquidationDocument.extraction.liquidation_totals.other_earnings,
            )
          : emptyMoney(),
        nominal: liquidationDocument
          ? moneyField(
              liquidationDocument.id,
              liquidationDocument.extraction.liquidation_totals.nominal,
            )
          : emptyMoney(),
        deductions: liquidationDocument
          ? moneyField(
              liquidationDocument.id,
              liquidationDocument.extraction.liquidation_totals.deductions,
            )
          : emptyMoney(),
        net: liquidationDocument
          ? moneyField(
              liquidationDocument.id,
              liquidationDocument.extraction.liquidation_totals.net,
            )
          : emptyMoney(),
      },
    },
    documents: documentRecords,
    workers,
    unmatched_records: {
      payroll_entries: unmatchedPayroll,
      receipts: unmatchedReceipts,
      transfers: unmatchedTransfers,
      workers_not_in_ls: workersNotInLs,
    },
    possible_duplicates: possibleDuplicates,
    incidents,
    summary: {
      workers_in_ls: workers.length,
      employment_records: allEmploymentRecords.length,
      correct: countStatus(allEmploymentRecords, "CORRECTO"),
      correct_with_rounding: countStatus(
        allEmploymentRecords,
        "CORRECTO_CON_REDONDEO",
      ),
      with_warnings: allEmploymentRecords.filter((record) =>
        ["ADVERTENCIA", "CORRECTO_CON_OBSERVACION"].includes(
          record.proposed_status,
        ),
      ).length,
      with_errors: countStatus(allEmploymentRecords, "ERROR"),
      incomplete: countStatus(allEmploymentRecords, "DOCUMENTACION_INCOMPLETA"),
      manual_review: countStatus(allEmploymentRecords, "REVISION_MANUAL"),
      unmatched_receipts: unmatchedReceipts.length,
      unmatched_transfers: unmatchedTransfers.length,
      proposed_general_status: proposedGeneralStatus,
    },
  };
  return result;
}

function buildWorkers(
  odooEntries: OdooRecord[],
  payrollEntries: PayrollEntry[],
  receipts: ReceiptRecord[],
  transfers: TransferRecord[],
  tolerance: number | null,
  incidents: Incident[],
) {
  const workerGroups = new Map<string, OdooRecord[]>();
  for (const odoo of odooEntries) {
    const key =
      odoo.document_number.normalized ??
      normalizeName(odoo.full_name.original) ??
      odoo.full_name.original ??
      `sin-identidad-${workerGroups.size}`;
    workerGroups.set(key, [...(workerGroups.get(key) ?? []), odoo]);
  }

  const usedPayroll = new Set<string>();
  const usedReceipts = new Set<string>();
  return [...workerGroups.entries()].map(([key, entries], workerIndex) => {
    const first = entries[0]!;
    const workerId = `worker-${workerIndex + 1}-${safeId(key)}`;
    const records = entries.map((odoo, recordIndex) => {
      const payrollMatch = chooseCandidate(
        odoo,
        payrollEntries.filter(
          (entry) => !usedPayroll.has(entry.payroll_entry_id),
        ),
      );
      const receiptMatch = chooseCandidate(
        odoo,
        receipts.filter((entry) => !usedReceipts.has(entry.receipt_id)),
      );
      if (
        payrollMatch.selected &&
        receiptMatch.selected &&
        !recordsAreCompatible(payrollMatch.selected, receiptMatch.selected)
      ) {
        payrollMatch.selected = null;
        receiptMatch.selected = null;
      }
      if (payrollMatch.selected) {
        usedPayroll.add(payrollMatch.selected.payroll_entry_id);
      }
      if (receiptMatch.selected) {
        usedReceipts.add(receiptMatch.selected.receipt_id);
      }
      const employmentRecordId = `${workerId}-record-${recordIndex + 1}`;
      const matching = combineMatchDetails(payrollMatch, receiptMatch);
      const record: EmploymentRecord = {
        employment_record_id: employmentRecordId,
        period: odoo.period,
        position: odoo.position,
        category: odoo.category,
        employment_accumulation: odoo.employment_accumulation,
        concept: preferredField(
          odoo.concept,
          payrollMatch.selected?.concept,
          receiptMatch.selected?.concept,
        ),
        concept_code: preferredField(
          odoo.concept_code,
          payrollMatch.selected?.concept_code,
          receiptMatch.selected?.concept_code,
        ),
        odoo,
        payroll: payrollMatch.selected,
        receipt: receiptMatch.selected,
        transfers: [],
        proposed_transfer_total: null,
        transfer_difference: null,
        nominal_differences: {
          odoo_payroll: difference(
            odoo.nominal.normalized,
            payrollMatch.selected?.nominal.normalized ?? null,
          ),
          payroll_receipt: difference(
            payrollMatch.selected?.nominal.normalized ?? null,
            receiptMatch.selected?.nominal.normalized ?? null,
          ),
        },
        matching,
        proposed_status: "CORRECTO",
        observations: [],
      };
      validateRequiredIds(record, workerId, incidents);
      validateConcept(record, workerId, incidents);
      return record;
    });

    const workerTransfers = transfers.filter((transfer) =>
      transferMatchesWorker(transfer, first, records),
    );
    const unallocatedTransfers = records.length > 1 ? workerTransfers : [];
    if (records.length === 1) records[0]!.transfers = workerTransfers;
    if (unallocatedTransfers.length) {
      incidents.push({
        code: "DISTRIBUCION_TRANSFERENCIAS_PENDIENTE",
        severity: "WARNING",
        worker_id: workerId,
        employment_record_id: null,
        document_id: unallocatedTransfers[0]?.source.document_id ?? null,
        description:
          "Las transferencias coinciden con el trabajador, pero no indican a cuál acumulación corresponden.",
        evidence: unallocatedTransfers.map((item) => item.source),
      });
      for (const record of records) {
        record.proposed_status = worstStatus([
          record.proposed_status,
          "REVISION_MANUAL",
        ]);
        record.observations.push(
          "La distribución de pagos entre acumulaciones requiere confirmación.",
        );
      }
    }

    for (const record of records) {
      reconcileRecord(record, tolerance, workerId, incidents);
    }
    return {
      worker_id: workerId,
      identity: {
        document_number: first.document_number,
        full_name: first.full_name,
      },
      employment_records: records,
      unallocated_transfers: unallocatedTransfers,
    } satisfies WorkerRecord;
  });
}

function reconcileRecord(
  record: EmploymentRecord,
  tolerance: number | null,
  workerId: string,
  incidents: Incident[],
) {
  const statuses: GeneralStatus[] = [record.proposed_status];
  if (!record.payroll || !record.receipt) {
    statuses.push("DOCUMENTACION_INCOMPLETA");
    record.observations.push(
      "No se encontró evidencia suficiente de nómina y recibo para esta acumulación.",
    );
    addRecordIncident(
      incidents,
      "DOCUMENTACION_FALTANTE",
      "WARNING",
      workerId,
      record,
      "Falta la nómina o el recibo necesario para completar la conciliación.",
    );
  }

  const nominalPairs: Array<
    [string, number | null, number | null, SourceReference | null]
  > = [
    [
      "LS y nómina",
      record.odoo?.nominal.normalized ?? null,
      record.payroll?.nominal.normalized ?? null,
      record.payroll?.nominal.source ?? null,
    ],
    [
      "nómina y recibo",
      record.payroll?.nominal.normalized ?? null,
      record.receipt?.nominal.normalized ?? null,
      record.receipt?.nominal.source ?? null,
    ],
    [
      "LS y recibo",
      record.odoo?.nominal.normalized ?? null,
      record.receipt?.nominal.normalized ?? null,
      record.receipt?.nominal.source ?? null,
    ],
  ];
  for (const [label, expected, actual, source] of nominalPairs) {
    if (expected === null || actual === null) continue;
    const delta = moneyDifference(expected, actual);
    if (delta === 0) continue;
    if (tolerance === null) {
      statuses.push("REVISION_MANUAL");
      record.observations.push(
        `Se detectó una diferencia nominal entre ${label} (${delta}) sin tolerancia configurada.`,
      );
    } else if (Math.abs(delta) <= tolerance) {
      statuses.push("CORRECTO_CON_REDONDEO");
      record.observations.push(`Diferencia nominal por redondeo: ${delta}.`);
    } else if (delta < 0) {
      statuses.push("ERROR");
      record.observations.push(
        `Se detectó una diferencia nominal de ${delta}.`,
      );
      addRecordIncident(
        incidents,
        "ERROR_NOMINAL",
        "ERROR",
        workerId,
        record,
        `El nominal extraído es inferior entre ${label}; diferencia: ${delta}.`,
        source,
      );
    } else {
      statuses.push("REVISION_MANUAL");
      record.observations.push(
        `El nominal superior (${delta}) podría corresponder a otra acumulación laboral.`,
      );
    }
  }

  const receiptNet = record.receipt?.net.normalized ?? null;
  if (!record.transfers.length) {
    statuses.push("DOCUMENTACION_INCOMPLETA");
    record.observations.push("No se encontraron transferencias asociadas.");
    addRecordIncident(
      incidents,
      "TRANSFERENCIA_FALTANTE",
      "WARNING",
      workerId,
      record,
      "No se encontraron transferencias asociadas al trabajador.",
    );
  } else {
    const total = centsToMoney(
      record.transfers.reduce(
        (sum, transfer) => sum + moneyToCents(transfer.amount.normalized),
        0,
      ),
    );
    record.proposed_transfer_total = total;
    if (receiptNet !== null) {
      const delta = moneyDifference(receiptNet, total);
      record.transfer_difference = delta;
      if (delta !== 0 && tolerance === null) {
        statuses.push("REVISION_MANUAL");
        record.observations.push(
          `Se detectó una diferencia de pago (${delta}) sin tolerancia configurada.`,
        );
      } else if (
        delta !== 0 &&
        tolerance !== null &&
        Math.abs(delta) <= tolerance
      ) {
        statuses.push("CORRECTO_CON_REDONDEO");
        record.observations.push(`Diferencia de pago por redondeo: ${delta}.`);
      } else if (delta < 0) {
        statuses.push("ERROR");
        record.observations.push(`Pago incompleto; diferencia: ${delta}.`);
        addRecordIncident(
          incidents,
          "ERROR_PAGO_INCOMPLETO",
          "ERROR",
          workerId,
          record,
          `El total transferido es inferior al líquido; diferencia: ${delta}.`,
          record.transfers[0]?.source,
        );
      } else if (delta > 0) {
        statuses.push("ADVERTENCIA");
        record.observations.push(
          `Pago superior al líquido; diferencia: ${delta}.`,
        );
        addRecordIncident(
          incidents,
          "ADVERTENCIA_PAGO_SUPERIOR",
          "WARNING",
          workerId,
          record,
          `El total transferido supera el líquido; diferencia: ${delta}.`,
          record.transfers[0]?.source,
        );
      }
    } else {
      statuses.push("DOCUMENTACION_INCOMPLETA");
    }

    for (const transfer of record.transfers) {
      if (
        paymentFallsOutsidePeriod(
          transfer.payment_date.original,
          record.period.normalized,
        )
      ) {
        statuses.push("CORRECTO_CON_OBSERVACION");
        record.observations.push(
          "La transferencia fue realizada fuera del mes liquidado.",
        );
        addRecordIncident(
          incidents,
          "FECHA_PAGO_FUERA_PERIODO",
          "INFO",
          workerId,
          record,
          "La fecha del pago no pertenece al mes de la liquidación.",
          transfer.payment_date.source,
        );
      }
    }
  }
  record.proposed_status = worstStatus(statuses);
}

function chooseCandidate<T extends PayrollEntry | ReceiptRecord>(
  odoo: OdooRecord,
  candidates: T[],
) {
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      ...evaluateCandidate(odoo, candidate),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const second = ranked[1];
  const unambiguous =
    best && best.score >= 0.6 && (!second || best.score - second.score >= 0.12);
  return {
    selected: unambiguous ? best.candidate : null,
    score: best?.score ?? 0,
    methods: best?.methods ?? [],
    alternatives: ranked.slice(0, 3),
  };
}

function evaluateCandidate(
  odoo: OdooRecord,
  candidate: PayrollEntry | ReceiptRecord,
) {
  const leftPeriod = odoo.period.normalized;
  const rightPeriod = candidate.period.normalized;
  if (leftPeriod && rightPeriod && leftPeriod !== rightPeriod) {
    return { score: 0, methods: [] as string[] };
  }

  const methods: string[] = [];
  let score = leftPeriod && rightPeriod ? 0.15 : 0;
  if (score > 0) methods.push("PERIODO");

  const leftOrganization = odoo.organization.normalized;
  const rightOrganization = candidate.organization.normalized;
  if (
    leftOrganization &&
    rightOrganization &&
    !organizationsMatch(leftOrganization, rightOrganization)
  ) {
    return { score: 0, methods: [] as string[] };
  }
  if (leftOrganization && rightOrganization) {
    score += 0.1;
    methods.push("ORGANIZACION");
  }

  const leftId = odoo.document_number.normalized;
  const rightId = candidate.document_number.normalized;
  if (leftId && rightId) {
    if (leftId !== rightId) return { score: 0, methods: [] as string[] };
    score += 0.65;
    methods.push("CEDULA");
  }
  const similarity = nameSimilarity(
    normalizeName(odoo.full_name.original),
    normalizeName(candidate.full_name.original),
  );
  if (similarity > 0) {
    score += similarity * 0.3;
    methods.push("NOMBRE");
  }
  if (
    odoo.employment_accumulation.normalized &&
    odoo.employment_accumulation.normalized ===
      candidate.employment_accumulation.normalized
  ) {
    score += 0.1;
    methods.push("ACUMULACION");
  }
  if (
    odoo.concept_code.normalized &&
    odoo.concept_code.normalized === candidate.concept_code.normalized
  ) {
    score += 0.1;
    methods.push("CONCEPTO");
  }
  if (
    odoo.nominal.normalized !== null &&
    candidate.nominal.normalized !== null &&
    moneyEquals(odoo.nominal.normalized, candidate.nominal.normalized)
  ) {
    score += 0.1;
    methods.push("IMPORTE_NOMINAL");
  }
  return { score: Math.min(score, 1), methods };
}

function transferMatchesWorker(
  transfer: TransferRecord,
  worker: OdooRecord,
  records: EmploymentRecord[],
) {
  const transferId = transfer.document_number.normalized;
  const workerId = worker.document_number.normalized;
  if (transferId && workerId) return transferId === workerId;
  const similarity = nameSimilarity(
    normalizeName(transfer.beneficiary.original),
    normalizeName(worker.full_name.original),
  );
  if (similarity >= 0.66) return true;

  const transferAccount = normalizeAccount(transfer.account.original);
  const accountMatches = records.some(
    (record) =>
      transferAccount && record.receipt?.account.normalized === transferAccount,
  );
  if (accountMatches) return true;

  const amountMatches = records.some((record) => {
    const transferAmount = transfer.amount.normalized;
    const receiptNet = record.receipt?.net.normalized;
    return (
      transferAmount !== null &&
      receiptNet !== null &&
      receiptNet !== undefined &&
      moneyEquals(transferAmount, receiptNet)
    );
  });
  return similarity >= 0.45 && amountMatches;
}

function combineMatchDetails(
  payroll: ReturnType<typeof chooseCandidate<PayrollEntry>>,
  receipt: ReturnType<typeof chooseCandidate<ReceiptRecord>>,
): MatchDetails {
  const selectedScores = [
    payroll.selected ? payroll.score : null,
    receipt.selected ? receipt.score : null,
  ].filter((score): score is number => score !== null);
  const matchingMethods = new Set<string>([
    ...(payroll.selected ? payroll.methods : []),
    ...(receipt.selected ? receipt.methods : []),
  ]);
  const alternatives = [
    ...payroll.alternatives.map(({ candidate, score }) => ({
      record_id: candidate.payroll_entry_id,
      confidence: score,
      reason: "Candidato de nómina",
    })),
    ...receipt.alternatives.map(({ candidate, score }) => ({
      record_id: candidate.receipt_id,
      confidence: score,
      reason: "Candidato de recibo",
    })),
  ];
  return {
    confidence: selectedScores.length
      ? Math.min(...selectedScores)
      : Math.max(payroll.score, receipt.score),
    matching_method: [...matchingMethods],
    matching_evidence: compactSources([
      payroll.selected?.full_name.source,
      receipt.selected?.full_name.source,
    ]),
    requires_human_confirmation:
      !payroll.selected || !receipt.selected || alternatives.length > 2,
    alternative_matches: alternatives.filter(
      ({ record_id }) =>
        record_id !== payroll.selected?.payroll_entry_id &&
        record_id !== receipt.selected?.receipt_id,
    ),
  };
}

function recordsAreCompatible(payroll: PayrollEntry, receipt: ReceiptRecord) {
  const comparablePairs = [
    [payroll.document_number.normalized, receipt.document_number.normalized],
    [payroll.period.normalized, receipt.period.normalized],
    [
      payroll.employment_accumulation.normalized,
      receipt.employment_accumulation.normalized,
    ],
    [payroll.concept_code.normalized, receipt.concept_code.normalized],
  ];
  return comparablePairs.every(
    ([left, right]) => !left || !right || left === right,
  );
}

function personAppearsInLs(
  record: PayrollEntry | ReceiptRecord,
  odooEntries: OdooRecord[],
) {
  return odooEntries.some((odoo) => {
    const leftId = odoo.document_number.normalized;
    const rightId = record.document_number.normalized;
    if (leftId && rightId && leftId === rightId) return true;
    return (
      nameSimilarity(
        normalizeName(odoo.full_name.original),
        normalizeName(record.full_name.original),
      ) >= 0.5
    );
  });
}

function organizationsMatch(left: string, right: string) {
  if (left === right || left.includes(right) || right.includes(left)) {
    return true;
  }
  return nameSimilarity(normalizeName(left), normalizeName(right)) >= 0.6;
}

function preferredField<T>(
  ...fields: Array<ExtractedField<T> | null | undefined>
) {
  return (
    fields.find((field): field is ExtractedField<T> =>
      Boolean(field && (field.normalized !== null || field.original !== null)),
    ) ??
    fields.find((field): field is ExtractedField<T> => Boolean(field)) ??
    emptyField<T>()
  );
}

function validateRequiredIds(
  record: EmploymentRecord,
  workerId: string,
  incidents: Incident[],
) {
  const candidates = [
    record.odoo?.document_number,
    record.payroll?.document_number,
    record.receipt?.document_number,
  ];
  for (const field of candidates) {
    if (field && !field.normalized) {
      record.proposed_status = worstStatus([
        record.proposed_status,
        "DOCUMENTACION_INCOMPLETA",
      ]);
      incidents.push({
        code: "CEDULA_OBLIGATORIA_FALTANTE",
        severity: "WARNING",
        worker_id: workerId,
        employment_record_id: record.employment_record_id,
        document_id: field.source?.document_id ?? null,
        description:
          "No se encontró una cédula legible en un documento obligatorio.",
        evidence: compactSources([field.source]),
      });
    }
  }
}

function validateConcept(
  record: EmploymentRecord,
  workerId: string,
  incidents: Incident[],
) {
  const code = record.concept_code.normalized;
  const amendment = record.odoo?.is_amendment.normalized ?? null;
  if (!code) {
    record.proposed_status = worstStatus([
      record.proposed_status,
      "REVISION_MANUAL",
    ]);
    record.observations.push(
      "No se encontró un código de concepto para validar la rendición.",
    );
    incidents.push({
      code: "CONCEPTO_FALTANTE",
      severity: "WARNING",
      worker_id: workerId,
      employment_record_id: record.employment_record_id,
      document_id: record.concept.source?.document_id ?? null,
      description:
        "No se encontró un código de concepto visible en LS, nómina o recibo.",
      evidence: compactSources([record.concept.source]),
    });
    return;
  }
  const rules = findConceptRules(code, amendment);
  if (rules.length === 0) {
    record.proposed_status = worstStatus([
      record.proposed_status,
      "REVISION_MANUAL",
    ]);
    record.observations.push(
      "El concepto no está incluido en el codificador admitido.",
    );
    incidents.push({
      code: "CONCEPTO_NO_ADMITIDO",
      severity: "WARNING",
      worker_id: workerId,
      employment_record_id: record.employment_record_id,
      document_id: record.concept_code.source?.document_id ?? null,
      description:
        "El código visible no corresponde a un concepto admitido por el control.",
      evidence: compactSources([record.concept_code.source]),
    });
  } else if (
    rules.length !== 1 ||
    rules.some((rule) => rule.requiresConfirmation)
  ) {
    record.proposed_status = worstStatus([
      record.proposed_status,
      "REVISION_MANUAL",
    ]);
    record.observations.push(
      "La equivalencia entre código y concepto requiere confirmación.",
    );
    incidents.push({
      code: "CODIGO_CONCEPTO_AMBIGUO",
      severity: "WARNING",
      worker_id: workerId,
      employment_record_id: record.employment_record_id,
      document_id: record.concept_code.source?.document_id ?? null,
      description:
        "No existe una equivalencia única y confirmada para el código visible.",
      evidence: compactSources([record.concept_code.source]),
    });
  }
}

function addDocumentIncidents(
  control: ControlInput,
  documents: DocumentRecord[],
  incidents: Incident[],
) {
  const expectedPeriod = normalizePeriod(control.period);
  const expectedOrganization = normalizeText(control.organization);
  for (const document of documents) {
    for (const warning of document.warnings) {
      incidents.push({
        code: /ilegible/i.test(warning)
          ? "CAMPO_ILEGIBLE"
          : "ADVERTENCIA_DOCUMENTAL",
        severity: "WARNING",
        worker_id: null,
        employment_record_id: null,
        document_id: document.document_id,
        description: warning,
        evidence: [],
      });
    }
    if (
      document.period.normalized &&
      expectedPeriod &&
      document.period.normalized !== expectedPeriod &&
      document.classification !== "COMPROBANTE_TRANSFERENCIAS"
    ) {
      incidents.push({
        code: "PERIODO_INCOMPATIBLE",
        severity: "ERROR",
        worker_id: null,
        employment_record_id: null,
        document_id: document.document_id,
        description:
          "El período del documento no coincide con el período de la LS.",
        evidence: compactSources([document.period.source]),
      });
    }
    if (
      document.organization.normalized &&
      expectedOrganization &&
      !organizationsMatch(
        document.organization.normalized,
        expectedOrganization,
      )
    ) {
      incidents.push({
        code: "ORGANIZACION_INCOMPATIBLE",
        severity: "ERROR",
        worker_id: null,
        employment_record_id: null,
        document_id: document.document_id,
        description:
          "La organización visible en el documento no coincide con el control.",
        evidence: compactSources([document.organization.source]),
      });
    }
    if (document.classification === "DOCUMENTO_MIXTO") {
      const isMultiperiod = document.warnings.some((warning) =>
        /multi.*per[ií]odo|varios? per[ií]odos?/i.test(warning),
      );
      incidents.push({
        code: isMultiperiod ? "DOCUMENTO_MULTIPERIODO" : "DOCUMENTO_MIXTO",
        severity: "WARNING",
        worker_id: null,
        employment_record_id: null,
        document_id: document.document_id,
        description: isMultiperiod
          ? "El archivo contiene más de un período."
          : "El archivo contiene más de una categoría documental.",
        evidence: compactSources([document.period.source]),
      });
    }
  }
}

function detectReceiptRelations(receipts: ReceiptRecord[]) {
  const groups = new Map<string, ReceiptRecord[]>();
  for (const receipt of receipts) {
    const key = [
      receipt.document_number.normalized ??
        receipt.full_name.normalized ??
        receipt.receipt_id,
      receipt.period.normalized,
    ].join("|");
    groups.set(key, [...(groups.get(key) ?? []), receipt]);
  }
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => {
      const first = group[0]!;
      const sameEssentials = group.every(
        (item) =>
          item.nominal.normalized === first.nominal.normalized &&
          item.net.normalized === first.net.normalized &&
          item.employment_accumulation.normalized ===
            first.employment_accumulation.normalized,
      );
      const hasEnoughToDifferentiate = group.every(
        (item) =>
          (item.employment_accumulation.normalized ||
            item.position.normalized) &&
          item.nominal.normalized !== null &&
          item.net.normalized !== null,
      );
      const classification = sameEssentials
        ? ("DUPLICADO_PROBABLE" as const)
        : hasEnoughToDifferentiate
          ? ("MULTIPLES_ACUMULACIONES_POSIBLES" as const)
          : ("REQUIERE_REVISION" as const);
      return {
        classification,
        record_ids: group.map((item) => item.receipt_id),
        description: sameEssentials
          ? "Los recibos comparten trabajador, período, acumulación, nominal y líquido; no fueron eliminados."
          : hasEnoughToDifferentiate
            ? "Hay varios recibos del trabajador y período con datos diferentes; podrían corresponder a acumulaciones distintas."
            : "No hay información suficiente para determinar si los recibos son duplicados o corresponden a acumulaciones diferentes.",
      };
    });
}

function detectDocumentDuplicates(documents: DocumentRecord[]) {
  const groups = new Map<string, DocumentRecord[]>();
  for (const document of documents) {
    groups.set(document.document_id, [
      ...(groups.get(document.document_id) ?? []),
      document,
    ]);
  }
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      classification: "DUPLICADO_PROBABLE" as const,
      record_ids: group.map((item) => item.document_id),
      description: "El mismo archivo podría haberse cargado más de una vez.",
    }));
}

function toDocumentRecord(document: ExtractedDocument): DocumentRecord {
  const { extraction } = document;
  return {
    document_id: document.id,
    filename: document.fileName,
    declared_category: document.category,
    classification: extraction.classification,
    period: fieldFromRaw(document.id, extraction.period, normalizePeriod),
    organization: textField(document.id, extraction.organization),
    page_count: extraction.page_count,
    confidence: extraction.classification_confidence,
    warnings: extraction.warnings,
  };
}

function toOdooRecord(
  documentId: string,
  raw: RawExtraction["odoo_entries"][number],
): OdooRecord {
  return {
    ls_id: originalTextField(documentId, raw.ls_id),
    type: textField(documentId, raw.type),
    period: fieldFromRaw(documentId, raw.period, normalizePeriod),
    organization: textField(documentId, raw.organization),
    agreement: originalTextField(documentId, raw.agreement),
    financing_source: originalTextField(documentId, raw.financing_source),
    is_amendment: fieldFromRaw(documentId, raw.is_amendment, parseBoolean),
    document_number: fieldFromRaw(
      documentId,
      raw.document_number,
      normalizeDocumentNumber,
    ),
    full_name: fieldFromRaw(documentId, raw.full_name, normalizeName),
    contract_type: textField(documentId, raw.contract_type),
    position: textField(documentId, raw.position),
    category: textField(documentId, raw.category),
    employment_accumulation: textField(documentId, raw.employment_accumulation),
    concept: textField(documentId, raw.concept),
    concept_code: originalTextField(documentId, raw.concept_code),
    hours_worked: fieldFromRaw(documentId, raw.hours_worked, parseNumber),
    base_salary: moneyField(documentId, raw.base_salary),
    other_earnings: moneyField(documentId, raw.other_earnings),
    nominal: moneyField(documentId, raw.nominal),
    bps: moneyField(documentId, raw.bps),
    irpf: moneyField(documentId, raw.irpf),
    fonasa: moneyField(documentId, raw.fonasa),
    frl: moneyField(documentId, raw.frl),
    other_deductions: moneyField(documentId, raw.other_deductions),
    net: moneyField(documentId, raw.net),
  };
}

function toPayrollEntry(
  documentId: string,
  raw: RawExtraction["payroll_entries"][number],
  index: number,
): PayrollEntry {
  return {
    payroll_entry_id: `${documentId}-payroll-${index + 1}`,
    period: fieldFromRaw(documentId, raw.period, normalizePeriod),
    organization: textField(documentId, raw.organization),
    document_number: fieldFromRaw(
      documentId,
      raw.document_number,
      normalizeDocumentNumber,
    ),
    full_name: fieldFromRaw(documentId, raw.full_name, normalizeName),
    position: textField(documentId, raw.position),
    category: textField(documentId, raw.category),
    employment_accumulation: textField(documentId, raw.employment_accumulation),
    concept: textField(documentId, raw.concept),
    concept_code: originalTextField(documentId, raw.concept_code),
    nominal: moneyField(documentId, raw.nominal),
  };
}

function toReceipt(
  documentId: string,
  raw: RawExtraction["receipts"][number],
  index: number,
): ReceiptRecord {
  return {
    receipt_id:
      raw.receipt_id.original?.trim() || `${documentId}-receipt-${index + 1}`,
    period: fieldFromRaw(documentId, raw.period, normalizePeriod),
    organization: textField(documentId, raw.organization),
    document_number: fieldFromRaw(
      documentId,
      raw.document_number,
      normalizeDocumentNumber,
    ),
    full_name: fieldFromRaw(documentId, raw.full_name, normalizeName),
    position: textField(documentId, raw.position),
    category: textField(documentId, raw.category),
    employment_accumulation: textField(documentId, raw.employment_accumulation),
    concept: textField(documentId, raw.concept),
    concept_code: originalTextField(documentId, raw.concept_code),
    account: fieldFromRaw(documentId, raw.account, normalizeAccount),
    nominal: moneyField(documentId, raw.nominal),
    net: moneyField(documentId, raw.net),
  };
}

function toTransfer(
  documentId: string,
  raw: RawExtraction["transfers"][number],
  index: number,
): TransferRecord {
  const source = {
    document_id: documentId,
    page: raw.amount.page,
    evidence: raw.amount.evidence,
  };
  return {
    transfer_id: `${documentId}-transfer-${index + 1}`,
    payment_type: raw.payment_type,
    beneficiary: fieldFromRaw(documentId, raw.beneficiary, normalizeName),
    document_number: fieldFromRaw(
      documentId,
      raw.document_number,
      normalizeDocumentNumber,
    ),
    account: originalTextField(documentId, raw.account),
    amount: moneyField(documentId, raw.amount),
    payment_date: originalTextField(documentId, raw.payment_date),
    bank: textField(documentId, raw.bank),
    transaction_reference: originalTextField(
      documentId,
      raw.transaction_reference,
    ),
    payment_status: textField(documentId, raw.payment_status),
    source,
    confidence: Math.min(raw.beneficiary.confidence, raw.amount.confidence),
  };
}

function syntheticField<T>(
  original: string,
  normalized: T | null,
): ExtractedField<T> {
  return {
    original,
    normalized,
    confidence: 1,
    source: null,
  };
}

function emptyField<T>(): ExtractedField<T> {
  return { original: null, normalized: null, confidence: 0, source: null };
}

function emptyMoney(): MoneyField {
  return {
    ...emptyField<number>(),
    currency: null,
    separators: null,
  };
}

function parseBoolean(value: string | null) {
  if (!value) return null;
  if (/^(sí|si|true|rectificativa)$/i.test(value.trim())) return true;
  if (/^(no|false)$/i.test(value.trim())) return false;
  return null;
}

function parseNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function difference(left: number | null, right: number | null) {
  return left === null || right === null ? null : moneyDifference(left, right);
}

function moneyToCents(value: number | null) {
  return value === null ? 0 : Math.round(value * 100);
}

function centsToMoney(value: number) {
  return value / 100;
}

function moneyDifference(expected: number, actual: number) {
  return centsToMoney(moneyToCents(actual) - moneyToCents(expected));
}

function moneyEquals(left: number, right: number) {
  return moneyToCents(left) === moneyToCents(right);
}

function paymentFallsOutsidePeriod(
  paymentDate: string | null,
  period: string | null,
) {
  if (!paymentDate || !period || !/^\d{4}-\d{2}$/.test(period)) return false;
  const iso = paymentDate.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])\b/);
  const local = paymentDate.match(
    /\b\d{1,2}[-/](0?[1-9]|1[0-2])[-/](20\d{2})\b/,
  );
  const paymentPeriod = iso
    ? `${iso[1]}-${iso[2]!.padStart(2, "0")}`
    : local
      ? `${local[2]}-${local[1]!.padStart(2, "0")}`
      : null;
  return paymentPeriod !== null && paymentPeriod !== period;
}

function addRecordIncident(
  incidents: Incident[],
  code: string,
  severity: Incident["severity"],
  workerId: string,
  record: EmploymentRecord,
  description: string,
  source?: SourceReference | null,
) {
  incidents.push({
    code,
    severity,
    worker_id: workerId,
    employment_record_id: record.employment_record_id,
    document_id:
      source?.document_id ?? record.odoo?.full_name.source?.document_id ?? null,
    description,
    evidence: compactSources([source]),
  });
}

function worstStatus(statuses: GeneralStatus[]): GeneralStatus {
  return statuses.reduce((worst, status) =>
    STATUS_PRIORITY[status] > STATUS_PRIORITY[worst] ? status : worst,
  );
}

function countStatus(records: EmploymentRecord[], status: GeneralStatus) {
  return records.filter((record) => record.proposed_status === status).length;
}

function compactSources(
  sources: Array<SourceReference | null | undefined>,
): SourceReference[] {
  return sources.filter((source): source is SourceReference => Boolean(source));
}

function safeId(value: string) {
  return value.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 24) || "unknown";
}

/**
 * Id que el motor le asigna a cada documento: deriva del contenido, así el
 * mismo archivo recibe siempre el mismo id y el resultado puede volver al
 * archivo guardado en el bucket.
 */
export async function analysisDocumentId(file: File) {
  const hash = createHash("sha256")
    .update(new Uint8Array(await file.arrayBuffer()))
    .digest("hex")
    .slice(0, 16);
  return `doc-${hash}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido";
}
