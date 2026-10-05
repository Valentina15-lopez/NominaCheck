"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  UserPlus,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signUpAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const registrationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Ingresá tu nombre completo.")
      .min(2, "El nombre debe tener al menos 2 caracteres."),
    email: z
      .string()
      .trim()
      .min(1, "Ingresá tu correo electrónico.")
      .email("Ingresá un correo electrónico válido."),
    password: z
      .string()
      .min(1, "Ingresá una contraseña.")
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .regex(/[A-Z]/, "Debe incluir al menos una mayúscula.")
      .regex(/[0-9]/, "Debe incluir al menos un número.")
      .regex(/[^A-Za-z0-9]/, "Debe incluir al menos un carácter especial."),
    confirmPassword: z.string().min(1, "Confirmá tu contraseña."),
    acceptedTerms: z.boolean().refine((accepted) => accepted, {
      message: "Debés aceptar los términos y condiciones.",
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });

type RegistrationFormValues = z.infer<typeof registrationSchema>;

const fieldClassName =
  "border-input bg-background focus:border-ring focus:ring-ring/20 h-11 rounded-xl border px-3 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60";

export function RegistrationForm() {
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    },
  });

  async function saveRegistration(values: RegistrationFormValues) {
    setConfirmation(null);
    setSubmissionError(null);

    const result = await signUpAction({
      fullName: values.fullName,
      email: values.email,
      password: values.password,
    });

    if (result.error) {
      if (result.error.includes("Ya existe")) {
        setError("email", {
          type: "server",
          message: result.error,
        });
      } else {
        setSubmissionError(result.error);
      }
      return;
    }

    if (!result.message) {
      setError("email", {
        type: "server",
        message: "No pudimos confirmar la creación de la cuenta.",
      });
      return;
    }

    reset();
    setConfirmation(result.message);
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSubmit(saveRegistration)(event);
  }

  return (
    <section
      className="border-border bg-card w-full max-w-lg rounded-2xl border p-6 shadow-sm sm:p-8"
      aria-labelledby="registration-title"
    >
      <p className="text-primary text-sm font-medium">Nueva cuenta</p>
      <h1
        id="registration-title"
        className="mt-2 text-3xl font-semibold tracking-tight"
      >
        Creá tu cuenta
      </h1>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        Completá tus datos para comenzar a usar NóminaCheck.
      </p>

      <form
        className="mt-8 flex flex-col gap-5"
        onSubmit={submitForm}
        noValidate
      >
        <label className="flex flex-col gap-2 text-sm font-medium">
          Nombre completo
          <input
            {...register("fullName")}
            type="text"
            autoComplete="name"
            placeholder="María González"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "full-name-error" : undefined}
            className={cn(
              fieldClassName,
              errors.fullName && "border-destructive focus:border-destructive",
            )}
          />
          {errors.fullName ? (
            <span id="full-name-error" className="text-destructive text-xs">
              {errors.fullName.message}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          Correo electrónico
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="maria@empresa.com"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={cn(
              fieldClassName,
              errors.email && "border-destructive focus:border-destructive",
            )}
          />
          {errors.email ? (
            <span id="email-error" className="text-destructive text-xs">
              {errors.email.message}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          Contraseña
          <input
            {...register("password")}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={cn(
              fieldClassName,
              errors.password && "border-destructive focus:border-destructive",
            )}
          />
          {errors.password ? (
            <span id="password-error" className="text-destructive text-xs">
              {errors.password.message}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">
              Mínimo 8 caracteres, una mayúscula, un número y un carácter
              especial.
            </span>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium">
          Confirmar contraseña
          <input
            {...register("confirmPassword")}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword ? "confirm-password-error" : undefined
            }
            className={cn(
              fieldClassName,
              errors.confirmPassword &&
                "border-destructive focus:border-destructive",
            )}
          />
          {errors.confirmPassword ? (
            <span
              id="confirm-password-error"
              className="text-destructive text-xs"
            >
              {errors.confirmPassword.message}
            </span>
          ) : null}
        </label>

        <div>
          <label className="flex items-start gap-3 text-sm">
            <input
              {...register("acceptedTerms")}
              type="checkbox"
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.acceptedTerms)}
              aria-describedby={
                errors.acceptedTerms ? "terms-error" : undefined
              }
              className="border-input text-primary focus:ring-ring mt-0.5 size-4 rounded"
            />
            <span>
              Acepto los términos y condiciones y la política de privacidad.
            </span>
          </label>
          {errors.acceptedTerms ? (
            <p id="terms-error" className="text-destructive mt-2 text-xs">
              {errors.acceptedTerms.message}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="mt-1 h-11 rounded-xl"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Creando cuenta...
            </>
          ) : (
            <>
              <UserPlus className="size-4" aria-hidden />
              Crear cuenta
            </>
          )}
        </Button>
      </form>

      {submissionError ? (
        <div
          className="bg-destructive/10 text-destructive mt-6 flex items-start gap-3 rounded-xl p-4 text-sm"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{submissionError}</p>
        </div>
      ) : null}

      {confirmation ? (
        <div
          className="bg-primary/10 text-primary mt-6 flex items-start gap-3 rounded-xl p-4 text-sm"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{confirmation}</p>
        </div>
      ) : null}
    </section>
  );
}
