"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  FileSpreadsheet,
  FileText,
  Landmark,
  RefreshCw,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";
import { useControlStore } from "@/components/nomina/control-store";
import { formatPeriod, LoadingState, PageShell } from "@/components/nomina/ui";
import { cn } from "@/lib/cn";
import type { ControlDocument, DocumentKind } from "@/types/nomina";

const sections: {
  kind: DocumentKind;
  title: string;
  description: string;
  icon: typeof FileText;
  multiple: boolean;
}[] = [
  {
    kind: "ls",
    title: "LS / Liquidación de Odoo",
    description: "Documento principal que define los trabajadores a analizar",
    icon: FileSpreadsheet,
    multiple: false,
  },
  {
    kind: "payroll",
    title: "Nómina",
    description: "Archivo de nómina correspondiente al período",
    icon: Users,
    multiple: false,
  },
  {
    kind: "receipt",
    title: "Recibos de sueldo",
    description: "Uno o varios recibos en PDF, imagen o archivo comprimido",
    icon: FileText,
    multiple: true,
  },
  {
    kind: "transfer",
    title: "Documentos de transferencia",
    description: "Extractos o comprobantes de uno o varios pagos",
    icon: Landmark,
    multiple: true,
  },
];

function FileStatus({ document }: { document: ControlDocument }) {
  if (document.status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
        <AlertCircle className="size-3.5" /> Error
      </span>
    );
  }
  return (
    <span className="text-primary inline-flex items-center gap-1 text-xs font-medium">
      <Check className="size-3.5" />
      {document.status === "processed" ? "Procesado" : "Archivo cargado"}
    </span>
  );
}

function UploadSection({
  kind,
  title,
  description,
  icon: Icon,
  multiple,
  documents,
  onAdd,
  onRemove,
  onRetry,
}: (typeof sections)[number] & {
  documents: ControlDocument[];
  onAdd: (files: File[]) => void;
  onRemove: (documentId: string) => void;
  onRetry: (documentId: string) => void;
}) {
  const receiveFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    onAdd(multiple ? files : files.slice(0, 1));
  };

  return (
    <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
          <Icon className="size-5" />
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            documents.length
              ? documents.some((document) => document.status === "error")
                ? "bg-red-50 text-red-700"
                : "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {documents.length
            ? `${documents.length} cargado${documents.length === 1 ? "" : "s"}`
            : "Pendiente"}
        </span>
      </div>
      <h2 className="mt-5 font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1 min-h-10 text-sm leading-5">
        {description}
      </p>
      <input
        id={`upload-${kind}`}
        type="file"
        multiple={multiple}
        accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx,.csv,.zip"
        className="sr-only"
        onChange={(event) => {
          receiveFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <label
        htmlFor={`upload-${kind}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          receiveFiles(event.dataTransfer.files);
        }}
        className="border-primary/35 bg-primary/[0.03] text-muted-foreground hover:bg-primary/[0.07] mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center text-sm"
      >
        <UploadCloud className="text-primary size-5" />
        <span>
          <strong className="text-foreground font-medium">
            Seleccionar archivos
          </strong>{" "}
          o arrastralos acá
        </span>
      </label>
      {documents.length > 0 && (
        <div className="mt-4 grid gap-2">
          {documents.map((document) => (
            <div
              key={document.id}
              className="border-border flex items-center gap-3 rounded-xl border px-3 py-2.5"
            >
              <FileText className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{document.name}</p>
                <FileStatus document={document} />
                {document.error && (
                  <p className="mt-0.5 text-xs text-red-700">
                    {document.error}
                  </p>
                )}
              </div>
              {document.status === "error" && (
                <button
                  onClick={() => onRetry(document.id)}
                  aria-label={`Reintentar ${document.name}`}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2"
                >
                  <RefreshCw className="size-3.5" />
                </button>
              )}
              <button
                onClick={() => onRemove(document.id)}
                aria-label={`Eliminar ${document.name}`}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DocumentsPage() {
  const { controlId } = useParams<{ controlId: string }>();
  const router = useRouter();
  const {
    controls,
    hydrated,
    addDocuments,
    removeDocument,
    retryDocument,
    startProcessing,
  } = useControlStore();
  const control = controls.find((item) => item.id === controlId);

  if (!hydrated) {
    return (
      <PageShell
        eyebrow="Carga documental"
        title="Preparando el control"
        description=""
      >
        <LoadingState />
      </PageShell>
    );
  }

  if (!control) {
    return (
      <PageShell
        eyebrow="Control no encontrado"
        title="No pudimos abrir este control"
        description="El control solicitado no existe o fue eliminado."
      >
        <Link
          href="/"
          className="text-primary mt-8 inline-flex text-sm font-medium hover:underline"
        >
          Volver al dashboard
        </Link>
      </PageShell>
    );
  }

  const requiredKinds: DocumentKind[] = [
    "ls",
    "payroll",
    "receipt",
    "transfer",
  ];
  const canAnalyze = requiredKinds.every((kind) =>
    control.documents.some(
      (document) => document.kind === kind && document.status === "uploaded",
    ),
  );

  const analyze = () => {
    if (!canAnalyze) return;
    startProcessing(control.id);
    router.push(`/controles/${control.id}/procesando`);
  };

  return (
    <PageShell
      eyebrow={`${control.company} · ${formatPeriod(control.period)}`}
      title="Carga de documentos"
      description="Cargá la documentación requerida. La LS define qué trabajadores se incluirán en el análisis."
    >
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mt-8 inline-flex items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="size-4" /> Volver a controles
      </Link>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {sections.map((section) => (
          <UploadSection
            key={section.kind}
            {...section}
            documents={control.documents.filter(
              (document) => document.kind === section.kind,
            )}
            onAdd={(files) => addDocuments(control.id, section.kind, files)}
            onRemove={(documentId) => removeDocument(control.id, documentId)}
            onRetry={(documentId) => retryDocument(control.id, documentId)}
          />
        ))}
      </div>
      <section className="border-border bg-card mt-8 rounded-2xl border p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold">Resumen de carga</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {canAnalyze
                ? "Todos los documentos requeridos están listos."
                : "Completá las cuatro secciones para iniciar el análisis."}
            </p>
          </div>
          <strong className="text-2xl">{control.documents.length}</strong>
        </div>
        <button
          disabled={!canAnalyze}
          onClick={analyze}
          className="bg-primary text-primary-foreground mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto"
        >
          Analizar documentación <ArrowUpRight className="size-4" />
        </button>
      </section>
    </PageShell>
  );
}
