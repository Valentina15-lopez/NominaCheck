"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  cloneInitialControls,
  MOCK_WORKERS,
  PROCESSING_STEPS,
} from "@/lib/nomina/mock-data";
import type {
  ControlDocument,
  DocumentKind,
  NewControlInput,
  ProcessingStep,
  SalaryControl,
} from "@/types/nomina";

const STORAGE_KEY = "nomina-check-controls-v2";
const acceptedFile = /\.(pdf|png|jpe?g|xlsx?|csv|zip)$/i;
const requiredKinds: DocumentKind[] = ["ls", "payroll", "receipt", "transfer"];

type StoreValue = {
  controls: SalaryControl[];
  hydrated: boolean;
  createControl: (input: NewControlInput) => string;
  addDocuments: (controlId: string, kind: DocumentKind, files: File[]) => void;
  removeDocument: (controlId: string, documentId: string) => void;
  retryDocument: (controlId: string, documentId: string) => void;
  startProcessing: (controlId: string) => void;
  setProcessingSteps: (controlId: string, steps: ProcessingStep[]) => void;
  completeProcessing: (controlId: string) => void;
  confirmAssociation: (
    controlId: string,
    workerId: string,
    transferId: string,
  ) => void;
  reassignTransfer: (
    controlId: string,
    workerId: string,
    transferId: string,
    targetWorkerId: string,
  ) => void;
  markReviewed: (controlId: string, workerId: string) => void;
};

const ControlStoreContext = createContext<StoreValue | null>(null);

function updateControl(
  controls: SalaryControl[],
  controlId: string,
  updater: (control: SalaryControl) => SalaryControl,
) {
  return controls.map((control) =>
    control.id === controlId ? updater(control) : control,
  );
}

function documentsStatus(documents: ControlDocument[]) {
  return requiredKinds.every((kind) =>
    documents.some(
      (document) =>
        document.kind === kind &&
        (document.status === "uploaded" || document.status === "processed"),
    ),
  )
    ? ("ready" as const)
    : ("draft" as const);
}

