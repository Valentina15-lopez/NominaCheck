export const SITE = {
  name: "NóminaCheck",
  description:
    "Control documental de liquidaciones salariales: LS de Odoo, nómina, recibos y transferencias.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#proyectos", label: "Proyectos" },
  { href: "/#contacto", label: "Contacto" },
] as const;
