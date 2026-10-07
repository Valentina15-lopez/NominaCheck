"use server";

import {
  addDocuments,
  confirmAssociation,
  ControlError,
  createControl,
  createDocumentSignedUrl,
  listCompanies,
  listControls,
  markReviewed,
  reassignTransfer,
  removeDocument,
  retryDocument,
} from "@/lib/db/controls";
import { getSettings, saveSettings } from "@/lib/db/settings";
import type {
  DocumentKind,
  NewControlInput,
  SalaryControl,
  UserSettings,
} from "@/types/nomina";

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string };

async function run<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    if (error instanceof ControlError) {
      return { ok: false, error: error.message };
    }
    console.error("NóminaCheck · acción fallida", error);
    return {
      ok: false,
      error: "Ocurrió un error inesperado. Intentá nuevamente.",
    };
  }
}

export async function loadControlsAction(): Promise<
  ActionResult<SalaryControl[]>
> {
  return run(listControls);
}

export async function loadCompaniesAction(): Promise<ActionResult<string[]>> {
  return run(listCompanies);
}

export async function createControlAction(
  input: NewControlInput,
): Promise<ActionResult<string>> {
  return run(() => createControl(input));
}

/**
 * Los archivos llegan en un FormData porque es la única forma de mandar
 * binarios a una server action.
 */
export async function addDocumentsAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  return run(async () => {
    const controlId = String(formData.get("controlId") ?? "");
    const kind = String(formData.get("kind") ?? "") as DocumentKind;
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);
    if (!controlId || !kind) {
      throw new ControlError("Falta el control o el tipo de documento.");
    }
    if (!files.length) throw new ControlError("No seleccionaste archivos.");
    await addDocuments(controlId, kind, files);
    return null;
  });
}

export async function removeDocumentAction(
  controlId: string,
  documentId: string,
): Promise<ActionResult<null>> {
  return run(async () => {
    await removeDocument(controlId, documentId);
    return null;
  });
}

export async function retryDocumentAction(
  controlId: string,
  documentId: string,
): Promise<ActionResult<null>> {
  return run(async () => {
    await retryDocument(controlId, documentId);
    return null;
  });
}

export async function confirmAssociationAction(
  workerId: string,
  paymentId: string,
): Promise<ActionResult<null>> {
  return run(async () => {
    await confirmAssociation(workerId, paymentId);
    return null;
  });
}

export async function reassignTransferAction(
  workerId: string,
  paymentId: string,
  targetWorkerId: string,
): Promise<ActionResult<null>> {
  return run(async () => {
    await reassignTransfer(workerId, paymentId, targetWorkerId);
    return null;
  });
}

export async function markReviewedAction(
  workerId: string,
): Promise<ActionResult<null>> {
  return run(async () => {
    await markReviewed(workerId);
    return null;
  });
}

export async function documentPreviewUrlAction(
  controlId: string,
  reference: { documentId?: string; analysisDocumentId?: string },
): Promise<ActionResult<string | null>> {
  return run(() => createDocumentSignedUrl(controlId, reference));
}

export async function loadSettingsAction(): Promise<
  ActionResult<UserSettings>
> {
  return run(getSettings);
}

export async function saveSettingsAction(
  settings: UserSettings,
): Promise<ActionResult<null>> {
  return run(async () => {
    await saveSettings(settings);
    return null;
  });
}
