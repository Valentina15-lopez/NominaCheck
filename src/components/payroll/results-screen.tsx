import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import {
  buildReportDiagnosis,
  recordGaps,
} from "@/components/payroll/report-diagnosis";
import { StatusBadge, statusLabel, SummaryCard } from "@/components/payroll/ui";
import type { GeneralStatus, NominaCheckResult } from "@/types/nominacheck";

export function ResultsScreen({
  result,
  onSelect,
  onFinish,
}: {
  result: NominaCheckResult;
  onSelect: (index: number) => void;
  onFinish: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<GeneralStatus | "TODOS">(
    "TODOS",
  );
  const rows = result.workers.flatMap((worker, workerIndex) =>
    worker.employment_records.map((record) => ({
      worker,
      workerIndex,
      record,
    })),
  );
  const filteredRows = rows.filter(
    ({ record }) =>
      statusFilter === "TODOS" || record.proposed_status === statusFilter,
  );
  const diagnosis = buildReportDiagnosis(result);

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-primary text-sm font-medium">Paso 5 de 6</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Resultados del control
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Resumen de las verificaciones del período{" "}
            {result.liquidation.period.original ?? "sin identificar"}.
          </p>
        </div>
        <button
          type="button"
          onClick={onFinish}
          className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 font-medium"
        >
          Finalizar control
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Trabajadores"
          value={String(result.summary.workers_in_ls)}
          icon={Users}
        />
        <SummaryCard
          label="Correctos"
          value={String(
            result.summary.correct + result.summary.correct_with_rounding,
          )}
          icon={CheckCircle2}
        />
        <SummaryCard
          label="Con diferencias"
          value={String(
            result.summary.with_errors +
              result.summary.incomplete +
              result.summary.manual_review +
              result.summary.with_warnings,
          )}
          icon={XCircle}
        />
      </div>
      {diagnosis ? (
        <div className="border-accent bg-accent/40 mt-6 rounded-2xl border p-5">
          <div className="flex gap-3">
            <AlertTriangle className="text-accent-foreground mt-0.5 size-5 shrink-0" />
            <div>
              <h2 className="font-semibold">{diagnosis.title}</h2>
              <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4 text-sm">
                {diagnosis.paragraphs.map((paragraph) => (
                  <li key={paragraph}>{paragraph}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
      <div className="border-border bg-card mt-8 overflow-hidden rounded-2xl border">
        <div className="border-border flex items-center justify-between border-b p-5">
          <h2 className="font-semibold">Detalle por trabajador</h2>
          <label>
            <span className="sr-only">Filtrar por estado</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as GeneralStatus | "TODOS")
              }
              className="border-input bg-background rounded-lg border px-3 py-2 text-xs"
            >
              <option value="TODOS">Todos los estados</option>
              {[
                "CORRECTO",
                "CORRECTO_CON_REDONDEO",
                "CORRECTO_CON_OBSERVACION",
                "ADVERTENCIA",
                "ERROR",
                "DOCUMENTACION_INCOMPLETA",
                "REVISION_MANUAL",
                "NO_PROCESABLE",
              ].map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="px-5 py-3 font-medium">Trabajador</th>
                <th className="px-5 py-3 font-medium">Acumulación / cargo</th>
                <th className="px-5 py-3 text-right font-medium">LS</th>
                <th className="px-5 py-3 text-right font-medium">Nómina</th>
                <th className="px-5 py-3 text-right font-medium">Recibo</th>
                <th className="px-5 py-3 text-right font-medium">Banco</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ worker, workerIndex, record }) => (
                <tr
                  key={record.employment_record_id}
                  className="border-border hover:bg-muted/30 border-t"
                >
                  <td className="px-5 py-4 font-medium">
                    {worker.identity.full_name.original ?? "Sin nombre"}
                    <span className="text-muted-foreground ml-2 text-xs font-normal">
                      {worker.identity.document_number.original ?? "Sin cédula"}
                    </span>
                  </td>
                  <td className="text-muted-foreground px-5 py-4">
                    {record.employment_accumulation.original ??
                      record.position.original ??
                      "Sin acumulación"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatMoney(record.odoo?.nominal.normalized ?? null)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatMoney(record.payroll?.nominal.normalized ?? null)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatMoney(record.receipt?.net.normalized ?? null)}
                    {recordGaps(record).receipt ? (
                      <span className="text-accent-foreground mt-1 block text-xs">
                        Sin recibo
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatMoney(record.proposed_transfer_total)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge label={record.proposed_status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSelect(workerIndex)}
                      className="text-primary hover:underline"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {(result.unmatched_records.receipts.length > 0 ||
        result.unmatched_records.transfers.length > 0) && (
        <div className="border-border bg-card mt-6 rounded-2xl border p-5 text-sm">
          <h2 className="font-semibold">Registros sin vincular</h2>
          <p className="text-muted-foreground mt-2">
            Recibos: {result.unmatched_records.receipts.length} ·
            Transferencias: {result.unmatched_records.transfers.length}.
            Permanecen visibles para revisión manual.
          </p>
        </div>
      )}
    </>
  );
}

function formatMoney(value: number | null) {
  return value === null
    ? "No disponible"
    : new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: "UYU",
      }).format(value);
}
