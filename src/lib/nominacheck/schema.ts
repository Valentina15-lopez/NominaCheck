import { z } from "zod";
import type { NominaCheckResult } from "@/types/nominacheck";

const confidenceSchema = z.number().min(0).max(1);

export const rawFieldSchema = z.object({
  original: z.string().nullable(),
  confidence: confidenceSchema,
  page: z.number().int().positive().nullable(),
  evidence: z.string().nullable(),
  alternatives: z
    .array(
      z.object({
        value: z.string().nullable(),
        confidence: confidenceSchema,
        evidence: z.string().nullable(),
      }),
    )
    .optional(),
});

export const rawMoneySchema = rawFieldSchema.extend({
  currency: z.string().nullable(),
});

const identityFields = {
  document_number: rawFieldSchema,
  full_name: rawFieldSchema,
  period: rawFieldSchema,
  organization: rawFieldSchema,
  position: rawFieldSchema,
  category: rawFieldSchema,
  employment_accumulation: rawFieldSchema,
  concept: rawFieldSchema,
  concept_code: rawFieldSchema,
};

export const rawExtractionSchema = z.object({
  classification: z.enum([
    "LIQUIDACION_ODOO",
    "NOMINA",
    "RECIBO_SUELDO",
    "COMPROBANTE_TRANSFERENCIAS",
    "DOCUMENTO_MIXTO",
    "OTRO",
    "NO_IDENTIFICADO",
  ]),
  classification_confidence: confidenceSchema,
  period: rawFieldSchema,
  organization: rawFieldSchema,
  page_count: z.number().int().positive().nullable(),
  warnings: z.array(z.string()),
  liquidation_totals: z.object({
    base_salary: rawMoneySchema,
    other_earnings: rawMoneySchema,
    nominal: rawMoneySchema,
    deductions: rawMoneySchema,
    net: rawMoneySchema,
  }),
  odoo_entries: z.array(
    z.object({
      ...identityFields,
      ls_id: rawFieldSchema,
      type: rawFieldSchema,
      agreement: rawFieldSchema,
      financing_source: rawFieldSchema,
      is_amendment: rawFieldSchema,
      contract_type: rawFieldSchema,
      hours_worked: rawFieldSchema,
      base_salary: rawMoneySchema,
      other_earnings: rawMoneySchema,
      nominal: rawMoneySchema,
      bps: rawMoneySchema,
      irpf: rawMoneySchema,
      fonasa: rawMoneySchema,
      frl: rawMoneySchema,
      other_deductions: rawMoneySchema,
      net: rawMoneySchema,
    }),
  ),
  payroll_entries: z.array(
    z.object({
      ...identityFields,
      nominal: rawMoneySchema,
    }),
  ),
  receipts: z.array(
    z.object({
      ...identityFields,
      receipt_id: rawFieldSchema,
      account: rawFieldSchema,
      nominal: rawMoneySchema,
      net: rawMoneySchema,
    }),
  ),
  transfers: z.array(
    z.object({
      beneficiary: rawFieldSchema,
      document_number: rawFieldSchema,
      account: rawFieldSchema,
      amount: rawMoneySchema,
      payment_date: rawFieldSchema,
      bank: rawFieldSchema,
      transaction_reference: rawFieldSchema,
      payment_status: rawFieldSchema,
      payment_type: z.enum([
        "PAGO_A_CUENTA",
        "PAGO_DE_SALDO",
        "PAGO_UNICO",
        "NO_DETERMINADO",
      ]),
    }),
  ),
});

export type RawExtraction = z.infer<typeof rawExtractionSchema>;
export type RawField = z.infer<typeof rawFieldSchema>;
export type RawMoney = z.infer<typeof rawMoneySchema>;

const sourceSchema = z
  .object({
    document_id: z.string(),
    page: z.number().int().positive().nullable(),
    evidence: z.string().nullable(),
  })
  .nullable();

const extractedFieldSchema = z.object({
  original: z.string().nullable(),
  normalized: z.unknown().nullable(),
  confidence: confidenceSchema,
  source: sourceSchema,
  alternatives: z
    .array(
      z.object({
        value: z.unknown().nullable(),
        confidence: confidenceSchema,
        evidence: z.string().nullable(),
      }),
    )
    .optional(),
});

const moneyFieldSchema = extractedFieldSchema.extend({
  normalized: z.number().nullable(),
  currency: z.string().nullable(),
  separators: z.string().nullable(),
});

const finalStatusSchema = z.enum([
  "CORRECTO",
  "CORRECTO_CON_REDONDEO",
  "CORRECTO_CON_OBSERVACION",
  "ADVERTENCIA",
  "ERROR",
  "DOCUMENTACION_INCOMPLETA",
  "REVISION_MANUAL",
  "NO_PROCESABLE",
]);

/**
 * El contrato externo se valida en sus invariantes principales. Los registros
 * profundos ya fueron validados al extraerse y luego construidos por código
 * determinista, por lo que aquí se evita duplicar el schema completo.
 */
export const nominaCheckResultSchema: z.ZodType<NominaCheckResult> = z.object({
  schema_version: z.literal("1.0"),
  processing_status: z.enum(["COMPLETED", "PARTIAL", "FAILED"]),
  organization: z.object({
    name: extractedFieldSchema,
    normalized_name: z.string().nullable(),
  }),
  liquidation: z.object({
    ls_id: extractedFieldSchema,
    type: extractedFieldSchema,
    period: extractedFieldSchema,
    agreement: extractedFieldSchema,
    is_amendment: extractedFieldSchema,
    currency: z.string().nullable(),
    declared_totals: z.object({
      base_salary: moneyFieldSchema,
      other_earnings: moneyFieldSchema,
      nominal: moneyFieldSchema,
      deductions: moneyFieldSchema,
      net: moneyFieldSchema,
    }),
  }),
  documents: z.array(z.unknown()),
  workers: z.array(z.unknown()),
  unmatched_records: z.object({
    payroll_entries: z.array(z.unknown()),
    receipts: z.array(z.unknown()),
    transfers: z.array(z.unknown()),
    workers_not_in_ls: z.array(z.unknown()),
  }),
  possible_duplicates: z.array(z.unknown()),
  incidents: z.array(z.unknown()),
  summary: z.object({
    workers_in_ls: z.number().int().nonnegative(),
    employment_records: z.number().int().nonnegative(),
    correct: z.number().int().nonnegative(),
    correct_with_rounding: z.number().int().nonnegative(),
    with_warnings: z.number().int().nonnegative(),
    with_errors: z.number().int().nonnegative(),
    incomplete: z.number().int().nonnegative(),
    manual_review: z.number().int().nonnegative(),
    unmatched_receipts: z.number().int().nonnegative(),
    unmatched_transfers: z.number().int().nonnegative(),
    proposed_general_status: finalStatusSchema,
  }),
}) as z.ZodType<NominaCheckResult>;
