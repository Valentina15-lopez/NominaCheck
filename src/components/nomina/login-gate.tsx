"use client";

import { useRouter } from "next/navigation";
import { LoginScreen } from "@/components/payroll/login-screen";

/**
 * La sesión se resuelve en el servidor, así que al entrar solo hace falta
 * volver a renderizar para que la página vea al usuario autenticado.
 */
export function LoginGate() {
  const router = useRouter();
  return <LoginScreen onEnter={() => router.refresh()} />;
}
