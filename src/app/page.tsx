"use client";

import Link from "next/link";
import { ArrowRight, FileCheck2, Plus } from "lucide-react";
import { useControlStore } from "@/components/nomina/control-store";
import {
  EmptyState,
  formatPeriod,
  LoadingState,
  PageShell,
  StatusBadge,
} from "@/components/nomina/ui";
import type { SalaryControl } from "@/types/nomina";

function controlHref(control: SalaryControl) {
  if (control.status === "processing")
    return `/controles/${control.id}/procesando`;
  if (control.status === "completed") return `/controles/${control.id}`;
  return `/controles/${control.id}/documentos`;
}

export default function DashboardPage() {
  const { controls, hydrated } = useControlStore();

  return (
    <PageShell
      eyebrow="Espacio de trabajo"
      title="Controles de nómina"
      description="Revisá los controles existentes o iniciá una nueva conciliación salarial."
    >
      <div className="mt-10 flex justify-end">
        <Link
          href="/controles/nuevo"
          className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold hover:opacity-90"
        >
          <Plus className="size-4" />
          Nuevo control
        </Link>
      </div>

      {!hydrated ? (
        <LoadingState label="Cargando controles…" />
      ) : controls.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Todavía no hay controles"
            description="Creá el primero para comenzar a revisar la documentación salarial."
          />
        </div>
      ) : (
        <div className="border-border bg-card mt-6 overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-border bg-muted/50 text-muted-foreground border-b text-xs">
              <tr>
                <th className="px-5 py-4 font-medium">Empresa</th>
                <th className="px-5 py-4 font-medium">Período</th>
                <th className="px-5 py-4 font-medium">Trabajadores</th>
                <th className="px-5 py-4 font-medium">Estado</th>
                <th className="px-5 py-4 text-right font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {controls.map((control) => (
                <tr
                  key={control.id}
                  className="border-border hover:bg-muted/40 border-b transition-colors last:border-0"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                        <FileCheck2 className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium">{control.company}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Creado el{" "}
                          {new Date(control.createdAt).toLocaleDateString(
                            "es-UY",
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted-foreground px-5 py-4">
                    {formatPeriod(control.period)}
                  </td>
                  <td className="px-5 py-4 font-medium">
                    {control.workers.length || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={control.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={controlHref(control)}
                      aria-label={`Abrir control de ${control.company}`}
                      className="text-primary hover:bg-primary/10 inline-flex items-center gap-2 rounded-lg px-2 py-1 font-medium"
                    >
                      Abrir <ArrowRight className="size-4" />
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
