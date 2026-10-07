"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Eye,
  FileSpreadsheet,
  FileText,
  Landmark,
  Link2,
  Pencil,
  Users,
} from "lucide-react";
import { documentPreviewUrlAction } from "@/app/controles/actions";
import { useControlStore } from "@/components/nomina/control-store";
import {
  DocumentPreview,
  formatMoney,
  formatPeriod,
  PageShell,
  StatusBadge,
} from "@/components/nomina/ui";

type PreviewState = {
  name: string;
  url: string | null;
  status: "loading" | "ready" | "unavailable";
};

function Comparison({
  label,
  leftLabel,
  left,
  rightLabel,
  right,
}: {
  label: string;
  leftLabel: string;
  left?: number;
  rightLabel: string;
  right?: number;
}) {
  const matches = left !== undefined && right !== undefined && left === right;
  const difference = (right ?? 0) - (left ?? 0);
  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            matches
              ? "bg-primary/10 text-primary"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {matches ? (
            <Check className="size-3.5" />
          ) : (
            <AlertTriangle className="size-3.5" />
          )}
          {matches ? "Coincide" : "Diferencia"}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-muted-foreground text-xs">{leftLabel}</p>
          <p className="mt-1 font-semibold">{formatMoney(left)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{rightLabel}</p>
          <p className="mt-1 font-semibold">{formatMoney(right)}</p>
        </div>
      </div>
      {!matches && left !== undefined && right !== undefined && (
        <p className="mt-4 text-xs font-medium text-amber-700">
          Diferencia: {formatMoney(Math.abs(difference))}
        </p>
      )}
    </div>
  );
}

