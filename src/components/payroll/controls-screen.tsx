import { BarChart3, ClipboardCheck, Plus, Search, Users } from "lucide-react";
import { StatusBadge, SummaryCard } from "@/components/payroll/ui";

const recentControls = [
  {
    company: "Acme Servicios S.A.",
    period: "Agosto 2026",
    date: "05/09/2026",
    status: "Correcto",
  },
  {
    company: "Acme Servicios S.A.",
    period: "Julio 2026",
    date: "07/08/2026",
    status: "Correcto",
  },
  {
    company: "Grupo Norte S.R.L.",
    period: "Agosto 2026",
    date: "04/09/2026",
    status: "Pendiente",
  },
];

export function ControlsScreen({
  onNew,
  onOpen,
}: {
  onNew: () => void;
  onOpen: () => void;
}) {
  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-primary text-sm font-medium">Gestión salarial</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Tus controles
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Consultá el estado de tus controles y abrí nuevos períodos.
          </p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 font-medium hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden />
          Nuevo control
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Controles activos" value="3" icon={BarChart3} />
        <SummaryCard label="Trabajadores revisados" value="248" icon={Users} />
        <SummaryCard label="Pendientes" value="12" icon={ClipboardCheck} />
      </div>

      <div className="border-border bg-card mt-8 overflow-hidden rounded-2xl border">
        <div className="border-border flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center">
          <h2 className="font-semibold">Controles recientes</h2>
          <div className="border-input text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <Search className="size-4" aria-hidden />
            Buscar control
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="px-5 py-3 font-medium">Empresa</th>
                <th className="px-5 py-3 font-medium">Período</th>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {recentControls.map((control) => (
                <tr
                  key={`${control.company}-${control.period}`}
                  className="border-border hover:bg-muted/30 border-t"
                >
                  <td className="px-5 py-4 font-medium">{control.company}</td>
                  <td className="text-muted-foreground px-5 py-4">
                    {control.period}
                  </td>
                  <td className="text-muted-foreground px-5 py-4">
                    {control.date}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge label={control.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={onOpen}
                      className="text-primary hover:underline"
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
