import { ArrowRight } from "lucide-react";

export function NewControlScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-primary text-sm font-medium">Paso 1 de 6</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Crear nuevo control
      </h1>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        Definí los datos básicos del período antes de cargar los documentos.
      </p>
      <div className="border-border bg-card mt-8 flex flex-col gap-5 rounded-2xl border p-6">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Empresa
          <input
            defaultValue="Acme Servicios S.A."
            className="border-input bg-background focus:ring-ring h-11 rounded-xl border px-3 font-normal outline-none focus:ring-2"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Período
          <select className="border-input bg-background h-11 rounded-xl border px-3 font-normal">
            <option>Agosto 2026</option>
            <option>Julio 2026</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Observaciones
          <textarea
            placeholder="Agregá una nota opcional..."
            className="border-input bg-background focus:ring-ring min-h-28 rounded-xl border px-3 py-3 font-normal outline-none focus:ring-2"
          />
        </label>
        <button
          type="button"
          onClick={onContinue}
          className="bg-primary text-primary-foreground mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl font-medium hover:opacity-90"
        >
          Crear control y continuar
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
