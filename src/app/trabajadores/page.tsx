"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Plus, Search } from "lucide-react";
import { useControlStore } from "@/components/nomina/control-store";
import {
  EmptyState,
  formatMoney,
  LoadingState,
  PageShell,
  StatusBadge,
} from "@/components/nomina/ui";

export default function WorkersPage() {
  const { controls, hydrated } = useControlStore();
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState(false);

  const workers = useMemo(() => {
    const values = new Map<
      string,
      {
        controlId: string;
        worker: (typeof controls)[number]["workers"][number];
      }
    >();
    controls.forEach((control) =>
      control.workers.forEach((worker) => {
        if (!values.has(worker.id))
          values.set(worker.id, { controlId: control.id, worker });
      }),
    );
    const normalized = query.trim().toLocaleLowerCase("es");
    return Array.from(values.values()).filter(
      ({ worker }) =>
        !normalized ||
        worker.name.toLocaleLowerCase("es").includes(normalized) ||
        worker.id.includes(normalized),
    );
  }, [controls, query]);

  return (
    <PageShell
      eyebrow="Espacio de trabajo"
      title="Trabajadores"
      description="Consultá las personas incluidas en tus controles y sus datos de liquidación."
    >
      <div className="mt-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="border-border bg-card focus:border-primary h-10 w-full rounded-xl border pr-3 pl-9 text-sm outline-none"
            placeholder="Buscar trabajador"
          />
        </div>
        <button
          onClick={() => setNotice(true)}
          className="bg-primary text-primary-foreground inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
        >
          <Plus className="size-4" /> Nuevo trabajador
        </button>
      </div>
      {notice && (
        <p className="bg-primary/10 text-primary mt-4 rounded-xl px-4 py-3 text-sm">
          Los trabajadores se incorporan automáticamente desde la LS de cada
          control.
        </p>
      )}
      {!hydrated ? (
        <LoadingState />
      ) : workers.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No hay trabajadores"
            description="No encontramos personas que coincidan con la búsqueda."
          />
        </div>
      ) : (
        <div className="border-border bg-card mt-6 overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-border bg-muted/50 text-muted-foreground border-b text-xs">
              <tr>
                <th className="px-5 py-4 font-medium">Trabajador</th>
                <th className="px-5 py-4 font-medium">Cargo</th>
                <th className="px-5 py-4 font-medium">Sueldo nominal</th>
                <th className="px-5 py-4 font-medium">Estado</th>
                <th className="px-5 py-4 text-right font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(({ controlId, worker }) => (
                <tr
                  key={worker.id}
                  className="border-border border-b last:border-0"
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
