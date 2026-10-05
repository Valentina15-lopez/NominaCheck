"use client";

import {
  History,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Plus,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Brand } from "@/components/payroll/ui";
import type { PayrollScreen } from "@/types/payroll";

type SidebarProps = {
  screen: PayrollScreen;
  onNavigate: (screen: PayrollScreen) => void;
  onSignOut: () => Promise<void>;
  userName: string;
};

type NavItemProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  );
}

export function Sidebar({
  screen,
  onNavigate,
  onSignOut,
  userName,
}: SidebarProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const controlsActive = ["controls", "results", "report"].includes(screen);
  const newControlActive = ["new", "upload", "processing", "review"].includes(
    screen,
  );
  const initials =
    userName
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "NC";

  async function handleSignOut() {
    setIsSigningOut(true);
    await onSignOut();
    setIsSigningOut(false);
  }

  return (
    <aside className="border-border bg-card fixed inset-y-0 left-0 hidden w-64 border-r lg:flex lg:flex-col">
      <div className="border-border flex h-20 items-center border-b px-7">
        <Brand compact />
      </div>
      <nav
        className="flex flex-1 flex-col gap-2 p-5"
        aria-label="Navegación principal"
      >
        <p className="text-muted-foreground mb-2 px-3 text-[11px] font-semibold tracking-wider uppercase">
          Gestión
        </p>
        <NavItem
          icon={LayoutDashboard}
          label="Controles"
          active={controlsActive}
          onClick={() => onNavigate("controls")}
        />
        <NavItem
          icon={Plus}
          label="Nuevo control"
          active={newControlActive}
          onClick={() => onNavigate("new")}
        />
        <NavItem
          icon={History}
          label="Historial"
          onClick={() => onNavigate("controls")}
        />
        <div className="mt-auto">
          <NavItem icon={Settings2} label="Configuración" />
          <div className="bg-muted mt-4 flex items-center gap-3 rounded-xl p-3">
            <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full text-xs font-semibold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{userName}</p>
              <p className="text-muted-foreground text-[11px]">
                Administradora
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="text-muted-foreground hover:bg-muted hover:text-foreground mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <LogOut className="size-4" aria-hidden />
            )}
            Cerrar sesión
          </button>
        </div>
      </nav>
    </aside>
  );
}
