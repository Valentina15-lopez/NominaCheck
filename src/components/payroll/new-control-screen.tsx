import { ArrowRight } from "lucide-react";
import type { ControlInput } from "@/types/nominacheck";

export function NewControlScreen({
  control,
  onChange,
  onContinue,
}: {
  control: ControlInput;
  onChange: (control: ControlInput) => void;
  onContinue: () => void;
}) {
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
            value={control.organization}
            required
            onChange={(event) =>
              onChange({ ...control, organization: event.target.value })
            }
            className="border-input bg-background focus:ring-ring h-11 rounded-xl border px-3 font-normal outline-none focus:ring-2"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Período
          <input
            type="month"
            required
            value={control.period}
            onChange={(event) =>
              onChange({ ...control, period: event.target.value })
            }
            className="border-input bg-background h-11 rounded-xl border px-3 font-normal"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Tolerancia de redondeo (UYU)
          <input
            type="number"
            min="0"
            step="0.01"
            value={control.roundingTolerance ?? ""}
            placeholder="Sin tolerancia"
            onChange={(event) =>
              onChange({
                ...control,
                roundingTolerance:
                  event.target.value === "" ? null : Number(event.target.value),
              })
            }
            className="border-input bg-background h-11 rounded-xl border px-3 font-normal"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Observaciones
          <textarea
            placeholder="Agregá una nota opcional..."
            value={control.observations}
            onChange={(event) =>
              onChange({ ...control, observations: event.target.value })
            }
            className="border-input bg-background focus:ring-ring min-h-28 rounded-xl border px-3 py-3 font-normal outline-none focus:ring-2"
          />
        </label>
        <button
          type="button"
          disabled={!control.organization.trim() || !control.period}
          onClick={onContinue}
          className="bg-primary text-primary-foreground mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl font-medium hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Crear control y continuar
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
