import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RegistrationForm } from "@/components/auth/registration-form";
import { Brand } from "@/components/payroll/ui";

export default function RegistrationPage() {
  return (
    <main className="bg-muted/40 min-h-screen px-5 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <Brand />
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver
          </Link>
        </div>

        <RegistrationForm />

        <p className="text-muted-foreground mt-6 text-center text-sm">
          ¿Ya tenés una cuenta?{" "}
          <Link href="/" className="text-primary font-medium hover:underline">
            Ingresá
          </Link>
        </p>
      </div>
    </main>
  );
}
