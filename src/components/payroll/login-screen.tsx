"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, LoaderCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signInAction } from "@/app/auth/actions";
import { Brand } from "@/components/payroll/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingresá tu correo electrónico.")
    .email("Ingresá un correo electrónico válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginScreenProps = {
  onEnter: (userName: string) => void;
};

const fieldClassName =
  "border-input bg-background focus:border-ring focus:ring-ring/20 h-11 rounded-xl border px-3 font-normal outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60";

export function LoginScreen({ onEnter }: LoginScreenProps) {
  const [authenticationError, setAuthenticationError] = useState<string | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isAuthenticating, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function authenticate(values: LoginFormValues) {
    setAuthenticationError(null);

    try {
      const result = await signInAction(values);

      if (result.error) {
        setAuthenticationError(result.error);
        return;
      }

      onEnter(result.userName ?? values.email);
    } catch {
      setAuthenticationError(
        "No pudimos verificar tus datos. Intentá nuevamente.",
      );
    }
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSubmit(authenticate)(event);
  }

  function clearAuthenticationError() {
    setAuthenticationError(null);
  }

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
          onSubmit={submitForm}
          noValidate
        >
          <label className="flex flex-col gap-2 text-sm font-medium">
            Correo electrónico
            <input
              {...register("email", { onChange: clearAuthenticationError })}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="maria@empresa.com"
              disabled={isAuthenticating}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              className={cn(
                fieldClassName,
                errors.email && "border-destructive focus:border-destructive",
              )}
            />
            {errors.email ? (
              <span id="login-email-error" className="text-destructive text-xs">
                {errors.email.message}
              </span>
            ) : null}
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Contraseña
            <input
              {...register("password", {
                onChange: clearAuthenticationError,
              })}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isAuthenticating}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
              className={cn(
                fieldClassName,
                errors.password &&
                  "border-destructive focus:border-destructive",
              )}
            />
            {errors.password ? (
              <span
                id="login-password-error"
                className="text-destructive text-xs"
              >
                {errors.password.message}
              </span>
            ) : null}
          </label>

          {authenticationError ? (
            <div
              className="bg-destructive/10 text-destructive flex items-start gap-3 rounded-xl p-3 text-sm"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{authenticationError}</p>
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={!isValid || isAuthenticating}
            className="mt-2 h-11 rounded-xl"
          >
            {isAuthenticating ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                Verificando...
              </>
            ) : (
              <>
                <LogIn className="size-4" aria-hidden />
                Ingresar
              </>
            )}
          </Button>
        </form>
        <p className="text-muted-foreground mt-6 text-center text-sm">
          ¿Todavía no tenés una cuenta?{" "}
          <Link
            href="/registro"
            className="text-primary font-medium hover:underline"
          >
            Registrate
          </Link>
        </p>
      </div>
    </main>
  );
}
