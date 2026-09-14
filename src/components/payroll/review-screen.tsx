import { XCircle } from "lucide-react";
import { DetailCard, StatusBadge, StatusDot } from "@/components/payroll/ui";
import { WORKERS } from "@/constants/payroll";

export function ReviewScreen({
  selected,
  setSelected,
  onContinue,
}: {
  selected: number;
  setSelected: (index: number) => void;
  onContinue: () => void;
}) {
  const worker = WORKERS[selected] ?? WORKERS[0]!;

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
            Trabajadores · {WORKERS.length}
          </p>
          {WORKERS.map((item, index) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelected(index)}
              className={`hover:bg-muted flex w-full items-center justify-between rounded-xl p-3 text-left ${
                selected === index ? "bg-primary/10" : ""
              }`}
            >
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-muted-foreground text-xs">{item.id}</p>
              </div>
              <StatusDot status={item.status} />
            </button>
          ))}
        </div>

        <div className="border-border bg-card rounded-2xl border p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-muted-foreground text-sm">
                Trabajador {selected + 1} de {WORKERS.length}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{worker.name}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {worker.area} · DNI {worker.id}
              </p>
            </div>
            <StatusBadge label={worker.status} />
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <DetailCard label="Nómina" value={worker.amount} />
            <DetailCard label="LS" value={worker.amount} />
            <DetailCard
              label="Transferencia"
              value={
                worker.status === "Con diferencias"
                  ? "$ 950.000"
                  : worker.amount
              }
            />
          </div>
          {worker.status === "Con diferencias" ? (
            <div className="border-destructive/30 bg-destructive/5 mt-6 flex gap-3 rounded-xl border p-4 text-sm">
              <XCircle
                className="text-destructive mt-0.5 size-5 shrink-0"
                aria-hidden
              />
              <div>
                <p className="font-medium">Diferencia detectada</p>
                <p className="text-muted-foreground mt-1">
                  La transferencia no coincide con el importe de la liquidación.
                </p>
              </div>
            </div>
          ) : null}
          <div className="mt-8 flex justify-between gap-3">
            <button
              type="button"
              disabled={selected === 0}
              onClick={() => setSelected(selected - 1)}
              className="border-border h-10 rounded-xl border px-4 text-sm disabled:opacity-40"
            >
              Anterior
            </button>
            {selected < WORKERS.length - 1 ? (
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
