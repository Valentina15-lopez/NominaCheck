"use client";

import { useState } from "react";
import { ArrowUpRight, CircleHelp, SlidersHorizontal } from "lucide-react";
import { PageShell } from "@/components/nomina/ui";

export default function SettingsPage() {
  const [currency, setCurrency] = useState("UYU");
  const [warnDifferences, setWarnDifferences] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <PageShell
      eyebrow="Espacio de trabajo"
      title="Configuración"
      description="Personalizá tu espacio de trabajo y las reglas de tus controles."
    >
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
              <SlidersHorizontal className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Preferencias generales</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Definí cómo se muestran y agrupan tus controles.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <label className="border-border flex items-center justify-between gap-5 border-b py-4 text-sm">
              <span>
                <strong className="block font-medium">
                  Moneda predeterminada
                </strong>
                <span className="text-muted-foreground text-xs">
                  Usada en los importes del sistema
                </span>
              </span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
              >
                <option value="UYU">UYU · $</option>
                <option value="ARS">ARS · $</option>
              </select>
            </label>
            <label className="flex items-center justify-between gap-5 py-4 text-sm">
              <span>
                <strong className="block font-medium">
                  Avisar diferencias
                </strong>
                <span className="text-muted-foreground text-xs">
                  Mostrar alertas en cada análisis
                </span>
              </span>
              <input
                type="checkbox"
                checked={warnDifferences}
                onChange={(event) => setWarnDifferences(event.target.checked)}
                className="accent-primary size-4"
              />
            </label>
          </div>
        </section>
        <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
              <CircleHelp className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Ayuda y soporte</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Estamos para ayudarte a usar NóminaCheck.
              </p>
            </div>
          </div>
          <div className="bg-muted mt-5 rounded-xl p-4">
            <p className="text-sm font-medium">¿Tenés alguna duda?</p>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              Revisá nuestra guía rápida para conocer el flujo de demostración.
            </p>
            <button
              onClick={() => setHelpOpen((value) => !value)}
              className="text-primary mt-4 text-sm font-semibold hover:underline"
            >
              Abrir centro de ayuda{" "}
              <ArrowUpRight className="ml-1 inline size-3" />
            </button>
            {helpOpen && (
              <p className="border-border text-muted-foreground mt-4 border-t pt-4 text-xs leading-5">
                Creá un control, cargá las cuatro categorías documentales y
                ejecutá el análisis mock para revisar los resultados por
                trabajador.
              </p>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
