import { LogIn } from "lucide-react";
import { Brand } from "@/components/payroll/ui";

export function LoginScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="bg-muted/40 flex min-h-screen items-center justify-center px-5">
      <div className="border-border bg-card w-full max-w-md rounded-2xl border p-8 shadow-sm">
        <div className="mb-10">
          <Brand />
        </div>
        <p className="text-primary text-sm font-medium">Acceso seguro</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Ingresá a tu cuenta
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Gestioná tus controles salariales en un solo lugar.
        </p>
        <form
          className="mt-8 flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            onEnter();
          }}
        >
          <label className="flex flex-col gap-2 text-sm font-medium">
            Correo electrónico
            <input
              required
              type="email"
              autoComplete="email"
              placeholder="maria@empresa.com"
              className="border-input bg-background focus:ring-ring h-11 rounded-xl border px-3 font-normal outline-none focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Contraseña
            <input
              required
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="border-input bg-background focus:ring-ring h-11 rounded-xl border px-3 font-normal outline-none focus:ring-2"
            />
          </label>
          <button
            type="submit"
            className="bg-primary text-primary-foreground mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl font-medium hover:opacity-90"
          >
            <LogIn className="size-4" aria-hidden />
            Ingresar
          </button>
        </form>
        <p className="text-muted-foreground mt-6 text-center text-xs">
          Acceso protegido para administradores.
        </p>
      </div>
    </main>
  );
}
