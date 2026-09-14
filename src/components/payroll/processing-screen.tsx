import { ArrowRight, CheckCircle2 } from "lucide-react";

const categories = ["Nómina", "LS", "Recibos", "Transferencias"];

export function ProcessingScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-primary text-sm font-medium">Paso 3 de 6</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Procesando el control
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Las cuatro categorías se están leyendo en paralelo.
      </p>
      <div className="border-border bg-card mt-8 rounded-2xl border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Procesamiento completo</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Todos los documentos fueron incorporados.
            </p>
          </div>
          <CheckCircle2 className="text-primary size-7" aria-hidden />
        </div>
        <div className="bg-muted mt-6 h-2 overflow-hidden rounded-full">
          <div className="bg-primary h-full w-full rounded-full" />
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <div
              key={category}
              className="bg-muted/60 flex items-center gap-3 rounded-xl p-4"
            >
              <CheckCircle2 className="text-primary size-5" aria-hidden />
              <div>
                <p className="text-sm font-medium">{category}</p>
                <p className="text-muted-foreground text-xs">
                  Lectura completada
                </p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="bg-primary text-primary-foreground mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl font-medium hover:opacity-90"
        >
          Continuar a revisión
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
