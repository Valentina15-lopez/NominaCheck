"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  type ActionResult,
  addDocumentsAction,
  confirmAssociationAction,
  createControlAction,
  loadControlsAction,
  markReviewedAction,
  reassignTransferAction,
  removeDocumentAction,
  retryDocumentAction,
} from "@/app/controles/actions";
import type {
  DocumentKind,
  NewControlInput,
  SalaryControl,
} from "@/types/nomina";

/**
 * Único punto de lectura y escritura del espacio de trabajo. La primera carga
 * llega del servidor; cada mutación va a la base por una server action y
 * después se releen los controles, así la UI nunca muestra algo que no se
 * guardó.
 */
type StoreValue = {
  controls: SalaryControl[];
  busy: boolean;
  error: string | null;
  dismissError: () => void;
  refresh: () => Promise<void>;
  createControl: (input: NewControlInput) => Promise<string | null>;
  addDocuments: (
    controlId: string,
    kind: DocumentKind,
    files: File[],
  ) => Promise<void>;
  removeDocument: (controlId: string, documentId: string) => Promise<void>;
  retryDocument: (controlId: string, documentId: string) => Promise<void>;
  confirmAssociation: (workerId: string, paymentId: string) => Promise<void>;
  reassignTransfer: (
    workerId: string,
    paymentId: string,
    targetWorkerId: string,
  ) => Promise<void>;
  markReviewed: (workerId: string) => Promise<void>;
};

const ControlStoreContext = createContext<StoreValue | null>(null);

export function ControlStoreProvider({
  initialControls,
  children,
}: {
  initialControls: SalaryControl[];
  children: React.ReactNode;
}) {
  const [controls, setControls] = useState(initialControls);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await loadControlsAction();
    if (result.ok) {
      setControls(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
  }, []);

  /** Ejecuta una mutación y relee los controles solo si salió bien. */
  const mutate = useCallback(
    async <T,>(action: () => Promise<ActionResult<T>>): Promise<T | null> => {
      setBusy(true);
      try {
        const result = await action();
        if (!result.ok) {
          setError(result.error);
          return null;
        }
        setError(null);
        await refresh();
        return result.data;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const createControl = useCallback(
    (input: NewControlInput) => mutate(() => createControlAction(input)),
    [mutate],
  );

  const addDocuments = useCallback(
    async (controlId: string, kind: DocumentKind, files: File[]) => {
      const formData = new FormData();
      formData.set("controlId", controlId);
      formData.set("kind", kind);
      for (const file of files) formData.append("files", file);
      await mutate(() => addDocumentsAction(formData));
    },
    [mutate],
  );

  const removeDocument = useCallback(
    async (controlId: string, documentId: string) => {
      await mutate(() => removeDocumentAction(controlId, documentId));
    },
    [mutate],
  );

  const retryDocument = useCallback(
    async (controlId: string, documentId: string) => {
      await mutate(() => retryDocumentAction(controlId, documentId));
    },
    [mutate],
  );

  const confirmAssociation = useCallback(
    async (workerId: string, paymentId: string) => {
      await mutate(() => confirmAssociationAction(workerId, paymentId));
    },
    [mutate],
  );

  const reassignTransfer = useCallback(
    async (workerId: string, paymentId: string, targetWorkerId: string) => {
      await mutate(() =>
        reassignTransferAction(workerId, paymentId, targetWorkerId),
      );
    },
    [mutate],
  );

  const markReviewed = useCallback(
    async (workerId: string) => {
      await mutate(() => markReviewedAction(workerId));
    },
    [mutate],
  );

  const value = useMemo<StoreValue>(
    () => ({
      controls,
      busy,
      error,
      dismissError: () => setError(null),
      refresh,
      createControl,
      addDocuments,
      removeDocument,
      retryDocument,
      confirmAssociation,
      reassignTransfer,
      markReviewed,
    }),
    [
      controls,
      busy,
      error,
      refresh,
      createControl,
      addDocuments,
      removeDocument,
      retryDocument,
      confirmAssociation,
      reassignTransfer,
      markReviewed,
    ],
  );

  return (
    <ControlStoreContext.Provider value={value}>
      {children}
    </ControlStoreContext.Provider>
  );
}

export function useControlStore() {
  const context = useContext(ControlStoreContext);
  if (!context)
    throw new Error(
      "useControlStore debe usarse dentro de ControlStoreProvider",
    );
  return context;
}
