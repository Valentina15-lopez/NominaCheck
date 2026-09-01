import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SITE } from "@/constants/site";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-16 px-6 py-20">
      <section className="flex max-w-2xl flex-col gap-6">
        <p className="text-foreground/60 text-sm font-medium tracking-wide uppercase">
          Portafolio
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {SITE.name}
        </h1>
        <p className="text-foreground/70 text-lg">{SITE.description}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/#proyectos"
            className="bg-foreground text-background inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium hover:opacity-90"
          >
            Ver proyectos
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/#contacto"
            className="border-foreground/15 hover:bg-foreground/5 inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium"
          >
            Contacto
          </Link>
        </div>
      </section>
    </div>
  );
}