export default function WorkerDetailPage() {
  const { controlId, workerId } = useParams<{
    controlId: string;
    workerId: string;
  }>();
  const {
    controls,
    busy,
    error,
    confirmAssociation,
    reassignTransfer,
    markReviewed,
  } = useControlStore();
  const control = controls.find((item) => item.id === controlId);
  const worker = control?.workers.find((item) => item.id === workerId);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [targetWorker, setTargetWorker] = useState("");

  // El bucket es privado: la URL se firma en el servidor al abrir el modal.
  async function openPreview(
    name: string,
    reference: { documentId?: string; analysisDocumentId?: string },
  ) {
    setPreview({ name, url: null, status: "loading" });
    if (!reference.documentId && !reference.analysisDocumentId) {
      setPreview({ name, url: null, status: "unavailable" });
      return;
    }
    const result = await documentPreviewUrlAction(controlId, reference);
    const url = result.ok ? result.data : null;
    setPreview({ name, url, status: url ? "ready" : "unavailable" });
  }

  if (!control || !worker) {
    return (
      <PageShell
        eyebrow="Trabajador no encontrado"
        title="No pudimos abrir este detalle"
        description="El control o trabajador solicitado no existe."
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

  const transferTotal = worker.transfers.reduce(
    (total, transfer) => total + transfer.amount,
    0,
  );
  const lsDocument = control.documents.find(
    (document) => document.kind === "ls",
  );
  const payrollDocument = control.documents.find(
    (document) => document.kind === "payroll",
  );

  return (
    <>
      <PageShell
        eyebrow={`${control.company} · ${formatPeriod(control.period)}`}
        title={worker.name}
        description={`CI ${worker.documentNumber} · ${worker.role}`}
      >
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/controles/${control.id}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="size-4" /> Volver a resultados
          </Link>
          <StatusBadge status={worker.status} />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <section className="mt-8">
          <h2 className="font-semibold">Comparación de importes</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Comparison
              label="Nominal informado"
              leftLabel="LS / Odoo"
              left={worker.odooNominal}
              rightLabel="Nómina"
              right={worker.payrollNominal}
            />
            <Comparison
              label="Nominal documentado"
              leftLabel="Nómina"
              left={worker.payrollNominal}
              rightLabel="Recibo"
              right={worker.receiptNominal}
            />
            <Comparison
              label="Pago realizado"
              leftLabel="Líquido del recibo"
              left={worker.receiptLiquid}
              rightLabel="Total transferido"
              right={transferTotal}
            />
          </div>
        </section>

        {worker.observation && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
              <div className="flex-1">
                <h2 className="font-semibold text-amber-900">Observación</h2>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  {worker.observation}
                </p>
                <button
                  disabled={worker.reviewed || busy}
                  onClick={() => void markReviewed(worker.id)}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-amber-300 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                >
                  <Check className="size-3.5" />
                  {worker.reviewed
                    ? "Observación revisada"
                    : "Marcar como revisada"}
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="font-semibold">Trazabilidad documental</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Documentos utilizados para asociar y conciliar a esta persona.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <article className="border-border bg-card rounded-2xl border p-5">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">LS / Odoo</h3>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Fuente principal · {formatMoney(worker.odooNominal)}
                  </p>
                </div>
              </div>
              {lsDocument && (
                <button
                  onClick={() =>
                    void openPreview(lsDocument.name, {
                      documentId: lsDocument.id,
                    })
                  }
                  className="text-primary mt-5 inline-flex items-center gap-2 text-xs font-semibold hover:underline"
                >
                  <Eye className="size-3.5" /> Previsualizar {lsDocument.name}
                </button>
              )}
            </article>
            <article className="border-border bg-card rounded-2xl border p-5">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                  <Users className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Nómina</h3>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Nominal informado · {formatMoney(worker.payrollNominal)}
                  </p>
                </div>
              </div>
              {payrollDocument && (
                <button
                  onClick={() =>
                    void openPreview(payrollDocument.name, {
                      documentId: payrollDocument.id,
                    })
                  }
                  className="text-primary mt-5 inline-flex items-center gap-2 text-xs font-semibold hover:underline"
                >
                  <Eye className="size-3.5" /> Previsualizar{" "}
                  {payrollDocument.name}
                </button>
              )}
            </article>
            <article className="border-border bg-card rounded-2xl border p-5">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Recibos de sueldo</h3>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {worker.receipts.length} documento
                    {worker.receipts.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {worker.receipts.length === 0 && (
                  <p className="bg-muted text-muted-foreground rounded-xl p-3 text-xs">
                    No se encontraron recibos asociados.
                  </p>
                )}
                {worker.receipts.map((receipt) => (
                  <button
                    key={receipt.id}
                    onClick={() =>
                      void openPreview(receipt.name, {
                        analysisDocumentId: receipt.sourceDocumentId,
                      })
                    }
                    className="border-border hover:bg-muted flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left"
                  >
                    <span className="min-w-0 truncate text-xs font-medium">
                      {receipt.name}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatMoney(receipt.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </article>
            <article className="border-border bg-card rounded-2xl border p-5">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                  <Landmark className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Transferencias</h3>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {worker.transfers.length} pago
                    {worker.transfers.length === 1 ? "" : "s"} · Total{" "}
                    {formatMoney(transferTotal)}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {worker.transfers.length === 0 && (
                  <p className="bg-muted text-muted-foreground rounded-xl p-3 text-xs">
                    No hay transferencias asociadas.
                  </p>
                )}
                {worker.transfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="border-border rounded-xl border p-3"
                  >
                    <button
                      onClick={() =>
                        void openPreview(transfer.name, {
                          analysisDocumentId: transfer.sourceDocumentId,
                        })
                      }
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="min-w-0 truncate text-xs font-medium">
                        {transfer.name}
                      </span>
                      <span className="shrink-0 text-xs font-semibold">
                        {formatMoney(transfer.amount)}
                      </span>
                    </button>
                    {(transfer.reference || transfer.date) && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {[transfer.reference, transfer.date]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {transfer.sharedWith?.length ? (
                      <p className="mt-2 flex items-center gap-1 text-xs text-amber-700">
                        <Link2 className="size-3.5" /> Pago compartido con{" "}
                        {transfer.sharedWith.join(", ")}
                      </p>
                    ) : null}
                    {transfer.associationStatus === "suggested" && (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        Asociación sugerida — requiere confirmación
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {transfer.associationStatus === "suggested" && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            void confirmAssociation(worker.id, transfer.id)
                          }
                          className="bg-primary text-primary-foreground inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold disabled:opacity-50"
                        >
                          <Check className="size-3.5" /> Confirmar asociación
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setCorrecting(transfer.id);
                          setTargetWorker("");
                        }}
                        className="border-border hover:bg-muted inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs font-medium"
                      >
                        <Pencil className="size-3.5" /> Corregir asociación
                      </button>
                    </div>
                    {correcting === transfer.id && (
                      <div className="bg-muted mt-3 flex flex-col gap-2 rounded-lg p-3 sm:flex-row">
                        <select
                          value={targetWorker}
                          onChange={(event) =>
                            setTargetWorker(event.target.value)
                          }
                          className="border-border bg-card h-9 flex-1 rounded-lg border px-2 text-xs"
                          aria-label="Asignar transferencia a otro trabajador"
                        >
                          <option value="">Seleccionar trabajador</option>
                          {control.workers
                            .filter((item) => item.id !== worker.id)
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>
                        <button
                          disabled={!targetWorker || busy}
                          onClick={async () => {
                            await reassignTransfer(
                              worker.id,
                              transfer.id,
                              targetWorker,
                            );
                            setCorrecting(null);
                          }}
                          className="bg-primary text-primary-foreground h-9 rounded-lg px-3 text-xs font-semibold disabled:opacity-40"
                        >
                          Guardar corrección
                        </button>
                        <button
                          onClick={() => setCorrecting(null)}
                          className="hover:bg-card h-9 rounded-lg px-3 text-xs font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </PageShell>
      {preview && (
        <DocumentPreview
          name={preview.name}
          url={preview.url}
          status={preview.status}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
