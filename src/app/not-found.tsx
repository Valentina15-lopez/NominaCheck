import Link from "next/link";
import { PageShell } from "@/components/nomina/ui";

export default function NotFound() {
  return (
    <PageShell
      eyebrow="Error 404"
      title="Página no encontrada"
      description="El recurso que buscás no existe o fue movido."
    >
      <Link
        href="/"
        className="bg-primary text-primary-foreground mt-8 inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold"
      >
        Volver al dashboard
      </Link>
    </PageShell>
  );
}
