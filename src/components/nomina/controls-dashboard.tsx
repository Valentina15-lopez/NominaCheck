"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useControlStore } from "@/components/nomina/control-store";
import {
  EmptyState,
  formatPeriod,
  Metric,
  PageShell,
  StatusBadge,
} from "@/components/nomina/ui";
import type { SalaryControl } from "@/types/nomina";

/** La fila del control lleva al paso que falta completar. */
function nextStepHref(control: SalaryControl) {
  if (control.status === "completed") return `/controles/${control.id}`;
  if (control.status === "processing")
    return `/controles/${control.id}/procesando`;
  return `/controles/${control.id}/documentos`;
}

export function ControlsDashboard() {
  const { controls, error } = useControlStore();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return controls;
    return controls.filter(
      (control) =>
        control.company.toLocaleLowerCase("es").includes(normalized) ||
        control.period.includes(normalized),
    );
  }, [controls, query]);

  const workers = controls.flatMap((control) => control.workers);
  const inProgress = controls.filter(
    (control) => control.status !== "completed",
  ).length;
  const needAttention = workers.filter(
    (worker) => worker.status !== "correct",
  ).length;

  return (
    <PageShell
      eyebrow="Gestión salarial"
      title="Tus controles"
      description="Consultá el estado de tus controles y abrí nuevos períodos."
    >
      {error && (
        <p
          role="alert"
          className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Metric
          icon={BarChart3}
          label="Controles en curso"
          value={inProgress}
        />
        <Metric
          icon={Users}
          label="Trabajadores analizados"
          value={workers.length}
        />
        <Metric
          icon={AlertTriangle}
          label="Requieren atención"
          value={needAttention}
        />
      </div>

      <section className="border-border bg-card mt-8 overflow-hidden rounded-2xl border">
        <div className="border-border flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center">
          <h2 className="font-semibold">Controles recientes</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="border-border bg-background focus:border-primary h-10 w-full rounded-xl border pr-3 pl-9 text-sm outline-none sm:w-60"
                placeholder="Buscar por empresa o período"
              />
            </div>
            <Link
              href="/controles/nuevo"
              className="bg-primary text-primary-foreground inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold hover:opacity-90"
            >
              <Plus className="size-4" aria-hidden />
              Nuevo control
            </Link>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={
                controls.length
                  ? "Sin coincidencias"
                  : "Todavía no hay controles"
              }
              description={
                controls.length
                  ? "Probá con otra empresa o período."
                  : "Creá tu primer control para cargar la LS, la nómina, los recibos y las transferencias."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground border-border border-b text-xs">
                <tr>
                  <th className="px-5 py-3 font-medium">Empresa</th>
                  <th className="px-5 py-3 font-medium">Período</th>
                  <th className="px-5 py-3 font-medium">Creado</th>
                  <th className="px-5 py-3 font-medium">Trabajadores</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 text-right font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((control) => (
                  <tr
                    key={control.id}
                    className="border-border hover:bg-muted/30 border-b last:border-0"
                  >
                    <td className="px-5 py-4 font-medium">{control.company}</td>
                    <td className="text-muted-foreground px-5 py-4">
                      {formatPeriod(control.period)}
                    </td>
                    <td className="text-muted-foreground px-5 py-4">
                      {new Date(control.createdAt).toLocaleDateString("es-UY")}
                    </td>
                    <td className="text-muted-foreground px-5 py-4">
                      {control.workers.length}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={control.status} />
                      {control.processingError && (
                        <p className="mt-1 text-xs text-red-700">
                          {control.processingError}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={nextStepHref(control)}
                        className="text-primary hover:bg-primary/10 inline-flex items-center gap-2 rounded-lg px-2 py-1 font-medium"
                      >
                        {control.status === "completed" ? "Abrir" : "Continuar"}
                        <ArrowRight className="size-4" />
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
