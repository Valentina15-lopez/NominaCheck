export type ProcessingStatus = "COMPLETED" | "PARTIAL" | "FAILED";

export type DocumentClassification =
  | "LIQUIDACION_ODOO"
  | "NOMINA"
  | "RECIBO_SUELDO"
  | "COMPROBANTE_TRANSFERENCIAS"
  | "DOCUMENTO_MIXTO"
  | "OTRO"
  | "NO_IDENTIFICADO";

export type GeneralStatus =
  | "CORRECTO"
  | "CORRECTO_CON_REDONDEO"
  | "CORRECTO_CON_OBSERVACION"
  | "ADVERTENCIA"
  | "ERROR"
  | "DOCUMENTACION_INCOMPLETA"
  | "REVISION_MANUAL"
  | "NO_PROCESABLE";

export type PaymentType =
  "PAGO_A_CUENTA" | "PAGO_DE_SALDO" | "PAGO_UNICO" | "NO_DETERMINADO";

export type SourceReference = {
  document_id: string;
  page: number | null;
  evidence: string | null;
};

export type ExtractedField<T> = {
  original: string | null;
  normalized: T | null;
  confidence: number;
  source: SourceReference | null;
  alternatives?: Array<{
    value: T | null;
    confidence: number;
    evidence: string | null;
  }>;
};

export type MoneyField = ExtractedField<number> & {
  currency: string | null;
  separators: string | null;
};

export type DocumentRecord = {
  document_id: string;
  filename: string;
  declared_category: string;
  classification: DocumentClassification;
  period: ExtractedField<string>;
  organization: ExtractedField<string>;
  page_count: number | null;
  confidence: number;
  warnings: string[];
};

export type OdooRecord = {
  ls_id: ExtractedField<string>;
  type: ExtractedField<string>;
  period: ExtractedField<string>;
  organization: ExtractedField<string>;
  agreement: ExtractedField<string>;
  financing_source: ExtractedField<string>;
  is_amendment: ExtractedField<boolean>;
  document_number: ExtractedField<string>;
  full_name: ExtractedField<string>;
  contract_type: ExtractedField<string>;
  position: ExtractedField<string>;
  category: ExtractedField<string>;
  employment_accumulation: ExtractedField<string>;
  concept: ExtractedField<string>;
  concept_code: ExtractedField<string>;
  hours_worked: ExtractedField<number>;
  base_salary: MoneyField;
  other_earnings: MoneyField;
  nominal: MoneyField;
  bps: MoneyField;
  irpf: MoneyField;
  fonasa: MoneyField;
  frl: MoneyField;
  other_deductions: MoneyField;
  net: MoneyField;
};

export type PayrollEntry = {
  payroll_entry_id: string;
  period: ExtractedField<string>;
  organization: ExtractedField<string>;
  document_number: ExtractedField<string>;
  full_name: ExtractedField<string>;
  position: ExtractedField<string>;
  category: ExtractedField<string>;
  employment_accumulation: ExtractedField<string>;
  concept: ExtractedField<string>;
  concept_code: ExtractedField<string>;
  nominal: MoneyField;
};

export type ReceiptRecord = {
  receipt_id: string;
  period: ExtractedField<string>;
  organization: ExtractedField<string>;
  document_number: ExtractedField<string>;
  full_name: ExtractedField<string>;
  position: ExtractedField<string>;
  category: ExtractedField<string>;
  employment_accumulation: ExtractedField<string>;
  concept: ExtractedField<string>;
  concept_code: ExtractedField<string>;
  account: ExtractedField<string>;
  nominal: MoneyField;
  net: MoneyField;
};

export type TransferRecord = {
  transfer_id: string;
  payment_type: PaymentType;
  beneficiary: ExtractedField<string>;
  document_number: ExtractedField<string>;
  account: ExtractedField<string>;
  amount: MoneyField;
  payment_date: ExtractedField<string>;
  bank: ExtractedField<string>;
  transaction_reference: ExtractedField<string>;
  payment_status: ExtractedField<string>;
  source: SourceReference;
  confidence: number;
};

export type MatchDetails = {
  confidence: number;
  matching_method: string[];
  matching_evidence: SourceReference[];
  requires_human_confirmation: boolean;
  alternative_matches: Array<{
    record_id: string;
    confidence: number;
    reason: string;
  }>;
};

export type EmploymentRecord = {
  employment_record_id: string;
  period: ExtractedField<string>;
  position: ExtractedField<string>;
  category: ExtractedField<string>;
  employment_accumulation: ExtractedField<string>;
  concept: ExtractedField<string>;
  concept_code: ExtractedField<string>;
  odoo: OdooRecord | null;
  payroll: PayrollEntry | null;
  receipt: ReceiptRecord | null;
  transfers: TransferRecord[];
  proposed_transfer_total: number | null;
  transfer_difference: number | null;
  nominal_differences: {
    odoo_payroll: number | null;
    payroll_receipt: number | null;
  };
  matching: MatchDetails;
  proposed_status: GeneralStatus;
  observations: string[];
};

export type WorkerRecord = {
  worker_id: string;
  identity: {
    document_number: ExtractedField<string>;
    full_name: ExtractedField<string>;
  };
  employment_records: EmploymentRecord[];
  unallocated_transfers: TransferRecord[];
};

export type Incident = {
  code: string;
  severity: "INFO" | "WARNING" | "ERROR";
  worker_id: string | null;
  employment_record_id: string | null;
  document_id: string | null;
  description: string;
  evidence: SourceReference[];
};

export type NominaCheckResult = {
  schema_version: "1.0";
  processing_status: ProcessingStatus;
  organization: {
    name: ExtractedField<string>;
    normalized_name: string | null;
  };
  liquidation: {
    ls_id: ExtractedField<string>;
    type: ExtractedField<string>;
    period: ExtractedField<string>;
    agreement: ExtractedField<string>;
    is_amendment: ExtractedField<boolean>;
    currency: string | null;
    declared_totals: {
      base_salary: MoneyField;
      other_earnings: MoneyField;
      nominal: MoneyField;
      deductions: MoneyField;
      net: MoneyField;
    };
  };
  documents: DocumentRecord[];
  workers: WorkerRecord[];
  unmatched_records: {
    payroll_entries: PayrollEntry[];
    receipts: ReceiptRecord[];
    transfers: TransferRecord[];
    workers_not_in_ls: Array<PayrollEntry | ReceiptRecord>;
  };
  possible_duplicates: Array<{
    classification:
      | "DUPLICADO_PROBABLE"
      | "MULTIPLES_ACUMULACIONES_POSIBLES"
      | "REQUIERE_REVISION";
    record_ids: string[];
    description: string;
  }>;
  incidents: Incident[];
  summary: {
    workers_in_ls: number;
    employment_records: number;
    correct: number;
    correct_with_rounding: number;
    with_warnings: number;
    with_errors: number;
    incomplete: number;
    manual_review: number;
    unmatched_receipts: number;
    unmatched_transfers: number;
    proposed_general_status: GeneralStatus;
  };
};

export type ControlInput = {
  organization: string;
  period: string;
  roundingTolerance: number | null;
  observations: string;
};

export type UploadedDocument = {
  id: string;
  file: File;
};
