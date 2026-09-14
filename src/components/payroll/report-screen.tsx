import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { StatusBadge } from "@/components/payroll/ui";

export function ReportScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-primary text-sm font-medium">Paso 6 de 6</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Informe final
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        El control fue finalizado y está listo para compartir.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="border-border bg-card rounded-2xl border p-6">
          <div className="border-border flex items-center gap-3 border-b pb-5">
            <CheckCircle2 className="text-primary size-7" aria-hidden />
            <div>
              <h2 className="font-semibold">Acme Servicios S.A.</h2>
              <p className="text-muted-foreground text-sm">
                Control salarial · Agosto 2026
              </p>
            </div>
          </div>
          <dl className="mt-6 flex flex-col gap-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Fecha de cierre</dt>
              <dd className="font-semibold">09/09/2026</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Trabajadores revisados</dt>
              <dd className="font-semibold">248</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Resultado general</dt>
              <dd>
                <StatusBadge label="Completado" />
              </dd>
            </div>
          </dl>
          <div className="bg-muted mt-7 rounded-xl p-5">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Vista previa
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              El informe contiene el resumen de documentos, diferencias
              encontradas y el detalle individual de cada trabajador.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center gap-2 rounded-xl font-medium"
          >
            <Download className="size-4" aria-hidden />
            Descargar PDF
          </button>
          <button
            type="button"
            className="border-border hover:bg-muted inline-flex h-11 items-center justify-center gap-2 rounded-xl border font-medium"
          >
            <FileSpreadsheet className="size-4" aria-hidden />
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={onBack}
            className="text-primary mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver a controles
          </button>
        </div>
      </div>
    </div>
  );
}
