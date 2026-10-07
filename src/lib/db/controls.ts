import "server-only";
import { cache } from "react";
import {
  ACCEPTED_DOCUMENT_PATTERN,
  REQUIRED_DOCUMENT_KINDS,
} from "@/constants/nomina";
import { deriveWorkers } from "@/lib/nominacheck/derive-workers";
import { createClient } from "@/lib/supabase/server";
import type { NominaCheckResult } from "@/types/nominacheck";
import type {
  ControlDocument,
  ControlStatus,
  DocumentKind,
  NewControlInput,
  SalaryControl,
  Worker,
} from "@/types/nomina";

export const DOCUMENTS_BUCKET = "control-documents";
export const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024;

/** Error de negocio que las server actions traducen a un mensaje para la UI. */
export class ControlError extends Error {}

type ControlRow = {
  id: string;
  company: string;
  period: string;
  status: ControlStatus;
  rounding_tolerance: string | number | null;
  observations: string;
  general_status: string | null;
  processing_error: string | null;
  has_result: boolean;
  created_at: string;
};

type DocumentRow = {
  id: string;
  control_id: string;
  name: string;
  kind: DocumentKind;
  size: number;
  status: ControlDocument["status"];
  error: string | null;
  storage_path: string | null;
};

type WorkerRow = {
  id: string;
  control_id: string;
  document_number: string;
  full_name: string;
  role: string;
  status: Worker["status"];
  odoo_nominal: string | number;
  payroll_nominal: string | number | null;
  receipt_nominal: string | number | null;
  receipt_liquid: string | number | null;
  observation: string | null;
  reviewed: boolean;
};

type PaymentRow = {
  id: string;
  worker_id: string;
  kind: "receipt" | "transfer";
  name: string;
  amount: string | number;
  paid_on: string | null;
  reference: string | null;
  shared_with: string[];
  association_status: "confirmed" | "suggested" | "unassigned" | null;
  source_document_id: string | null;
};

const CONTROL_COLUMNS =
  "id, company, period, status, rounding_tolerance, observations, general_status, processing_error, has_result, created_at";

/**
 * Cacheada por request: varias funciones de este módulo se encadenan en una
 * misma operación y no tiene sentido validar la sesión contra Supabase en
 * cada una.
 */
const session = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ControlError("Iniciá sesión para continuar.");
  return { supabase, user };
});

function fail(action: string, error: { message: string } | null): never {
  console.error(`NóminaCheck · ${action}`, error);
  throw new ControlError(`No pudimos ${action}. Intentá nuevamente.`);
}

function toNumber(value: string | number | null) {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// --------------------------------------------------------------- lecturas

export async function listControls(): Promise<SalaryControl[]> {
  const { supabase } = await session();
  const { data: controls, error } = await supabase
    .from("controls")
    .select(CONTROL_COLUMNS)
    .order("created_at", { ascending: false })
    .returns<ControlRow[]>();
  if (error) fail("cargar tus controles", error);
  if (!controls.length) return [];

  const controlIds = controls.map((control) => control.id);
  const [documents, workers, payments] = await Promise.all([
    supabase
      .from("control_documents")
      .select("id, control_id, name, kind, size, status, error, storage_path")
      .in("control_id", controlIds)
      .order("created_at")
      .returns<DocumentRow[]>(),
    supabase
      .from("control_workers")
      .select(
        "id, control_id, document_number, full_name, role, status, odoo_nominal, payroll_nominal, receipt_nominal, receipt_liquid, observation, reviewed",
      )
      .in("control_id", controlIds)
      .order("sort_order")
      .returns<WorkerRow[]>(),
    supabase
      .from("control_payments")
      .select(
        "id, worker_id, kind, name, amount, paid_on, reference, shared_with, association_status, source_document_id",
      )
      .in("control_id", controlIds)
      .order("sort_order")
      .returns<PaymentRow[]>(),
  ]);
  if (documents.error) fail("cargar los documentos", documents.error);
  if (workers.error) fail("cargar los trabajadores", workers.error);
  if (payments.error) fail("cargar los pagos", payments.error);

  const paymentsByWorker = groupBy(payments.data, (row) => row.worker_id);
  const documentsByControl = groupBy(documents.data, (row) => row.control_id);
  const workersByControl = groupBy(workers.data, (row) => row.control_id);

  return controls.map((control) => ({
    id: control.id,
    company: control.company,
    period: control.period,
    status: control.status,
    createdAt: control.created_at,
    roundingTolerance: toNumber(control.rounding_tolerance),
    observations: control.observations,
    generalStatus: control.general_status,
    processingError: control.processing_error,
    hasResult: control.has_result,
    documents: (documentsByControl.get(control.id) ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      size: Number(row.size),
      status: row.status,
      error: row.error ?? undefined,
    })),
    workers: (workersByControl.get(control.id) ?? []).map((row) => {
      const workerPayments = paymentsByWorker.get(row.id) ?? [];
      return {
        id: row.id,
        documentNumber: row.document_number,
        name: row.full_name,
        role: row.role,
        status: row.status,
        odooNominal: toNumber(row.odoo_nominal) ?? 0,
        payrollNominal: toNumber(row.payroll_nominal) ?? undefined,
        receiptNominal: toNumber(row.receipt_nominal) ?? undefined,
        receiptLiquid: toNumber(row.receipt_liquid) ?? undefined,
        observation: row.observation ?? undefined,
        reviewed: row.reviewed,
        receipts: workerPayments
          .filter((payment) => payment.kind === "receipt")
          .map(toPaymentDocument),
        transfers: workerPayments
          .filter((payment) => payment.kind === "transfer")
          .map(toPaymentDocument),
      };
    }),
  }));
}

