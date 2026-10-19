import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Copy,
  Download,
  FileText,
  Printer,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  ACCOUNTANT_REPORT_HEADERS,
  accountantReportCsv,
  buildAccountantReportRows,
} from "@/components/payroll/accountant-report";
import { buildReportDiagnosis } from "@/components/payroll/report-diagnosis";
import { StatusBadge, statusLabel, SummaryCard } from "@/components/payroll/ui";
import type { ControlInput, NominaCheckResult } from "@/types/nominacheck";

export function ReportScreen({
  result,
  control,
  onBack,
}: {
  result: NominaCheckResult;
  control: ControlInput;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const diagnosis = useMemo(() => buildReportDiagnosis(result), [result]);
  const rows = useMemo(() => buildAccountantReportRows(result), [result]);
  const totals = useMemo(
    () => ({
      lsNominal: sumAmounts(rows.map((row) => row.importeNominalLs)),
      payroll: sumAmounts(rows.map((row) => row.importeNomina)),
      receiptNominal: sumAmounts(rows.map((row) => row.importeNominalRecibo)),
      receiptNet: sumAmounts(rows.map((row) => row.reciboLiquido)),
      transferred: sumAmounts(rows.map((row) => row.transferencia)),
    }),
    [rows],
  );

  function downloadCsv() {
    const url = URL.createObjectURL(
      new Blob([accountantReportCsv(rows)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `nominacheck-${control.period || "informe"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadJson() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `nominacheck-${control.period || "resultado"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyObservations() {
    const observations = result.workers.flatMap((worker) =>
      worker.employment_records.flatMap((record) => record.observations),
    );
    await navigator.clipboard.writeText(observations.join("\n"));
    setCopied(true);
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-primary text-sm font-medium">Paso 6 de 6</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Informe de conciliación
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {result.organization.name.original ?? control.organization} ·{" "}
            {control.period} · {statusLabel(result.processing_status)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 font-medium"
          >
            <Printer className="size-4" aria-hidden />
            Imprimir / PDF
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="border-border hover:bg-muted inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 font-medium"
          >
            <Download className="size-4" aria-hidden />
            Excel / CSV
          </button>
          <button
            type="button"
            onClick={downloadJson}
            className="border-border hover:bg-muted inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 font-medium"
          >
            <Download className="size-4" aria-hidden />
            JSON técnico
          </button>
          <button
            type="button"
            onClick={copyObservations}
            className="border-border hover:bg-muted inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 font-medium"
          >
            <Copy className="size-4" aria-hidden />
            {copied ? "Observaciones copiadas" : "Copiar observaciones"}
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
        <SummaryCard
          label="Trabajadores en LS"
          value={String(result.summary.workers_in_ls)}
          icon={Users}
        />
        <SummaryCard
          label="Correctos"
          value={String(
            result.summary.correct + result.summary.correct_with_rounding,
          )}
          icon={FileText}
        />
        <SummaryCard
          label="Documentación incompleta"
          value={String(result.summary.incomplete)}
          icon={AlertTriangle}
        />
        <SummaryCard
          label="Con diferencias o revisión"
          value={String(
            result.summary.with_errors +
              result.summary.manual_review +
              result.summary.with_warnings,
          )}
          icon={Banknote}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5 print:hidden">
        <AmountCard label="Nominal LS" value={totals.lsNominal} />
        <AmountCard label="Nominal recibos" value={totals.receiptNominal} />
        <AmountCard label="Nominal BPS" value={totals.payroll} />
        <AmountCard label="Líquido recibos" value={totals.receiptNet} />
        <AmountCard label="Transferido" value={totals.transferred} />
      </div>

      {diagnosis ? (
        <section className="border-accent bg-accent/40 mt-8 rounded-2xl border p-5 print:hidden">
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
        </section>
      ) : null}

      <section className="border-border bg-card mt-8 rounded-2xl border p-5 print:hidden">
        <h2 className="font-semibold">Documentos analizados</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Si un PDF de recibos aparece como liquidación, el cruce no puede
          completar líquido ni pagos.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground text-xs">
              <tr>
                <th className="py-2 font-medium">Archivo</th>
                <th className="py-2 font-medium">Clasificación</th>
                <th className="py-2 font-medium">Páginas</th>
                <th className="py-2 font-medium">Confianza</th>
                <th className="py-2 font-medium">Avisos</th>
              </tr>
            </thead>
            <tbody>
              {result.documents.map((document) => (
                <tr
                  key={document.document_id}
                  className="border-border border-t"
                >
                  <td className="py-3 font-medium">{document.filename}</td>
                  <td className="py-3">
                    <StatusBadge label={document.classification} />
                  </td>
                  <td className="py-3">{document.page_count ?? "—"}</td>
                  <td className="py-3">
                    {Math.round(document.confidence * 100)}%
                  </td>
                  <td className="text-muted-foreground py-3">
                    {document.warnings[0] ?? "Sin avisos"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-border bg-card mt-8 overflow-hidden rounded-2xl border">
        <div className="border-border border-b p-5">
          <h2 className="font-semibold">Comparación por trabajador</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Mismas columnas que la planilla de conciliación: nominal LS, recibo
            y nómina, líquido, transferencia, diferencias y estado.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                {ACCOUNTANT_REPORT_HEADERS.map((header) => (
                  <th
                    key={header}
                    className={`px-3 py-3 font-medium ${
                      header.startsWith("Importe") ||
                      header.startsWith("IMPORTE") ||
                      header.startsWith("RECIBO") ||
                      header.startsWith("TRANSFERENCIA") ||
                      header.startsWith("diferencias")
                        ? "text-right"
                        : ""
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.empleado}-${index}`}
                  className="border-border border-t align-top"
                >
                  <td className="px-3 py-3 font-medium">{row.empleado}</td>
                  <td className="text-muted-foreground px-3 py-3">
                    {row.categoriaMides ?? "—"}
                  </td>
                  <td className="px-3 py-3">{row.concepto ?? "—"}</td>
                  <td className="px-3 py-3 text-right">
                    {row.horasMensuales ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {formatAmount(row.importeNominalLs)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {formatAmount(row.importeNominalRecibo)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {formatAmount(row.importeNomina)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {formatAmount(row.reciboLiquido)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {formatAmount(row.transferencia)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {formatAmount(row.diferenciaNominalReciboNomina)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {formatAmount(row.diferenciaLiquidoReciboTransferencia)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {formatAmount(row.diferenciaNominalReciboLs)}
                  </td>
                  <td className="px-3 py-3">{row.estado || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(result.unmatched_records.receipts.length > 0 ||
        result.unmatched_records.transfers.length > 0 ||
        result.unmatched_records.payroll_entries.length > 0) && (
        <section className="border-border bg-card mt-6 rounded-2xl border p-5 text-sm print:hidden">
          <h2 className="font-semibold">Registros sin vincular</h2>
          <p className="text-muted-foreground mt-2">
            Nómina: {result.unmatched_records.payroll_entries.length} · Recibos:{" "}
            {result.unmatched_records.receipts.length} · Transferencias:{" "}
            {result.unmatched_records.transfers.length}. Quedan visibles para
            revisión manual.
          </p>
        </section>
      )}

      {result.incidents.length > 0 ? (
        <section className="border-border bg-card mt-6 rounded-2xl border p-5 print:hidden">
          <h2 className="font-semibold">Incidencias</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {result.incidents.slice(0, 12).map((incident) => (
              <li
                key={`${incident.code}-${incident.employment_record_id}-${incident.description}`}
                className="border-border flex flex-col gap-1 rounded-xl border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>{incident.description}</span>
                <StatusBadge
                  label={
                    incident.severity === "ERROR"
                      ? "ERROR"
                      : incident.severity === "WARNING"
                        ? "ADVERTENCIA"
                        : "CORRECTO_CON_OBSERVACION"
                  }
                />
              </li>
            ))}
          </ul>
          {result.incidents.length > 12 ? (
            <p className="text-muted-foreground mt-3 text-xs">
              Se muestran 12 de {result.incidents.length} incidencias. El JSON
              técnico conserva el listado completo.
            </p>
          ) : null}
        </section>
      ) : null}

      <button
        type="button"
        onClick={onBack}
        className="text-primary mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm hover:underline print:hidden"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver a controles
      </button>
    </div>
  );
}

function AmountCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-lg font-semibold">{formatMoneyValue(value)}</p>
    </div>
  );
}

function sumAmounts(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  if (!present.length) return null;
  return present.reduce((sum, value) => sum + value, 0);
}

function formatAmount(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("es-UY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
}

function formatMoneyValue(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: "UYU",
      }).format(value);
}
