export function ProcessingOverlay() {
  return (
    <div
      className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="border-border bg-card rounded-2xl border p-8 text-center shadow-xl">
        <div
          className="border-primary/20 border-t-primary mx-auto mb-4 size-10 animate-spin rounded-full border-4"
          aria-hidden
        />
        <p className="font-semibold">Preparando procesamiento masivo</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Validando las cuatro entradas...
        </p>
      </div>
    </div>
  );
}
