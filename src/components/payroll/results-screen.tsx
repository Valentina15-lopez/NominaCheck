import { ArrowRight, CheckCircle2, Users, XCircle } from "lucide-react";
import { StatusBadge, SummaryCard } from "@/components/payroll/ui";
import { WORKERS } from "@/constants/payroll";

export function ResultsScreen({
  onSelect,
  onFinish,
}: {
  onSelect: (index: number) => void;
  onFinish: () => void;
}) {
  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-primary text-sm font-medium">Paso 5 de 6</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Resultados del control
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Resumen de las verificaciones del período Agosto 2026.
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
        <SummaryCard label="Trabajadores" value="248" icon={Users} />
        <SummaryCard label="Correctos" value="231" icon={CheckCircle2} />
        <SummaryCard label="Con diferencias" value="17" icon={XCircle} />
      </div>
      <div className="border-border bg-card mt-8 overflow-hidden rounded-2xl border">
        <div className="border-border flex items-center justify-between border-b p-5">
          <h2 className="font-semibold">Detalle por trabajador</h2>
          <label>
            <span className="sr-only">Filtrar por estado</span>
            <select className="border-input bg-background rounded-lg border px-3 py-2 text-xs">
              <option>Todos los estados</option>
              <option>Correcto</option>
              <option>Con diferencias</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="px-5 py-3 font-medium">Trabajador</th>
                <th className="px-5 py-3 font-medium">Área</th>
                <th className="px-5 py-3 font-medium">Importe</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {WORKERS.map((worker, index) => (
                <tr
                  key={worker.id}
                  className="border-border hover:bg-muted/30 border-t"
                >
                  <td className="px-5 py-4 font-medium">
                    {worker.name}
                    <span className="text-muted-foreground ml-2 text-xs font-normal">
                      {worker.id}
                    </span>
                  </td>
                  <td className="text-muted-foreground px-5 py-4">
                    {worker.area}
                  </td>
                  <td className="px-5 py-4">{worker.amount}</td>
                  <td className="px-5 py-4">
                    <StatusBadge label={worker.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSelect(index)}
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
    </>
  );
}
