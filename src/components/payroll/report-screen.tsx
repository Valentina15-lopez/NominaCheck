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
  buildReportDiagnosis,
  recordGaps,
} from "@/components/payroll/report-diagnosis";
import { StatusBadge, statusLabel, SummaryCard } from "@/components/payroll/ui";
import type {
  ControlInput,
  EmploymentRecord,
  MoneyField,
  NominaCheckResult,
  WorkerRecord,
} from "@/types/nominacheck";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const diagnosis = useMemo(() => buildReportDiagnosis(result), [result]);
  const rows = useMemo(
    () =>
      result.workers.flatMap((worker) =>
        worker.employment_records.map((record) => ({ worker, record })),
      ),
    [result.workers],
  );
  const totals = useMemo(() => {
    const values = rows.map(({ record }) => ({
      lsNominal: record.odoo?.nominal.normalized ?? null,
      lsNet: record.odoo?.net.normalized ?? null,
      payroll: record.payroll?.nominal.normalized ?? null,
      receiptNet: record.receipt?.net.normalized ?? null,
      transferred: record.proposed_transfer_total,
    }));
    return {
      lsNominal: sumAmounts(values.map((item) => item.lsNominal)),
      lsNet: sumAmounts(values.map((item) => item.lsNet)),
      payroll: sumAmounts(values.map((item) => item.payroll)),
      receiptNet: sumAmounts(values.map((item) => item.receiptNet)),
      transferred: sumAmounts(values.map((item) => item.transferred)),
    };
  }, [rows]);

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
    <div className="mx-auto max-w-7xl">
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AmountCard label="Nominal LS" value={totals.lsNominal} />
        <AmountCard label="Líquido LS" value={totals.lsNet} />
        <AmountCard label="Nominal BPS" value={totals.payroll} />
        <AmountCard label="Líquido recibos" value={totals.receiptNet} />
        <AmountCard label="Transferido" value={totals.transferred} />
      </div>

      {diagnosis ? (
        <section className="border-accent bg-accent/40 mt-8 rounded-2xl border p-5">
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

      <section className="border-border bg-card mt-8 rounded-2xl border p-5">
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
            LS frente a nómina BPS, recibo y banco. Abrí una fila para ver la
            evidencia.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Trabajador</th>
                <th className="px-4 py-3 font-medium">Cargo / AL</th>
                <th className="px-4 py-3 text-right font-medium">LS nominal</th>
                <th className="px-4 py-3 text-right font-medium">Nómina</th>
                <th className="px-4 py-3 text-right font-medium">
                  Recibo líquido
                </th>
                <th className="px-4 py-3 text-right font-medium">Banco</th>
                <th className="px-4 py-3 font-medium">Faltante</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ worker, record }) => {
                const expanded = expandedId === record.employment_record_id;
                const gaps = recordGaps(record);
                return (
                  <WorkerRows
                    key={record.employment_record_id}
                    worker={worker}
                    record={record}
                    expanded={expanded}
                    onToggle={() =>
                      setExpandedId(
                        expanded ? null : record.employment_record_id,
                      )
                    }
                    gaps={gaps}
                    incidents={result.incidents.filter(
                      (incident) =>
                        incident.employment_record_id ===
                          record.employment_record_id ||
                        incident.worker_id === worker.worker_id,
                    )}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {(result.unmatched_records.receipts.length > 0 ||
        result.unmatched_records.transfers.length > 0 ||
        result.unmatched_records.payroll_entries.length > 0) && (
        <section className="border-border bg-card mt-6 rounded-2xl border p-5 text-sm">
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
        <section className="border-border bg-card mt-6 rounded-2xl border p-5">
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

function WorkerRows({
  worker,
  record,
  expanded,
  onToggle,
  gaps,
  incidents,
}: {
  worker: WorkerRecord;
  record: EmploymentRecord;
  expanded: boolean;
  onToggle: () => void;
  gaps: { payroll: boolean; receipt: boolean; transfer: boolean };
  incidents: NominaCheckResult["incidents"];
}) {
  const missing = [
    gaps.payroll ? "Nómina" : null,
    gaps.receipt ? "Recibo" : null,
    gaps.transfer ? "Banco" : null,
  ].filter(Boolean);

  return (
    <>
      <tr className="border-border hover:bg-muted/30 border-t">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="text-left font-medium hover:underline"
          >
            {worker.identity.full_name.original ?? "Sin nombre"}
          </button>
          <p className="text-muted-foreground text-xs">
            {worker.identity.document_number.original ?? "Sin cédula"}
          </p>
        </td>
        <td className="text-muted-foreground px-4 py-3">
          {record.employment_accumulation.original ??
            record.position.original ??
            "Sin cargo"}
        </td>
        <td className="px-4 py-3 text-right">
          {formatMoneyValue(record.odoo?.nominal.normalized ?? null)}
        </td>
        <td className="px-4 py-3 text-right">
          {formatMoneyValue(record.payroll?.nominal.normalized ?? null)}
        </td>
        <td className="px-4 py-3 text-right">
          {formatMoneyValue(record.receipt?.net.normalized ?? null)}
        </td>
        <td className="px-4 py-3 text-right">
          {formatMoneyValue(record.proposed_transfer_total)}
        </td>
        <td className="px-4 py-3">
          {missing.length ? (
            <span className="text-accent-foreground text-xs">
              {missing.join(" · ")}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">Completo</span>
          )}
        </td>
        <td className="px-4 py-3">
          <StatusBadge label={record.proposed_status} />
        </td>
      </tr>
      {expanded ? (
        <tr className="border-border bg-muted/20 border-t">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <EvidenceBlock
                title="Liquidación LS"
                nominal={record.odoo?.nominal}
                net={record.odoo?.net}
              />
              <EvidenceBlock
                title="Nómina BPS"
                nominal={record.payroll?.nominal}
              />
              <EvidenceBlock
                title="Recibo"
                nominal={record.receipt?.nominal}
                net={record.receipt?.net}
              />
              <div className="bg-card rounded-xl p-3 text-sm">
                <p className="font-medium">Banco</p>
                <p className="mt-2">
                  Transferido:{" "}
                  {formatMoneyValue(record.proposed_transfer_total)}
                </p>
                <p>
                  Diferencia: {formatMoneyValue(record.transfer_difference)}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {record.transfers.length} movimiento
                  {record.transfers.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            {record.observations.length ? (
              <ul className="text-muted-foreground mt-3 list-disc pl-5 text-sm">
                {record.observations.map((observation) => (
                  <li key={observation}>{observation}</li>
                ))}
              </ul>
            ) : null}
            {incidents.length ? (
              <p className="text-muted-foreground mt-2 text-xs">
                {incidents
                  .map((incident) => incident.description)
                  .filter((item, index, list) => list.indexOf(item) === index)
                  .join(" · ")}
              </p>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function EvidenceBlock({
  title,
  nominal,
  net,
}: {
  title: string;
  nominal?: MoneyField;
  net?: MoneyField;
}) {
  return (
    <div className="bg-card rounded-xl p-3 text-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-2">Nominal: {formatMoneyField(nominal)}</p>
      {net ? <p>Líquido: {formatMoneyField(net)}</p> : null}
      <p className="text-muted-foreground mt-2 text-xs">
        {nominal?.source
          ? `Página ${nominal.source.page ?? "s/d"} · ${nominal.source.evidence ?? "sin cita"}`
          : "Sin evidencia"}
      </p>
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

function formatMoneyField(field: MoneyField | undefined) {
  return formatMoneyValue(field?.normalized ?? null);
}

function formatMoneyValue(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("es-UY", {
        style: "currency",
        currency: "UYU",
      }).format(value);
}
