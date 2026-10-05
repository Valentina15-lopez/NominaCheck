"use client";

import { useEffect, useState } from "react";
import { signOutAction } from "@/app/auth/actions";
import { ControlsScreen } from "@/components/payroll/controls-screen";
import { LoginScreen } from "@/components/payroll/login-screen";
import { NewControlScreen } from "@/components/payroll/new-control-screen";
import { ProcessingOverlay } from "@/components/payroll/processing-overlay";
import { ProcessingScreen } from "@/components/payroll/processing-screen";
import { ReportScreen } from "@/components/payroll/report-screen";
import { ResultsScreen } from "@/components/payroll/results-screen";
import { ReviewScreen } from "@/components/payroll/review-screen";
import { Sidebar } from "@/components/payroll/sidebar";
import { StepHeader } from "@/components/payroll/step-header";
import { UploadScreen } from "@/components/payroll/upload-screen";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import type { PayrollScreen } from "@/types/payroll";
import type {
  ControlInput,
  NominaCheckResult,
  UploadedDocument,
} from "@/types/nominacheck";

// Se evalúa en build: si no hay credenciales de Supabase la sesión arranca
// directamente como anónima, sin pasar por un render en "loading".
const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const INITIAL_CONTROL: ControlInput = {
  organization: "Acme Servicios S.A.",
  period: "2026-08",
  roundingTolerance: null,
  observations: "",
};

const PREVIOUS_SCREEN: Partial<Record<PayrollScreen, PayrollScreen>> = {
  new: "controls",
  upload: "new",
  processing: "upload",
  review: "processing",
  results: "upload",
  report: "results",
};

export default function HomePage() {
  const [authStatus, setAuthStatus] = useState<
    "loading" | "authenticated" | "anonymous"
  >(SUPABASE_CONFIGURED ? "loading" : "anonymous");
  const [userName, setUserName] = useState("Usuario");
  const [screen, setScreen] = useState<PayrollScreen>("controls");
  const [selectedWorker, setSelectedWorker] = useState(0);
  const [control, setControl] = useState<ControlInput>(INITIAL_CONTROL);
  const [files, setFiles] = useState<UploadedDocument[]>([]);
  const [result, setResult] = useState<NominaCheckResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const navigate = (nextScreen: PayrollScreen) => setScreen(nextScreen);

  useEffect(() => {
    if (!hasSupabaseConfiguration()) {
      setAuthStatus("anonymous");
      return;
    }

    const supabase = createClient();
    let isActive = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!isActive) return;

      if (!data.user) {
        setAuthStatus("anonymous");
        return;
      }

      setUserName(
        typeof data.user.user_metadata.full_name === "string"
          ? data.user.user_metadata.full_name
          : (data.user.email ?? "Usuario"),
      );
      setAuthStatus("authenticated");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive || session) return;
      setAuthStatus("anonymous");
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const result = await signOutAction();
    if (result.error) return;

    setAuthStatus("anonymous");
    setScreen("controls");
  }

  function addFiles(newFiles: File[]) {
    const supported = newFiles.filter((file) =>
      /\.(pdf|png|jpe?g|csv|xlsx)$/i.test(file.name),
    );
    if (supported.length !== newFiles.length) {
      setProcessingError("Uno o más archivos tienen un formato no admitido.");
    } else {
      setProcessingError(null);
    }
    setFiles((current) => {
      const keys = new Set(
        current.map(
          (item) =>
            `${item.file.name}:${item.file.size}:${item.file.lastModified}`,
        ),
      );
      const unique = supported.filter(
        (file) => !keys.has(`${file.name}:${file.size}:${file.lastModified}`),
      );
      return [
        ...current,
        ...unique.map((file) => ({
          id: crypto.randomUUID(),
          file,
        })),
      ];
    });
  }

  async function startProcessing() {
    setProcessing(true);
    setProcessingError(null);
    try {
      const formData = new FormData();
      formData.set("organization", control.organization);
      formData.set("period", control.period);
      formData.set(
        "roundingTolerance",
        control.roundingTolerance?.toString() ?? "",
      );
      formData.set("observations", control.observations);
      for (const document of files) {
        formData.append("files", document.file);
      }
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | NominaCheckResult
        | {
            incidents?: Array<{ description?: string }>;
          };
      if (!response.ok || !("summary" in payload)) {
        throw new Error(
          payload.incidents?.[0]?.description ??
            "No fue posible completar el análisis.",
        );
      }
      setResult(payload);
      sessionStorage.setItem(
        "nominacheck:last-result",
        JSON.stringify(payload),
      );
      setSelectedWorker(0);
      navigate("processing");
    } catch (error) {
      setProcessingError(
        error instanceof Error ? error.message : "Error de procesamiento.",
      );
    } finally {
      setProcessing(false);
    }
  }

  function openLastResult() {
    if (result) {
      navigate("results");
      return;
    }
    const stored = sessionStorage.getItem("nominacheck:last-result");
    if (!stored) return;
    try {
      setResult(JSON.parse(stored) as NominaCheckResult);
      navigate("results");
    } catch {
      sessionStorage.removeItem("nominacheck:last-result");
    }
  }

  if (authStatus === "loading") {
    return (
      <main className="bg-muted/40 flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando sesión...</p>
      </main>
    );
  }

  if (authStatus === "anonymous") {
    return (
      <LoginScreen
        onEnter={(authenticatedUserName) => {
          setUserName(authenticatedUserName);
          setAuthStatus("authenticated");
          navigate("controls");
        }}
      />
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Sidebar
        screen={screen}
        onNavigate={navigate}
        onSignOut={signOut}
        userName={userName}
      />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          {screen !== "controls" ? (
            <StepHeader
              screen={screen}
              onBack={() => navigate(PREVIOUS_SCREEN[screen] ?? "controls")}
            />
          ) : null}

          {screen === "controls" ? (
            <ControlsScreen
              onNew={() => navigate("new")}
              onOpen={openLastResult}
            />
          ) : null}
          {screen === "new" ? (
            <NewControlScreen
              control={control}
              onChange={setControl}
              onContinue={() => navigate("upload")}
            />
          ) : null}
          {screen === "upload" ? (
            <UploadScreen
              files={files}
              onAdd={addFiles}
              onRemove={(id) =>
                setFiles((current) =>
                  current.filter((document) => document.id !== id),
                )
              }
              onContinue={startProcessing}
              error={processingError}
            />
          ) : null}
          {screen === "processing" && result ? (
            <ProcessingScreen
              result={result}
              onContinue={() => navigate("review")}
            />
          ) : null}
          {screen === "review" && result ? (
            <ReviewScreen
              result={result}
              selected={selectedWorker}
              setSelected={setSelectedWorker}
              onContinue={() => navigate("results")}
            />
          ) : null}
          {screen === "results" && result ? (
            <ResultsScreen
              result={result}
              onSelect={(index) => {
                setSelectedWorker(index);
                navigate("review");
              }}
              onFinish={() => navigate("report")}
            />
          ) : null}
          {screen === "report" && result ? (
            <ReportScreen
              result={result}
              control={control}
              onBack={() => navigate("controls")}
            />
          ) : null}
        </div>
      </main>
      {processing ? <ProcessingOverlay /> : null}
    </div>
  );
}
