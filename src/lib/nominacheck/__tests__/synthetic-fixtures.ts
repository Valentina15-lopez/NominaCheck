import type {
  RawExtraction,
  RawField,
  RawMoney,
} from "@/lib/nominacheck/schema";

export const field = (original: string | null, page = 1): RawField => ({
  original,
  confidence: original === null ? 0 : 0.98,
  page,
  evidence: original,
});

export const money = (
  original: string | null,
  currency = "UYU",
  page = 1,
): RawMoney => ({
  ...field(original, page),
  currency: original === null ? null : currency,
});

export function baseExtraction(
  classification: RawExtraction["classification"],
): RawExtraction {
  return {
    classification,
    classification_confidence: 0.99,
    period: field("08/2026"),
    organization: field("Empresa Demo S.A."),
    page_count: 1,
    warnings: [],
    liquidation_totals: {
      base_salary: money(null),
      other_earnings: money(null),
      nominal: money(null),
      deductions: money(null),
      net: money(null),
    },
    odoo_entries: [],
    payroll_entries: [],
    receipts: [],
    transfers: [],
  };
}

export function odooEntry(accumulation = "Cargo A") {
  return {
    document_number: field("4.567.890-5"),
    full_name: field("Pérez, Ana María"),
    period: field("08/2026"),
    organization: field("Empresa Demo S.A."),
    position: field("Administración"),
    category: field("Auxiliar"),
    employment_accumulation: field(accumulation),
    concept: field("Sueldo"),
    concept_code: field("1"),
    ls_id: field("LS-100"),
    type: field("Mensual"),
    agreement: field("Convenio demo"),
    financing_source: field(null),
    is_amendment: field("No"),
    contract_type: field("Mensual"),
    hours_worked: field("160"),
    base_salary: money("60.000,00"),
    other_earnings: money("0,00"),
    nominal: money("60.000,00"),
    bps: money("0,00"),
    irpf: money("0,00"),
    fonasa: money("0,00"),
    frl: money("0,00"),
    other_deductions: money("10.000,00"),
    net: money("50.000,00"),
  };
}

export function payrollEntry(accumulation = "Cargo A") {
  return {
    document_number: field("45678905"),
    full_name: field("Ana Perez"),
    period: field("2026-08"),
    organization: field("Empresa Demo S.A."),
    position: field("Administración"),
    category: field("Auxiliar"),
    employment_accumulation: field(accumulation),
    concept: field("Sueldo"),
    concept_code: field("1"),
    nominal: money("60,000.00"),
  };
}

export function receiptEntry(accumulation = "Cargo A") {
  return {
    document_number: field("4 567 890 5"),
    full_name: field("Ana María Pérez"),
    period: field("Agosto 2026"),
    organization: field("Empresa Demo S.A."),
    position: field("Administración"),
    category: field("Auxiliar"),
    employment_accumulation: field(accumulation),
    concept: field("Sueldo"),
    concept_code: field("1"),
    receipt_id: field(null),
    account: field("001-123"),
    nominal: money("60.000,00"),
    net: money("50.000,00"),
  };
}

export function transferEntry(
  amount: string,
  type: "PAGO_A_CUENTA" | "PAGO_DE_SALDO",
) {
  return {
    beneficiary: field("ANA PEREZ"),
    document_number: field(null),
    account: field("001-123"),
    amount: money(amount),
    payment_date: field("05/09/2026"),
    bank: field("Banco Demo"),
    transaction_reference: field(null),
    payment_status: field("Procesado"),
    payment_type: type,
  };
}
