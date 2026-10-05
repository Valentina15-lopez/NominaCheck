"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const registrationSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});

export type AuthActionResult = {
  error?: string;
  message?: string;
  userName?: string;
};

function hasSupabaseConfiguration() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function signUpAction(
  values: z.infer<typeof registrationSchema>,
): Promise<AuthActionResult> {
  if (!hasSupabaseConfiguration()) {
    return { error: "Falta configurar la conexión con Supabase." };
  }

  const parsed = registrationSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Revisá los datos ingresados e intentá nuevamente." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    console.error("Error al crear usuario en Supabase:", {
      code: error.code,
      message: error.message,
      status: error.status,
    });

    if (error.code === "over_email_send_rate_limit") {
      return {
        error:
          "Se alcanzó el límite temporal de correos de confirmación. Esperá unos minutos e intentá nuevamente.",
      };
    }

    if (error.code === "email_address_invalid") {
      return { error: "Supabase rechazó la dirección de correo ingresada." };
    }

    if (error.code === "signup_disabled") {
      return { error: "El registro de nuevas cuentas está deshabilitado." };
    }

    if (error.code === "email_provider_disabled") {
      return {
        error:
          "El registro por correo está deshabilitado en la configuración de Supabase.",
      };
    }

    return { error: "No pudimos crear la cuenta. Intentá nuevamente." };
  }

  if (data.user?.identities?.length === 0) {
    return { error: "Ya existe una cuenta con este correo electrónico." };
  }

  return {
    message: data.session
      ? `La cuenta de ${parsed.data.fullName} se creó correctamente.`
      : "Cuenta creada. Revisá tu correo para confirmar la dirección; hasta que no la confirmes no vas a poder ingresar.",
  };
}

export async function signInAction(
  values: z.infer<typeof credentialsSchema>,
): Promise<AuthActionResult> {
  if (!hasSupabaseConfiguration()) {
    return { error: "Falta configurar la conexión con Supabase." };
  }

  const parsed = credentialsSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "El correo electrónico o la contraseña no son correctos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
  });

  if (error) {
    console.error("Error al iniciar sesión en Supabase:", {
      code: error.code,
      message: error.message,
      status: error.status,
    });

    if (error.code === "email_not_confirmed") {
      return {
        error:
          "Tu correo todavía no está confirmado. Revisá tu bandeja de entrada (y spam) y usá el enlace de confirmación.",
      };
    }

    return {
      error:
        "El correo electrónico o la contraseña no son correctos. Si te registraste recién, confirmá el correo antes de ingresar.",
    };
  }

  return {
    userName:
      typeof data.user.user_metadata.full_name === "string"
        ? data.user.user_metadata.full_name
        : data.user.email,
  };
}

export async function signOutAction(): Promise<AuthActionResult> {
  if (!hasSupabaseConfiguration()) {
    return { error: "Falta configurar la conexión con Supabase." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  return error
    ? { error: "No pudimos cerrar la sesión. Intentá nuevamente." }
    : {};
}
