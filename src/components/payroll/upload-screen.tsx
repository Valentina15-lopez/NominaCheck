import {
  ArrowRight,
  FileCheck2,
  FileText,
  Landmark,
  Plus,
  UploadCloud,
  Users,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/payroll/ui";
import { UPLOAD_CATEGORIES } from "@/constants/payroll";
import type { UploadCategory } from "@/types/payroll";

const CATEGORY_ICONS: Record<UploadCategory["icon"], LucideIcon> = {
  workers: Users,
  payroll: FileCheck2,
  receipts: FileText,
  transfers: Landmark,
};

type UploadCardProps = UploadCategory & {
  count: number;
  onAdd: (amount: number) => void;
};

function UploadCard({
  icon,
  name,
  description,
  accept,
  count,
  onAdd,
}: UploadCardProps) {
  const Icon = CATEGORY_ICONS[icon];

  return (
    <article className="border-border bg-card rounded-2xl border p-5">
      <div className="flex items-start justify-between">
        <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
          <Icon className="size-5" aria-hidden />
        </div>
        {count > 0 ? <StatusBadge label={`${count} cargados`} /> : null}
      </div>
      <h2 className="mt-5 font-semibold">{name}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      <label className="border-primary/35 bg-primary/[0.03] text-muted-foreground hover:bg-primary/[0.07] focus-within:ring-ring mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center text-sm focus-within:ring-2">
        <UploadCloud className="text-primary size-5" aria-hidden />
        <span>
          <strong className="text-foreground font-medium">
            Seleccionar archivos
          </strong>{" "}
          o arrastrarlos acá
        </span>
        <span className="text-xs">Carga múltiple habilitada</span>
        <input
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          onChange={(event) => onAdd(event.target.files?.length ?? 0)}
        />
      </label>
      <button
        type="button"
        onClick={() => onAdd(25)}
        className="border-border hover:bg-muted mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-xl border text-xs font-medium"
      >
        <Plus className="size-3" aria-hidden />
        Ingreso manual
      </button>
    </article>
  );
}

export function UploadScreen({
  files,
  total,
  onAdd,
  onContinue,
}: {
  files: Record<string, number>;
  total: number;
  onAdd: (name: string, amount: number) => void;
  onContinue: () => void;
}) {
  return (
    <>
      <div>
        <p className="text-primary text-sm font-medium">Paso 2 de 6</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Cargá los documentos
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
          Podés seleccionar todos los archivos de cada categoría juntos. El
          control procesa las cuatro entradas de forma masiva.
        </p>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {UPLOAD_CATEGORIES.map((category) => (
          <UploadCard
            key={category.name}
            {...category}
            count={files[category.name] ?? 0}
            onAdd={(amount) => onAdd(category.name, amount)}
          />
        ))}
      </div>
      <div className="border-border bg-card/95 sticky bottom-4 mt-8 flex flex-col justify-between gap-4 rounded-2xl border p-5 shadow-lg backdrop-blur sm:flex-row sm:items-center">
        <div>
          <p className="font-semibold">{total} archivos listos</p>
          <p className="text-muted-foreground text-sm">
            Se procesarán en una sola corrida.
          </p>
        </div>
        <button
          type="button"
          disabled={!total}
          onClick={onContinue}
          className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6 font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continuar al procesamiento
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </>
  );
}
