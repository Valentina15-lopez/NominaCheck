"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  FileCheck2,
  FileText,
  Landmark,
  Menu,
  Plus,
  Search,
  Settings2,
  Users,
  X,
} from "lucide-react";

const navItems = [
  { label: "Controles", icon: FileCheck2, active: true },
  { label: "Trabajadores", icon: Users },
  { label: "Configuración", icon: Settings2 },
];

export default function Home() {
  const [receipts, setReceipts] = useState(0);
  const [transfers, setTransfers] = useState(0);
  const [manualType, setManualType] = useState<"receipt" | "transfer" | null>(null);
  const [analyzed, setAnalyzed] = useState(false);

  const addFiles = (type: "receipt" | "transfer") => {
    if (type === "receipt") setReceipts((count) => count + 1);
    else setTransfers((count) => count + 1);
    setAnalyzed(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card px-5 py-7 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold">S</div>
            <div>
              <p className="font-semibold tracking-tight">Saldo claro</p>
              <p className="text-xs text-muted-foreground">Espacio de trabajo</p>
            </div>
          </div>
          <nav aria-label="Navegación principal" className="mt-12 flex flex-col gap-2">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Espacio de trabajo</p>
            {navItems.map(({ label, icon: Icon, active }) => (
              <button key={label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto border-t border-border pt-5">
            <div className="flex items-center gap-3 px-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">MG</div>
              <div className="min-w-0"><p className="truncate text-sm font-medium">María González</p><p className="truncate text-xs text-muted-foreground">Administradora</p></div>
              <ChevronDown className="ml-auto size-4 text-muted-foreground" aria-hidden />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-border px-5 py-5 sm:px-10 lg:px-12">
            <button className="lg:hidden" aria-label="Abrir menú"><Menu className="size-5" /></button>
            <div className="hidden text-sm text-muted-foreground sm:block">Controles <span className="px-2">/</span> Nuevo control</div>
            <div className="ml-auto flex items-center gap-3"><button aria-label="Buscar" className="rounded-lg p-2 hover:bg-muted"><Search className="size-4" /></button><div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold lg:hidden">MG</div></div>
          </header>

          <div className="mx-auto max-w-5xl px-5 py-10 sm:px-10 lg:px-12 lg:py-14">
            <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div><p className="mb-3 text-sm font-medium text-primary">Nuevo control de salarios</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Armemos el control del mes</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Cargá los recibos y las transferencias para comparar lo que se liquidó con lo que efectivamente se pagó.</p></div>
              <div className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">Septiembre 2026 <ChevronDown className="ml-1 inline size-3" /></div>
            </div>

            <section className="grid gap-5 md:grid-cols-2" aria-label="Carga de documentos">
              <UploadCard icon={FileText} title="Recibos de sueldo" description="PDF o imágenes de los recibos" count={receipts} onAdd={() => addFiles("receipt")} onManual={() => setManualType("receipt")} />
              <UploadCard icon={Landmark} title="Transferencias bancarias" description="Extractos o comprobantes de pago" count={transfers} onAdd={() => addFiles("transfer")} onManual={() => setManualType("transfer")} />
            </section>

            <div className="my-8 flex items-center gap-4"><div className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">o ingresá un registro manualmente</span><div className="h-px flex-1 bg-border" /></div>
            <div className="flex flex-wrap gap-3"><button onClick={() => setManualType("receipt")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted"><Plus className="size-4" />Agregar recibo</button><button onClick={() => setManualType("transfer")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted"><Plus className="size-4" />Agregar transferencia</button></div>

            <section className="mt-12 rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold">Resumen de carga</h2><p className="mt-1 text-sm text-muted-foreground">Revisá que estén todos los documentos antes de analizar.</p></div><div className="flex gap-6 text-sm"><span><strong className="mr-1 text-lg">{receipts}</strong><span className="text-muted-foreground">recibos</span></span><span><strong className="mr-1 text-lg">{transfers}</strong><span className="text-muted-foreground">transferencias</span></span></div></div>{analyzed && <div className="mt-5 flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary"><Check className="size-4" />Análisis listo: no se detectaron diferencias en esta simulación.</div>}<button disabled={!receipts && !transfers} onClick={() => setAnalyzed(true)} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">Analizar documentos<ArrowUpRight className="size-4" /></button></section>
          </div>
        </main>
      </div>
      {manualType && <ManualDialog type={manualType} onClose={() => setManualType(null)} onSave={() => { addFiles(manualType); setManualType(null); }} />}
    </div>
  );
}

function UploadCard({ icon: Icon, title, description, count, onAdd, onManual }: { icon: typeof FileText; title: string; description: string; count: number; onAdd: () => void; onManual: () => void }) {
  return <div className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-start justify-between"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div>{count > 0 && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{count} cargado{count !== 1 && "s"}</span>}</div><h2 className="mt-5 font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p><button onClick={onAdd} className="mt-6 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 bg-primary/[0.03] px-4 py-6 text-sm text-muted-foreground hover:bg-primary/[0.07]"><Plus className="size-5 text-primary" /><span><strong className="font-medium text-foreground">Seleccionar archivos</strong> o arrastralos acá</span></button><button onClick={onManual} className="mt-4 w-full text-center text-xs font-medium text-primary hover:underline">Ingresar manualmente</button></div>;
}

function ManualDialog({ type, onClose, onSave }: { type: "receipt" | "transfer"; onClose: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-10 flex items-center justify-center bg-foreground/30 p-5" role="dialog" aria-modal="true" aria-labelledby="manual-title"><div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 id="manual-title" className="text-lg font-semibold">Ingresar {type === "receipt" ? "recibo" : "transferencia"} manualmente</h2><p className="mt-1 text-sm text-muted-foreground">Completá los datos para sumar este registro al control.</p></div><button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button></div><div className="mt-6 grid gap-4"><label className="grid gap-2 text-sm font-medium">Trabajador<input className="h-10 rounded-lg border border-border bg-background px-3 font-normal outline-none focus:border-primary" placeholder="Nombre y apellido" /></label><label className="grid gap-2 text-sm font-medium">Cédula<input className="h-10 rounded-lg border border-border bg-background px-3 font-normal outline-none focus:border-primary" placeholder="Ej. 4.567.890-1" /></label><label className="grid gap-2 text-sm font-medium">Importe<input className="h-10 rounded-lg border border-border bg-background px-3 font-normal outline-none focus:border-primary" placeholder="$ 0,00" /></label></div><div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-medium hover:bg-muted">Cancelar</button><button onClick={onSave} className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">Guardar registro</button></div></div></div>;
}
