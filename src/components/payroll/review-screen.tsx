import { AlertTriangle, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { DetailCard, StatusBadge } from "@/components/payroll/ui";
import type {
  ExtractedField,
  MoneyField,
  NominaCheckResult,
} from "@/types/nominacheck";

export function ReviewScreen({
  result,
  selected,
  setSelected,
  onContinue,
}: {
  result: NominaCheckResult;
  selected: number;
  setSelected: (index: number) => void;
  onContinue: () => void;
}) {
  const [selectedRecord, setSelectedRecord] = useState(0);
  const [confirmedRecords, setConfirmedRecords] = useState<string[]>([]);
  const worker = result.workers[selected] ?? result.workers[0];
  const record = worker?.employment_records[selectedRecord];

  useEffect(() => setSelectedRecord(0), [selected]);
  useEffect(() => {
    const stored = sessionStorage.getItem("nominacheck:human-confirmations");
    if (!stored) return;
    try {
      setConfirmedRecords(JSON.parse(stored) as string[]);
    } catch {
      sessionStorage.removeItem("nominacheck:human-confirmations");
    }
  }, []);

  function confirmRecord(recordId: string) {
    const next = [...new Set([...confirmedRecords, recordId])];
    setConfirmedRecords(next);
    sessionStorage.setItem(
      "nominacheck:human-confirmations",
      JSON.stringify(next),
    );
  }

  if (!worker || !record) {
    return (
      <div className="border-border bg-card rounded-2xl border p-6">
        <h1 className="text-2xl font-semibold">Sin casos conciliables</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          No se encontró una LS procesable que defina la población del control.
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="bg-primary text-primary-foreground mt-6 h-10 rounded-xl px-4 text-sm font-medium"
        >
          Ver resultados
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="text-primary text-sm font-medium">Paso 4 de 6</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Revisión de trabajadores
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Revisá las diferencias detectadas antes de confirmar el control.
      </p>
      <div className="mt-8 grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="border-border bg-card rounded-2xl border p-3">
          <p className="text-muted-foreground px-3 py-2 text-xs font-semibold tracking-wider uppercase">
            Trabajadores · {result.workers.length}
          </p>
          {result.workers.map((item, index) => (
            <button
              type="button"
              key={item.worker_id}
              onClick={() => setSelected(index)}
              className={`hover:bg-muted flex w-full items-center justify-between rounded-xl p-3 text-left ${
                selected === index ? "bg-primary/10" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {displayField(item.identity.full_name)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {displayField(item.identity.document_number)}
                </p>
              </div>
              <span
                className={`size-2.5 shrink-0 rounded-full ${
                  item.employment_records.some((entry) =>
                    ["ERROR", "NO_PROCESABLE"].includes(entry.proposed_status),
                  )
                    ? "bg-destructive"
                    : item.employment_records.every((entry) =>
                          entry.proposed_status.startsWith("CORRECTO"),
                        )
                      ? "bg-primary"
                      : "bg-accent-foreground"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="border-border bg-card rounded-2xl border p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-muted-foreground text-sm">
                Trabajador {selected + 1} de {result.workers.length}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">
                {displayField(worker.identity.full_name)}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Cédula {displayField(worker.identity.document_number)}
              </p>
            </div>
            <StatusBadge label={record.proposed_status} />
          </div>
          {worker.employment_records.length > 1 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {worker.employment_records.map((item, index) => (
                <button
                  key={item.employment_record_id}
                  type="button"
                  onClick={() => setSelectedRecord(index)}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    selectedRecord === index
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border"
                  }`}
                >
                  {displayField(item.employment_accumulation)} ·{" "}
                  {displayField(item.concept)}
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            <DetailCard
              label="Nominal LS"
              value={formatMoney(record.odoo?.nominal)}
            />
            <DetailCard
              label="Nominal nómina"
              value={formatMoney(record.payroll?.nominal)}
            />
            <DetailCard
              label="Nominal recibo"
              value={formatMoney(record.receipt?.nominal)}
            />
            <DetailCard
              label="Líquido / transferido"
              value={`${formatMoney(record.receipt?.net)} / ${formatNumber(
                record.proposed_transfer_total,
              )}`}
            />
          </div>
          {record.observations.length ? (
            <div className="border-accent bg-accent/30 mt-6 flex gap-3 rounded-xl border p-4 text-sm">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">Observaciones</p>
                <ul className="text-muted-foreground mt-1 list-disc pl-4">
                  {record.observations.map((observation) => (
                    <li key={observation}>{observation}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
          <section className="mt-6">
            <h3 className="font-semibold">Transferencias individuales</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground text-xs">
                  <tr>
                    <th className="py-2">Beneficiario</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Fecha</th>
                    <th className="py-2 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {record.transfers.map((transfer) => (
                    <tr
                      key={transfer.transfer_id}
                      className="border-border border-t"
                    >
                      <td className="py-2">
                        {displayField(transfer.beneficiary)}
                      </td>
                      <td className="py-2">{transfer.payment_type}</td>
                      <td className="py-2">
                        {displayField(transfer.payment_date)}
                      </td>
                      <td className="py-2 text-right">
                        {formatMoney(transfer.amount)}
                      </td>
                    </tr>
                  ))}
                  {!record.transfers.length ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-muted-foreground border-border border-t py-3"
                      >
                        No hay movimientos distribuidos a esta acumulación.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
          <section className="mt-6">
            <h3 className="font-semibold">Evidencia y confianza</h3>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              {[
                record.odoo?.nominal,
                record.payroll?.nominal,
                record.receipt?.nominal,
                record.receipt?.net,
              ].map((field, index) =>
                field?.source ? (
                  <div
                    key={`${field.source.document_id}-${index}`}
                    className="bg-muted rounded-lg p-3"
                  >
                    <p className="font-medium">
                      Confianza {Math.round(field.confidence * 100)}%
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {field.source.document_id} · página{" "}
                      {field.source.page ?? "sin identificar"}
                    </p>
                    <p className="mt-1">
                      {field.source.evidence ?? "Sin cita"}
                    </p>
                  </div>
                ) : null,
              )}
            </div>
            {record.matching.requires_human_confirmation ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-accent-foreground flex items-center gap-2 text-xs">
                  <ExternalLink className="size-3" aria-hidden />
                  La coincidencia propuesta requiere confirmación humana.
                </p>
                <button
                  type="button"
                  disabled={confirmedRecords.includes(
                    record.employment_record_id,
                  )}
                  onClick={() => confirmRecord(record.employment_record_id)}
                  className="border-border hover:bg-muted rounded-lg border px-3 py-2 text-xs disabled:opacity-60"
                >
                  {confirmedRecords.includes(record.employment_record_id)
                    ? "Revisión registrada"
                    : "Registrar revisión humana"}
                </button>
              </div>
            ) : null}
          </section>
          <div className="mt-8 flex justify-between gap-3">
            <button
              type="button"
              disabled={selected === 0}
              onClick={() => setSelected(selected - 1)}
              className="border-border h-10 rounded-xl border px-4 text-sm disabled:opacity-40"
            >
              Anterior
            </button>
            {selected < result.workers.length - 1 ? (
              <button
                type="button"
                onClick={() => setSelected(selected + 1)}
                className="bg-primary text-primary-foreground h-10 rounded-xl px-4 text-sm font-medium"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={onContinue}
                className="bg-primary text-primary-foreground h-10 rounded-xl px-4 text-sm font-medium"
              >
                Confirmar revisión
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function displayField(field: ExtractedField<unknown> | undefined) {
  if (!field) return "No disponible";
  return String(field.original ?? field.normalized ?? "No disponible");
}

function formatMoney(field: MoneyField | undefined) {
  return field?.normalized === null || field?.normalized === undefined
    ? "No disponible"
    : `${field.currency ?? "UYU"} ${formatNumber(field.normalized)}`;
}

function formatNumber(value: number | null) {
  return value === null
    ? "No disponible"
    : new Intl.NumberFormat("es-UY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
}
