"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileQuestion,
  Search,
  Users,
} from "lucide-react";
import { useControlStore } from "@/components/nomina/control-store";
import {
  EmptyState,
  formatPeriod,
  LoadingState,
  Metric,
  PageShell,
  StatusBadge,
} from "@/components/nomina/ui";
import type { SalaryControl, WorkerStatus } from "@/types/nomina";

function escapePdfText(value: string) {
  return value.replace(/[^\x20-\x7E]/g, "").replace(/([\\()])/g, "\\$1");
}

function buildMockPdf(control: SalaryControl) {
  const content = `BT /F1 18 Tf 50 740 Td (${escapePdfText("NominaCheck - Informe simulado")}) Tj /F1 11 Tf 0 -30 Td (${escapePdfText(control.company)}) Tj 0 -18 Td (${escapePdfText(formatPeriod(control.period))}) Tj 0 -18 Td (${control.workers.length} trabajadores procesados) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function download(content: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ResultsPage() {
  const { controlId } = useParams<{ controlId: string }>();
  const { controls, hydrated } = useControlStore();
  const control = controls.find((item) => item.id === controlId);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<WorkerStatus | "all">("all");
  const [notice, setNotice] = useState("");

  const filteredWorkers = useMemo(() => {
    if (!control) return [];
    const normalized = query.trim().toLocaleLowerCase("es");
    return control.workers.filter(
      (worker) =>
        (status === "all" || worker.status === status) &&
        (!normalized ||
          worker.name.toLocaleLowerCase("es").includes(normalized) ||
          worker.id.includes(normalized)),
    );
  }, [control, query, status]);

  if (!hydrated) {
    return (
      <PageShell
        eyebrow="Resultados"
        title="Cargando el control"
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
        title="No pudimos mostrar los resultados"
        description="El control solicitado no existe."
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

  if (control.status !== "completed") {
    const href =
      control.status === "processing"
        ? `/controles/${control.id}/procesando`
        : `/controles/${control.id}/documentos`;
    return (
      <PageShell
        eyebrow={`${control.company} · ${formatPeriod(control.period)}`}
        title="El control todavía no tiene resultados"
        description="Completá la carga y el procesamiento antes de consultar el resumen."
      >
        <Link
          href={href}
          className="bg-primary text-primary-foreground mt-8 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold"
        >
          Continuar control <ArrowRight className="size-4" />
        </Link>
      </PageShell>
    );
  }

  const count = (workerStatus: WorkerStatus) =>
    control.workers.filter((worker) => worker.status === workerStatus).length;

  const downloadPdf = () => {
    download(
      buildMockPdf(control),
      "application/pdf",
      `informe-${control.period}.pdf`,
    );
    setNotice("Informe PDF generado en modo demostración.");
  };

  const downloadExcel = () => {
    const rows = [
      [
        "Trabajador",
        "CI",
        "Estado",
        "Nominal Odoo",
        "Nominal nómina",
        "Líquido",
      ],
      ...control.workers.map((worker) => [
        worker.name,
        worker.id,
        worker.status,
        worker.odooNominal,
        worker.payrollNominal ?? "",
        worker.receiptLiquid ?? "",
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.join(";")).join("\n")}`;
    download(csv, "text/csv;charset=utf-8", `informe-${control.period}.csv`);
    setNotice("Archivo compatible con Excel generado.");
  };

  return (
    <PageShell
      eyebrow={`${control.company} · ${formatPeriod(control.period)}`}
      title="Resultado del control"
      description="Resumen de la conciliación y estado de cada trabajador incluido en la LS."
    >
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft className="size-4" /> Volver al dashboard
        </Link>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadPdf}
            className="border-border bg-card hover:bg-muted inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium"
          >
            <Download className="size-4" /> Descargar informe PDF
          </button>
          <button
            onClick={downloadExcel}
            className="border-border bg-card hover:bg-muted inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium"
          >
            <Download className="size-4" /> Descargar Excel
          </button>
        </div>
      </div>
      {notice && (
        <div className="bg-primary/10 text-primary mt-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
          <Check className="size-4" /> {notice}
        </div>
      )}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          icon={Users}
          label="Procesados"
          value={control.workers.length}
        />
        <Metric icon={Check} label="Correctos" value={count("correct")} />
        <Metric
          icon={AlertTriangle}
          label="Advertencias"
          value={count("warning")}
        />
        <Metric
          icon={FileQuestion}
          label="Incompletos"
          value={count("incomplete")}
        />
        <Metric
          icon={Search}
          label="Revisión manual"
          value={count("manual-review")}
        />
      </div>
      <section className="border-border bg-card mt-6 rounded-2xl border">
        <div className="border-border flex flex-col justify-between gap-4 border-b p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold">Detalle por trabajador</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Buscá y filtrá las conciliaciones para revisar su trazabilidad.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="border-border bg-background focus:border-primary h-10 w-full rounded-xl border pr-3 pl-9 text-sm outline-none sm:w-60"
                placeholder="Buscar trabajador"
              />
            </div>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as WorkerStatus | "all")
              }
              className="border-border bg-background focus:border-primary h-10 rounded-xl border px-3 text-sm outline-none"
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos los estados</option>
              <option value="correct">Correcto</option>
              <option value="warning">Advertencia</option>
              <option value="incomplete">Incompleto</option>
              <option value="manual-review">Revisión manual</option>
            </select>
          </div>
        </div>
        {filteredWorkers.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No hay coincidencias"
              description="Probá con otra búsqueda o seleccioná un estado diferente."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-border bg-muted/50 text-muted-foreground border-b text-xs">
                <tr>
                  <th className="px-5 py-4 font-medium">Trabajador</th>
                  <th className="px-5 py-4 font-medium">Cargo</th>
                  <th className="px-5 py-4 font-medium">Nominal Odoo</th>
                  <th className="px-5 py-4 font-medium">Estado</th>
                  <th className="px-5 py-4 text-right font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((worker) => (
                  <tr
                    key={worker.id}
                    className="border-border hover:bg-muted/40 border-b transition-colors last:border-0"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium">{worker.name}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        CI {worker.id}
                      </p>
                    </td>
                    <td className="text-muted-foreground px-5 py-4">
                      {worker.role}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {new Intl.NumberFormat("es-UY", {
                        style: "currency",
                        currency: "UYU",
                        maximumFractionDigits: 0,
                      }).format(worker.odooNominal)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={worker.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/controles/${control.id}/trabajadores/${worker.id}`}
                        className="text-primary hover:bg-primary/10 inline-flex items-center gap-2 rounded-lg px-2 py-1 font-medium"
                      >
                        Revisar <ArrowRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
