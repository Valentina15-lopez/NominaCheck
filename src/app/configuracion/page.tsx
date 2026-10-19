"use client";

import { useEffect, useState } from "react";
import { Check, CircleHelp, SlidersHorizontal } from "lucide-react";
import {
  loadSettingsAction,
  saveSettingsAction,
} from "@/app/controles/actions";
import { LoadingState, PageShell } from "@/components/nomina/ui";
import type { UserSettings } from "@/types/nomina";

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadSettingsAction().then((result) => {
      if (result.ok) setSettings(result.data);
      else setError(result.error);
    });
  }, []);

  /** Cada cambio se guarda al instante: son tres preferencias, no un formulario. */
  async function update(changes: Partial<UserSettings>) {
    if (!settings) return;
    const next = { ...settings, ...changes };
    setSettings(next);
    setSaving(true);
    setMessage("");
    const result = await saveSettingsAction(next);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    setMessage("Preferencias guardadas.");
  }

  return (
    <PageShell
      eyebrow="Espacio de trabajo"
      title="Configuración"
      description="Personalizá tu espacio de trabajo y las reglas de tus controles."
    >
      {error && (
        <p
          role="alert"
          className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {message && !error && (
        <p className="bg-primary/10 text-primary mt-8 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
          <Check className="size-4" /> {message}
        </p>
      )}

      {!settings ? (
        <LoadingState label="Cargando tus preferencias…" />
      ) : (
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <section className="border-border bg-card rounded-2xl border p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                <SlidersHorizontal className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Preferencias generales</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Definí cómo se muestran y comparan tus controles.
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
                  value={settings.currency}
                  disabled={saving}
                  onChange={(event) =>
                    void update({
                      currency: event.target.value as UserSettings["currency"],
                    })
                  }
                  className="border-border bg-background rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
                >
                  <option value="UYU">UYU · $</option>
                  <option value="ARS">ARS · $</option>
                  <option value="USD">USD · US$</option>
                </select>
              </label>
              <label className="border-border flex items-center justify-between gap-5 border-b py-4 text-sm">
                <span>
                  <strong className="block font-medium">
                    Tolerancia de redondeo
                  </strong>
                  <span className="text-muted-foreground text-xs">
                    Valor sugerido al crear un control nuevo
                  </span>
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Sin tolerancia"
                  disabled={saving}
                  value={settings.roundingTolerance ?? ""}
                  onChange={(event) =>
                    void update({
                      roundingTolerance:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    })
                  }
                  className="border-border bg-background w-32 rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
                />
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
                  checked={settings.warnDifferences}
                  disabled={saving}
                  onChange={(event) =>
                    void update({ warnDifferences: event.target.checked })
                  }
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
                <h2 className="font-semibold">Cómo funciona el control</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Un repaso del flujo en cuatro pasos.
                </p>
              </div>
            </div>
            <ol className="text-muted-foreground mt-5 list-decimal space-y-2 pl-5 text-sm leading-6">
              <li>Creá un control con la empresa y el período.</li>
              <li>
                Cargá la LS de Odoo, la nómina, los recibos y los comprobantes
                bancarios.
              </li>
              <li>
                Ejecutá el análisis: los archivos se leen y se concilian por
                trabajador.
              </li>
              <li>
                Revisá las diferencias, confirmá las asociaciones sugeridas y
                descargá el informe.
              </li>
            </ol>
            <p className="text-muted-foreground border-border mt-5 border-t pt-4 text-xs leading-5">
              NóminaCheck no aprueba liquidaciones ni valida el cálculo interno
              del recibo: extrae lo visible, relaciona y señala inconsistencias.
            </p>
          </section>
        </div>
      )}
    </PageShell>
  );
}