/** Empresas ya usadas por el contador, para ofrecerlas al crear un control. */
export async function listCompanies(): Promise<string[]> {
  const { supabase } = await session();
  const { data, error } = await supabase
    .from("controls")
    .select("company")
    .order("company")
    .returns<Array<{ company: string }>>();
  if (error) fail("cargar las empresas", error);
  return [...new Set(data.map((row) => row.company))];
}

/**
 * El NominaCheckResult completo junto a los datos del control. Se trae aparte
 * de listControls porque el JSON es grande y solo lo necesita el informe.
 */
export async function getControlReport(controlId: string) {
  const { supabase } = await session();
  const { data, error } = await supabase
    .from("controls")
    .select("company, period, rounding_tolerance, observations, result")
    .eq("id", controlId)
    .maybeSingle<{
      company: string;
      period: string;
      rounding_tolerance: string | number | null;
      observations: string;
      result: NominaCheckResult | null;
    }>();
  if (error) fail("cargar el informe del control", error);
  if (!data?.result) return null;

  return {
    result: data.result,
    control: {
      organization: data.company,
      period: data.period,
      roundingTolerance: toNumber(data.rounding_tolerance),
      observations: data.observations,
    },
  };
}

/**
 * Datos y archivos que necesita el motor. Los documentos se bajan del bucket
 * porque la corrida ocurre en otra request que la carga: los File del
 * navegador ya no existen.
 */
export async function getControlForAnalysis(controlId: string) {
  const { supabase } = await session();
  const { data: control, error } = await supabase
    .from("controls")
    .select("id, company, period, rounding_tolerance, observations, status")
    .eq("id", controlId)
    .maybeSingle<{
      id: string;
      company: string;
      period: string;
      rounding_tolerance: string | number | null;
      observations: string;
      status: ControlStatus;
    }>();
  if (error) fail("abrir el control", error);
  if (!control) throw new ControlError("El control solicitado no existe.");

  const documents = await supabase
    .from("control_documents")
    .select("id, name, storage_path")
    .eq("control_id", controlId)
    .neq("status", "error")
    .order("created_at")
    .returns<
      Array<{ id: string; name: string; storage_path: string | null }>
    >();
  if (documents.error) fail("cargar los documentos", documents.error);

  const stored = documents.data.filter((document) => document.storage_path);
  if (!stored.length) {
    throw new ControlError(
      "El control no tiene documentos guardados para analizar.",
    );
  }

  const files = await Promise.all(
    stored.map(async (document) => {
      const download = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .download(document.storage_path!);
      if (download.error) fail(`descargar ${document.name}`, download.error);
      return {
        documentId: document.id,
        file: new File([download.data], document.name, {
          type: download.data.type || "application/octet-stream",
        }),
      };
    }),
  );

  return {
    input: {
      organization: control.company,
      period: control.period,
      roundingTolerance: toNumber(control.rounding_tolerance),
      observations: control.observations,
    },
    files,
  };
}

