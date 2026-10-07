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
  FileText,
  Search,
  Users,
} from "lucide-react";
import { useControlStore } from "@/components/nomina/control-store";
import {
  EmptyState,
  formatMoney,
  formatPeriod,
  Metric,
  PageShell,
  StatusBadge,
} from "@/components/nomina/ui";
import type { WorkerStatus } from "@/types/nomina";

const STATUS_LABELS: Record<WorkerStatus, string> = {
  correct: "Correcto",
  warning: "Advertencia",
  incomplete: "Documentación incompleta",
  "manual-review": "Revisión manual",
};

export default function ResultsPage() {
  const { controlId } = useParams<{ controlId: string }>();
  const { controls } = useControlStore();
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
          worker.documentNumber.includes(normalized)),
    );
  }, [control, query, status]);

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
          Volver a controles
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
        {control.processingError && (
          <p
            role="alert"
            className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {control.processingError}
          </p>
        )}
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

  const downloadCsv = () => {
    const rows = [
      [
        "Trabajador",
        "CI",
        "Cargo",
        "Estado",
        "Nominal Odoo",
        "Nominal nómina",
        "Nominal recibo",
        "Líquido recibo",
        "Total transferido",
      ],
      ...control.workers.map((worker) => [
        worker.name,
        worker.documentNumber,
        worker.role,
        STATUS_LABELS[worker.status],
        worker.odooNominal,
        worker.payrollNominal ?? "",
        worker.receiptNominal ?? "",
        worker.receiptLiquid ?? "",
        worker.transfers.reduce(
          (total, transfer) => total + transfer.amount,
          0,
        ),
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.join(";")).join("\n")}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nominacheck-${control.period}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
          <ArrowLeft className="size-4" /> Volver a controles
        </Link>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/controles/${control.id}/informe`}
            className="border-border bg-card hover:bg-muted inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium"
          >
            <FileText className="size-4" /> Ver informe completo
          </Link>
          <button
            onClick={downloadCsv}
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
                        CI {worker.documentNumber}
                      </p>
                    </td>
                    <td className="text-muted-foreground px-5 py-4">
                      {worker.role}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {formatMoney(worker.odooNominal)}
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
