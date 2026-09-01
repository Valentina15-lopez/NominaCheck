export const SITE = {
  name: "PeluDEV",
  description: "Portafolio de Valentina — ingeniería de software.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#proyectos", label: "Proyectos" },
  { href: "/#contacto", label: "Contacto" },
] as const;
