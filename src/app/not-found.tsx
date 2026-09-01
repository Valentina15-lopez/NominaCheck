import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 py-24">
      <h1 className="text-3xl font-semibold">Página no encontrada</h1>
      <p className="text-foreground/70">
        El recurso que buscás no existe o fue movido.
      </p>
      <Link
        href="/"
        className="bg-foreground text-background inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
