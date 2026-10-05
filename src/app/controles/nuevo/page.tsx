"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useControlStore } from "@/components/nomina/control-store";
import { PageShell } from "@/components/nomina/ui";
import { COMPANIES } from "@/lib/nomina/mock-data";

export default function NewControlPage() {
  const router = useRouter();
  const { createControl, hydrated } = useControlStore();
  const [companyOption, setCompanyOption] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [period, setPeriod] = useState("2026-09");
  const [error, setError] = useState("");

  const company =
    companyOption === "other" ? customCompany.trim() : companyOption;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!company || !period) {
      setError("Seleccioná o ingresá una empresa y un período para continuar.");
      return;
    }
    const controlId = createControl({ company, period });
    router.push(`/controles/${controlId}/documentos`);
  };

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
                setError("");
              }}
              className="border-border bg-background focus:border-primary h-11 rounded-xl border px-3 font-normal outline-none"
            >
              <option value="">Seleccionar empresa</option>
              {COMPANIES.map((item) => (
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
                  setError("");
                }}
                className="border-border bg-background focus:border-primary h-11 rounded-xl border px-3 font-normal outline-none"
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
                setError("");
              }}
              className="border-border bg-background focus:border-primary h-11 rounded-xl border px-3 font-normal outline-none"
            />
          </label>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={!hydrated}
            className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold hover:opacity-90"
          >
            Continuar <ArrowRight className="size-4" />
          </button>
        </div>
      </form>
    </PageShell>
  );
}
