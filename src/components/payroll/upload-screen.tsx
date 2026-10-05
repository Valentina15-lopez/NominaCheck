import { ArrowRight, Files, Trash2, UploadCloud } from "lucide-react";
import { StatusBadge } from "@/components/payroll/ui";
import type { UploadedDocument } from "@/types/nominacheck";

type UploadCardProps = {
  files: UploadedDocument[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
};

function UploadCard({ files, onAdd, onRemove }: UploadCardProps) {
  return (
    <article className="border-border bg-card rounded-2xl border p-5">
      <div className="flex items-start justify-between">
        <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
          <Files className="size-5" aria-hidden />
        </div>
        {files.length > 0 ? (
          <StatusBadge label={`${files.length} cargados`} />
        ) : null}
      </div>
      <h2 className="mt-5 font-semibold">Todos los documentos</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Cargá juntos la LS, la nómina, los recibos y los comprobantes de
        transferencias. Los clasificaremos automáticamente por su contenido.
      </p>
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onAdd(Array.from(event.dataTransfer.files));
        }}
        className="border-primary/35 bg-primary/[0.03] text-muted-foreground hover:bg-primary/[0.07] focus-within:ring-ring mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center text-sm focus-within:ring-2"
      >
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
          accept=".csv,.xlsx,.pdf,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={(event) => {
            onAdd(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </label>
      {files.length ? (
        <ul className="mt-4 space-y-2">
          {files.map((item) => (
            <li
              key={item.id}
              className="bg-muted/60 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs"
            >
              <span className="min-w-0 truncate">{item.file.name}</span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-muted-foreground hover:text-destructive shrink-0"
                aria-label={`Quitar ${item.file.name}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function UploadScreen({
  files,
  onAdd,
  onRemove,
  onContinue,
  error,
}: {
  files: UploadedDocument[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onContinue: () => void;
  error: string | null;
}) {
  const total = files.length;
  return (
    <>
      <div>
        <p className="text-primary text-sm font-medium">Paso 2 de 6</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Cargá los documentos
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
          Seleccioná todos los archivos en una sola entrada. El control
          identificará qué tipo de documento es cada uno antes de analizarlos.
          Este POC no conserva los archivos originales y guarda el resultado
          solo durante la sesión del navegador.
        </p>
      </div>
      <div className="mt-8">
        <UploadCard files={files} onAdd={onAdd} onRemove={onRemove} />
      </div>
      {error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive mt-5 rounded-xl border p-4 text-sm"
        >
          {error}
        </p>
      ) : null}
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