// -------------------------------------------------------------- escrituras

export async function createControl(input: NewControlInput) {
  const { supabase, user } = await session();
  const company = input.company.trim();
  const period = input.period.trim();
  if (!company) throw new ControlError("Indicá la empresa del control.");
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new ControlError("El período debe tener el formato AAAA-MM.");
  }

  const { data, error } = await supabase
    .from("controls")
    .insert({
      user_id: user.id,
      company,
      period,
      rounding_tolerance: input.roundingTolerance ?? null,
      observations: input.observations?.trim() ?? "",
    })
    .select("id")
    .single<{ id: string }>();
  if (error) fail("crear el control", error);
  return data.id;
}

export async function addDocuments(
  controlId: string,
  kind: DocumentKind,
  files: File[],
) {
  const { supabase, user } = await session();
  await assertControlIsEditable(controlId);

  // La LS y la nómina son documentos únicos: una carga nueva reemplaza la anterior.
  if (kind === "ls" || kind === "payroll") {
    const { data: previous } = await supabase
      .from("control_documents")
      .select("id, storage_path")
      .eq("control_id", controlId)
      .eq("kind", kind)
      .returns<Array<{ id: string; storage_path: string | null }>>();
    for (const document of previous ?? []) {
      await deleteDocumentRow(document.id, document.storage_path);
    }
  }

  for (const file of files) {
    const invalid = !file.size
      ? "El archivo está vacío."
      : !ACCEPTED_DOCUMENT_PATTERN.test(file.name)
        ? "Formato no admitido. Usá PDF, PNG, JPG, CSV o XLSX."
        : file.size > MAX_DOCUMENT_SIZE
          ? "El archivo supera el máximo de 15 MB."
          : null;

    if (invalid) {
      const { error } = await supabase.from("control_documents").insert({
        control_id: controlId,
        user_id: user.id,
        name: file.name,
        kind,
        size: file.size,
        status: "error",
        error: invalid,
      });
      if (error) fail("registrar el archivo rechazado", error);
      continue;
    }

    const storagePath = `${user.id}/${controlId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const upload = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (upload.error) fail(`subir ${file.name}`, upload.error);

    const { error } = await supabase.from("control_documents").insert({
      control_id: controlId,
      user_id: user.id,
      name: file.name,
      kind,
      size: file.size,
      status: "uploaded",
      storage_path: storagePath,
    });
    if (error) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
      fail(`registrar ${file.name}`, error);
    }
  }

  await refreshDocumentsStatus(controlId);
}

export async function removeDocument(controlId: string, documentId: string) {
  const { supabase } = await session();
  await assertControlIsEditable(controlId);
  const { data } = await supabase
    .from("control_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle<{ storage_path: string | null }>();
  await deleteDocumentRow(documentId, data?.storage_path ?? null);
  await refreshDocumentsStatus(controlId);
}

/**
 * Los archivos rechazados por formato o tamaño no se pueden reintentar: hay
 * que volver a cargarlos. Reintentar solo tiene sentido cuando falló el
 * análisis, así que el documento vuelve a quedar pendiente de procesar.
 */
export async function retryDocument(controlId: string, documentId: string) {
  const { supabase } = await session();
  await assertControlIsEditable(controlId);
  const { data, error } = await supabase
    .from("control_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle<{ storage_path: string | null }>();
  if (error) fail("recuperar el documento", error);
  if (!data?.storage_path) {
    throw new ControlError(
      "El archivo no quedó guardado. Cargalo de nuevo para reintentar.",
    );
  }
  const updated = await supabase
    .from("control_documents")
    .update({ status: "uploaded", error: null })
    .eq("id", documentId);
  if (updated.error) fail("reintentar el documento", updated.error);
  await refreshDocumentsStatus(controlId);
}

export async function markControlAsProcessing(controlId: string) {
  const { supabase } = await session();
  const { error } = await supabase
    .from("controls")
    .update({ status: "processing", processing_error: null })
    .eq("id", controlId);
  if (error) fail("iniciar el análisis", error);
}

export async function markControlAsFailed(controlId: string, reason: string) {
  const { supabase } = await session();
  const { error } = await supabase
    .from("controls")
    .update({ status: "error", processing_error: reason })
    .eq("id", controlId);
  if (error) fail("registrar el error del análisis", error);
}

/**
 * Guarda el resultado del motor: el JSON completo en el control y la vista por
 * trabajador en sus propias tablas, que es la que después edita el contador.
 */
export async function saveAnalysis(
  controlId: string,
  result: NominaCheckResult,
  analysisIdByDocumentId: Map<string, string>,
) {
  const { supabase, user } = await session();

  const updated = await supabase
    .from("controls")
    .update({
      status: "completed",
      result,
      general_status: result.summary.proposed_general_status,
      processing_error: null,
    })
    .eq("id", controlId);
  if (updated.error) fail("guardar el resultado del análisis", updated.error);

  for (const [documentId, analysisId] of analysisIdByDocumentId) {
    await supabase
      .from("control_documents")
      .update({ status: "processed", analysis_document_id: analysisId })
      .eq("id", documentId);
  }

  // Se reemplaza la vista derivada completa; los pagos caen por cascada.
  const cleared = await supabase
    .from("control_workers")
    .delete()
    .eq("control_id", controlId);
  if (cleared.error) fail("limpiar el análisis anterior", cleared.error);

  const derived = deriveWorkers(result);
  if (!derived.length) return;

  const { data: insertedWorkers, error } = await supabase
    .from("control_workers")
    .insert(
      derived.map((worker, index) => ({
        control_id: controlId,
        user_id: user.id,
        document_number: worker.documentNumber,
        full_name: worker.fullName,
        role: worker.role,
        status: worker.status,
        odoo_nominal: worker.odooNominal,
        payroll_nominal: worker.payrollNominal,
        receipt_nominal: worker.receiptNominal,
        receipt_liquid: worker.receiptLiquid,
        observation: worker.observation,
        sort_order: index,
      })),
    )
    .select("id, document_number")
    .returns<Array<{ id: string; document_number: string }>>();
  if (error) fail("guardar los trabajadores", error);

  const workerIdByDocumentNumber = new Map(
    insertedWorkers.map((row) => [row.document_number, row.id]),
  );
  const paymentRows = derived.flatMap((worker) => {
    const workerId = workerIdByDocumentNumber.get(worker.documentNumber);
    if (!workerId) return [];
    return [
      ...worker.receipts.map((payment) => ({
        payment,
        kind: "receipt" as const,
      })),
      ...worker.transfers.map((payment) => ({
        payment,
        kind: "transfer" as const,
      })),
    ].map(({ payment, kind }, index) => ({
      control_id: controlId,
      worker_id: workerId,
      user_id: user.id,
      kind,
      name: payment.name,
      amount: payment.amount,
      paid_on: payment.date ?? null,
      reference: payment.reference ?? null,
      shared_with: payment.sharedWith ?? [],
      association_status: payment.associationStatus ?? null,
      source_document_id: payment.sourceDocumentId,
      sort_order: index,
    }));
  });
  if (!paymentRows.length) return;

  const savedPayments = await supabase
    .from("control_payments")
    .insert(paymentRows);
  if (savedPayments.error) fail("guardar los pagos", savedPayments.error);
}

// ------------------------------------------------- decisiones del contador

export async function confirmAssociation(workerId: string, paymentId: string) {
  const { supabase } = await session();
  const updated = await supabase
    .from("control_payments")
    .update({ association_status: "confirmed" })
    .eq("id", paymentId)
    .eq("worker_id", workerId);
  if (updated.error) fail("confirmar la asociación", updated.error);

  // Mientras quede algún pago sugerido, la persona sigue en revisión manual.
  const { data: pending } = await supabase
    .from("control_payments")
    .select("id")
    .eq("worker_id", workerId)
    .eq("association_status", "suggested")
    .limit(1)
    .returns<Array<{ id: string }>>();
  if (pending?.length) return;

  const worker = await supabase
    .from("control_workers")
    .update({ status: "correct", observation: null })
    .eq("id", workerId)
    .eq("status", "manual-review");
  if (worker.error) fail("actualizar el estado del trabajador", worker.error);
}

export async function reassignTransfer(
  workerId: string,
  paymentId: string,
  targetWorkerId: string,
) {
  const { supabase } = await session();
  if (workerId === targetWorkerId) return;

  const moved = await supabase
    .from("control_payments")
    .update({
      worker_id: targetWorkerId,
      association_status: "confirmed",
      shared_with: [],
    })
    .eq("id", paymentId)
    .eq("worker_id", workerId);
  if (moved.error) fail("reasignar la transferencia", moved.error);

  // La persona que pierde el pago queda sin respaldo de su líquido.
  const source = await supabase
    .from("control_workers")
    .update({
      status: "incomplete",
      observation:
        "La transferencia se reasignó a otra persona; falta respaldo del líquido.",
    })
    .eq("id", workerId);
  if (source.error) fail("actualizar el trabajador de origen", source.error);
}

export async function markReviewed(workerId: string) {
  const { supabase } = await session();
  const { error } = await supabase
    .from("control_workers")
    .update({ reviewed: true })
    .eq("id", workerId);
  if (error) fail("marcar la observación como revisada", error);
}

/**
 * URL temporal para abrir el archivo original. Se puede pedir por el id de la
 * fila (tarjetas de LS y nómina) o por el id que le puso el motor (recibos y
 * transferencias, que salen del resultado y no de una fila de documento).
 */
export async function createDocumentSignedUrl(
  controlId: string,
  reference: { documentId?: string; analysisDocumentId?: string },
) {
  const { supabase } = await session();
  let query = supabase
    .from("control_documents")
    .select("storage_path")
    .eq("control_id", controlId);
  query = reference.documentId
    ? query.eq("id", reference.documentId)
    : query.eq("analysis_document_id", reference.analysisDocumentId ?? "");

  const { data, error } = await query
    .limit(1)
    .maybeSingle<{ storage_path: string | null }>();
  if (error) fail("buscar el documento", error);
  if (!data?.storage_path) return null;

  const signed = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(data.storage_path, 60 * 5);
  if (signed.error) fail("generar la vista previa", signed.error);
  return signed.data.signedUrl;
}

// ----------------------------------------------------------------- helpers

async function assertControlIsEditable(controlId: string) {
  const { supabase } = await session();
  const { data, error } = await supabase
    .from("controls")
    .select("status")
    .eq("id", controlId)
    .maybeSingle<{ status: ControlStatus }>();
  if (error) fail("abrir el control", error);
  if (!data) throw new ControlError("El control solicitado no existe.");
  if (data.status === "processing") {
    throw new ControlError(
      "El control se está analizando; esperá a que termine para cambiar los documentos.",
    );
  }
}

/** Un control está listo cuando tiene al menos un archivo válido de cada tipo. */
async function refreshDocumentsStatus(controlId: string) {
  const { supabase } = await session();
  const { data, error } = await supabase
    .from("control_documents")
    .select("kind, status")
    .eq("control_id", controlId)
    .returns<
      Array<{ kind: DocumentKind; status: ControlDocument["status"] }>
    >();
  if (error) fail("revisar los documentos cargados", error);

  const ready = REQUIRED_DOCUMENT_KINDS.every((kind) =>
    data.some(
      (document) => document.kind === kind && document.status !== "error",
    ),
  );
  const updated = await supabase
    .from("controls")
    .update({ status: ready ? "ready" : "draft" })
    .eq("id", controlId)
    .in("status", ["draft", "ready", "error"]);
  if (updated.error) fail("actualizar el estado del control", updated.error);
}

async function deleteDocumentRow(
  documentId: string,
  storagePath: string | null,
) {
  const { supabase } = await session();
  if (storagePath) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
  }
  const { error } = await supabase
    .from("control_documents")
    .delete()
    .eq("id", documentId);
  if (error) fail("eliminar el documento", error);
}

function toPaymentDocument(row: PaymentRow) {
  return {
    id: row.id,
    name: row.name,
    amount: toNumber(row.amount) ?? 0,
    date: row.paid_on ?? undefined,
    reference: row.reference ?? undefined,
    sharedWith: row.shared_with.length ? row.shared_with : undefined,
    associationStatus: row.association_status ?? undefined,
    sourceDocumentId: row.source_document_id ?? undefined,
  };
}

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
  }
  return groups;
}
