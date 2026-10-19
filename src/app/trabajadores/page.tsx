"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useControlStore } from "@/components/nomina/control-store";
import {
  EmptyState,
  formatMoney,
  formatPeriod,
  PageShell,
  StatusBadge,
} from "@/components/nomina/ui";

export default function WorkersPage() {
  const { controls, error } = useControlStore();
  const [query, setQuery] = useState("");

  // Una persona puede aparecer en varios controles; se muestra la fila del
  // control más reciente, que es el primero que devuelve la base.
  const workers = useMemo(() => {
    const latest = new Map<
      string,
      {
        controlId: string;
        period: string;
        worker: (typeof controls)[number]["workers"][number];
      }
    >();
    for (const control of controls) {
      for (const worker of control.workers) {
        if (!latest.has(worker.documentNumber)) {
          latest.set(worker.documentNumber, {
            controlId: control.id,
            period: control.period,
            worker,
          });
        }
      }
    }
    const normalized = query.trim().toLocaleLowerCase("es");
    return [...latest.values()].filter(
      ({ worker }) =>
        !normalized ||
        worker.name.toLocaleLowerCase("es").includes(normalized) ||
        worker.documentNumber.includes(normalized),
    );
  }, [controls, query]);

  return (
    <PageShell
      eyebrow="Espacio de trabajo"
      title="Trabajadores"
      description="Las personas se incorporan automáticamente desde la LS de cada control; no se cargan a mano."
    >
      {error && (
        <p
          role="alert"
          className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="mt-10 max-w-sm">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="border-border bg-card focus:border-primary h-10 w-full rounded-xl border pr-3 pl-9 text-sm outline-none"
            placeholder="Buscar por nombre o cédula"
          />
        </div>
      </div>
      {workers.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No hay trabajadores"
            description={
              controls.length
                ? "No encontramos personas que coincidan con la búsqueda."
                : "Analizá un control para que aparezcan las personas de la LS."
            }
          />
        </div>
      ) : (
        <div className="border-border bg-card mt-6 overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-border bg-muted/50 text-muted-foreground border-b text-xs">
              <tr>
                <th className="px-5 py-4 font-medium">Trabajador</th>
                <th className="px-5 py-4 font-medium">Cargo</th>
                <th className="px-5 py-4 font-medium">Último período</th>
                <th className="px-5 py-4 font-medium">Nominal Odoo</th>
                <th className="px-5 py-4 font-medium">Estado</th>
                <th className="px-5 py-4 text-right font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(({ controlId, period, worker }) => (
                <tr
                  key={worker.id}
                  className="border-border border-b last:border-0"
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
                  <td className="text-muted-foreground px-5 py-4">
                    {formatPeriod(period)}
                  </td>
                  <td className="px-5 py-4 font-medium">
                    {formatMoney(worker.odooNominal)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={worker.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/controles/${controlId}/trabajadores/${worker.id}`}
                      className="text-primary inline-flex items-center gap-2 text-xs font-semibold hover:underline"
                    >
                      Abrir <ArrowRight className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