export function ControlStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [controls, setControls] = useState<SalaryControl[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        setControls(
          saved
            ? (JSON.parse(saved) as SalaryControl[])
            : cloneInitialControls(),
        );
      } catch {
        setControls(cloneInitialControls());
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(controls));
  }, [controls, hydrated]);

  const createControl = useCallback((input: NewControlInput) => {
    const id = `control-${Date.now().toString(36)}`;
    const control: SalaryControl = {
      id,
      company: input.company,
      period: input.period,
      status: "draft",
      createdAt: new Date().toISOString(),
      documents: [],
      workers: [],
      processingSteps: structuredClone(PROCESSING_STEPS),
    };
    setControls((current) => [control, ...current]);
    return id;
  }, []);

  const addDocuments = useCallback(
    (controlId: string, kind: DocumentKind, files: File[]) => {
      const incoming: ControlDocument[] = files.map((file, index) => {
        const invalid = file.size === 0 || !acceptedFile.test(file.name);
        return {
          id: `${kind}-${Date.now().toString(36)}-${index}`,
          name: file.name,
          kind,
          size: file.size,
          status: invalid ? "error" : "uploaded",
          error: invalid ? "Formato no admitido o archivo vacío" : undefined,
        };
      });
      setControls((current) =>
        updateControl(current, controlId, (control) => {
          const keep =
            kind === "ls" || kind === "payroll"
              ? control.documents.filter((document) => document.kind !== kind)
              : control.documents;
          const documents = [...keep, ...incoming];
          return { ...control, documents, status: documentsStatus(documents) };
        }),
      );
    },
    [],
  );

  const removeDocument = useCallback(
    (controlId: string, documentId: string) => {
      setControls((current) =>
        updateControl(current, controlId, (control) => {
          const documents = control.documents.filter(
            (document) => document.id !== documentId,
          );
          return { ...control, status: documentsStatus(documents), documents };
        }),
      );
    },
    [],
  );

  const retryDocument = useCallback((controlId: string, documentId: string) => {
    setControls((current) =>
      updateControl(current, controlId, (control) => {
        const documents: ControlDocument[] = control.documents.map(
          (document) =>
            document.id === documentId
              ? { ...document, status: "uploaded", error: undefined }
              : document,
        );
        return { ...control, documents, status: documentsStatus(documents) };
      }),
    );
  }, []);

  const startProcessing = useCallback((controlId: string) => {
    setControls((current) =>
      updateControl(current, controlId, (control) => ({
        ...control,
        status: "processing",
        processingSteps: structuredClone(PROCESSING_STEPS),
      })),
    );
  }, []);

  const setProcessingSteps = useCallback(
    (controlId: string, steps: ProcessingStep[]) => {
      setControls((current) =>
        updateControl(current, controlId, (control) => ({
          ...control,
          processingSteps: steps,
        })),
      );
    },
    [],
  );

  const completeProcessing = useCallback((controlId: string) => {
    setControls((current) =>
      updateControl(current, controlId, (control) => ({
        ...control,
        status: "completed",
        documents: control.documents.map((document) => ({
          ...document,
          status: document.status === "error" ? "error" : "processed",
        })),
        processingSteps: control.processingSteps.map((step) => ({
          ...step,
          status: "completed",
        })),
        workers: structuredClone(MOCK_WORKERS),
      })),
    );
  }, []);

  const confirmAssociation = useCallback(
    (controlId: string, workerId: string, transferId: string) => {
      setControls((current) =>
        updateControl(current, controlId, (control) => ({
          ...control,
          workers: control.workers.map((worker) =>
            worker.id === workerId
              ? {
                  ...worker,
                  status:
                    worker.status === "manual-review"
                      ? "correct"
                      : worker.status,
                  observation:
                    worker.status === "manual-review"
                      ? undefined
                      : worker.observation,
                  transfers: worker.transfers.map((transfer) =>
                    transfer.id === transferId
                      ? { ...transfer, associationStatus: "confirmed" }
                      : transfer,
                  ),
                }
              : worker,
          ),
        })),
      );
    },
    [],
  );

  const reassignTransfer = useCallback(
    (
      controlId: string,
      workerId: string,
      transferId: string,
      targetWorkerId: string,
    ) => {
      setControls((current) =>
        updateControl(current, controlId, (control) => {
          const source = control.workers.find(
            (worker) => worker.id === workerId,
          );
          const transfer = source?.transfers.find(
            (item) => item.id === transferId,
          );
          if (!transfer || workerId === targetWorkerId) return control;
          return {
            ...control,
            workers: control.workers.map((worker) => {
              if (worker.id === workerId) {
                return {
                  ...worker,
                  status: "incomplete",
                  transfers: worker.transfers.filter(
                    (item) => item.id !== transferId,
                  ),
                };
              }
              if (worker.id === targetWorkerId) {
                return {
                  ...worker,
                  transfers: [
                    ...worker.transfers,
                    { ...transfer, associationStatus: "confirmed" },
                  ],
                };
              }
              return worker;
            }),
          };
        }),
      );
    },
    [],
  );

  const markReviewed = useCallback((controlId: string, workerId: string) => {
    setControls((current) =>
      updateControl(current, controlId, (control) => ({
        ...control,
        workers: control.workers.map((worker) =>
          worker.id === workerId ? { ...worker, reviewed: true } : worker,
        ),
      })),
    );
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      controls,
      hydrated,
      createControl,
      addDocuments,
      removeDocument,
      retryDocument,
      startProcessing,
      setProcessingSteps,
      completeProcessing,
      confirmAssociation,
      reassignTransfer,
      markReviewed,
    }),
    [
      controls,
      hydrated,
      createControl,
      addDocuments,
      removeDocument,
      retryDocument,
      startProcessing,
      setProcessingSteps,
      completeProcessing,
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
