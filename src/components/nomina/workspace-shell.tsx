"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  ChevronDown,
  FileCheck2,
  LogOut,
  Menu,
  Search,
  Settings2,
  Users,
} from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "Controles", icon: FileCheck2, href: "/" },
  { label: "Trabajadores", icon: Users, href: "/trabajadores" },
  { label: "Configuración", icon: Settings2, href: "/configuracion" },
];

function breadcrumb(pathname: string) {
  if (pathname === "/") return "Controles";
  if (pathname === "/controles/nuevo") return "Controles / Nuevo control";
  if (pathname.endsWith("/documentos"))
    return "Controles / Carga de documentos";
  if (pathname.endsWith("/procesando")) return "Controles / Procesamiento";
  if (pathname.includes("/trabajadores/"))
    return "Controles / Resultados / Trabajador";
  if (pathname.startsWith("/controles/")) return "Controles / Resultados";
  return (
    navItems.find((item) => item.href === pathname)?.label ?? "NóminaCheck"
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function WorkspaceShell({
  children,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const result = await signOutAction();
    if (result.error) {
      setSigningOut(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname.startsWith("/controles")
      : pathname === href;

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside
          className={cn(
            "border-border bg-card fixed inset-y-0 left-0 z-20 w-72 flex-col border-r px-5 py-7 lg:static lg:flex",
            showMobileNav ? "flex" : "hidden",
          )}
        >
          <Link href="/" className="flex items-center gap-3 px-2">
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl font-semibold">
              N
            </div>
            <div>
              <p className="font-semibold tracking-tight">NóminaCheck</p>
              <p className="text-muted-foreground text-xs">
                Espacio de trabajo
              </p>
            </div>
          </Link>
          <nav
            aria-label="Navegación principal"
            className="mt-12 flex flex-col gap-2"
          >
            <p className="text-muted-foreground px-3 pb-2 text-[11px] font-semibold tracking-[0.18em] uppercase">
              Espacio de trabajo
            </p>
            {navItems.map(({ label, icon: Icon, href }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setShowMobileNav(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  isActive(href)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          <div className="border-border relative mt-auto border-t pt-5">
            {showProfile && (
              <div className="border-border bg-card absolute right-0 bottom-14 left-0 rounded-xl border p-2 shadow-lg">
                <button
                  onClick={signOut}
                  disabled={signingOut}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium disabled:opacity-60"
                >
                  <LogOut className="size-3.5" />
                  {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
                </button>
              </div>
            )}
            <button
              onClick={() => setShowProfile((value) => !value)}
              className="hover:bg-muted flex w-full items-center gap-3 rounded-xl px-2 py-1 text-left"
            >
              <div className="bg-muted flex size-9 items-center justify-center rounded-full text-xs font-semibold">
                {initials(userName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {userEmail}
                </p>
              </div>
              <ChevronDown className="text-muted-foreground ml-auto size-4" />
            </button>
          </div>
        </aside>
        {showMobileNav && (
          <button
            aria-label="Cerrar menú"
            onClick={() => setShowMobileNav(false)}
            className="bg-foreground/20 fixed inset-0 z-10 lg:hidden"
          />
        )}
        <main className="min-w-0 flex-1">
          <header className="border-border relative flex items-center justify-between border-b px-5 py-5 sm:px-10 lg:px-12">
            <button
              className="lg:hidden"
              onClick={() => setShowMobileNav(true)}
              aria-label="Abrir menú"
            >
              <Menu className="size-5" />
            </button>
            <div className="text-muted-foreground hidden text-sm sm:block">
              {breadcrumb(pathname)}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                aria-label="Buscar trabajadores"
                onClick={() => router.push("/trabajadores")}
                className="hover:bg-muted rounded-lg p-2"
              >
                <Search className="size-4" />
              </button>
              <button
                aria-label="Notificaciones"
                onClick={() => setShowNotifications((value) => !value)}
                className="hover:bg-muted rounded-lg p-2"
              >
                <Bell className="size-4" />
              </button>
              <div className="bg-muted flex size-8 items-center justify-center rounded-full text-xs font-semibold lg:hidden">
                {initials(userName)}
              </div>
            </div>
            {showNotifications && (
              <div className="border-border bg-card absolute top-16 right-5 z-10 w-72 rounded-xl border p-4 text-sm shadow-lg sm:right-10">
                <p className="font-medium">Sin notificaciones nuevas</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Te avisaremos cuando un control requiera atención.
                </p>
              </div>
            )}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
