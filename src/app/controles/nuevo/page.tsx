"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadCompaniesAction } from "@/app/controles/actions";
import { useControlStore } from "@/components/nomina/control-store";
import { PageShell } from "@/components/nomina/ui";

const fieldClassName =
  "border-border bg-background focus:border-primary h-11 rounded-xl border px-3 font-normal outline-none";

export default function NewControlPage() {
  const router = useRouter();
  const { createControl, busy, error } = useControlStore();
  const [companies, setCompanies] = useState<string[]>([]);
  const [companyOption, setCompanyOption] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [period, setPeriod] = useState("");
  const [tolerance, setTolerance] = useState("");
  const [observations, setObservations] = useState("");
  const [formError, setFormError] = useState("");

  // Las empresas se ofrecen a partir de los controles ya creados.
  useEffect(() => {
    void loadCompaniesAction().then((result) => {
      if (result.ok) setCompanies(result.data);
    });
  }, []);

  const company =
    companyOption === "other" ? customCompany.trim() : companyOption;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!company || !period) {
      setFormError(
        "Seleccioná o ingresá una empresa y un período para continuar.",
      );
      return;
    }
    setFormError("");
    const controlId = await createControl({
      company,
      period,
      roundingTolerance: tolerance === "" ? null : Number(tolerance),
      observations,
    });
    if (controlId) router.push(`/controles/${controlId}/documentos`);
  };

  const message = formError || error;

  return (
    <PageShell
      eyebrow="Nuevo control de salarios"
      title="Datos del control"
      description="Indicá la empresa y el período que querés analizar."
    >
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mt-8 inline-flex items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="size-4" />
        Volver a controles
      </Link>
      <form
        onSubmit={submit}
        className="border-border bg-card mt-8 max-w-2xl rounded-2xl border p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
            <Building2 className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">Empresa y período</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Esta información identificará el control en el dashboard.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-5">
          <label className="grid gap-2 text-sm font-medium">
            Empresa
            <select
              value={companyOption}
              onChange={(event) => {
                setCompanyOption(event.target.value);
                setFormError("");
              }}
              className={fieldClassName}
            >
              <option value="">Seleccionar empresa</option>
              {companies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value="other">Ingresar una nueva empresa</option>
            </select>
          </label>
          {companyOption === "other" && (
            <label className="grid gap-2 text-sm font-medium">
              Nombre de la empresa
              <input
                autoFocus
                value={customCompany}
                onChange={(event) => {
                  setCustomCompany(event.target.value);
                  setFormError("");
                }}
                className={fieldClassName}
                placeholder="Ej. Empresa del Sur SAS"
              />
            </label>
          )}
          <label className="grid gap-2 text-sm font-medium">
            Período a analizar
            <input
              type="month"
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value);
                setFormError("");
              }}
              className={fieldClassName}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Tolerancia de redondeo (UYU)
            <input
              type="number"
              min="0"
              step="0.01"
              value={tolerance}
              placeholder="Sin tolerancia"
              onChange={(event) => setTolerance(event.target.value)}
              className={fieldClassName}
            />
            <span className="text-muted-foreground text-xs font-normal">
              Sin tolerancia, cualquier diferencia de centavos queda marcada
              para revisión manual.
            </span>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Observaciones
            <textarea
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              placeholder="Agregá una nota opcional…"
              className="border-border bg-background focus:border-primary min-h-24 rounded-xl border px-3 py-3 font-normal outline-none"
            />
          </label>
        </div>
        {message && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {message}
          </p>
        )}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Creando…" : "Continuar"} <ArrowRight className="size-4" />
          </button>
        </div>
      </form>
    </PageShell>
  );
}
