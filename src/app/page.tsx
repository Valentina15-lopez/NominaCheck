"use client";

import { useState } from "react";
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
import type { PayrollScreen } from "@/types/payroll";

const EMPTY_FILES = {
  Nómina: 0,
  LS: 0,
  Recibos: 0,
  Transferencias: 0,
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
  const [screen, setScreen] = useState<PayrollScreen>("login");
  const [selectedWorker, setSelectedWorker] = useState(0);
  const [files, setFiles] = useState<Record<string, number>>(EMPTY_FILES);
  const [processing, setProcessing] = useState(false);

  const navigate = (nextScreen: PayrollScreen) => setScreen(nextScreen);
  const totalFiles = Object.values(files).reduce(
    (total, count) => total + count,
    0,
  );

  function addFiles(name: string, amount: number) {
    setFiles((current) => ({
      ...current,
      [name]: (current[name] ?? 0) + amount,
    }));
  }

  function startProcessing() {
    setProcessing(true);
    window.setTimeout(() => {
      setProcessing(false);
      navigate("processing");
    }, 700);
  }

  if (screen === "login") {
    return <LoginScreen onEnter={() => navigate("controls")} />;
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Sidebar screen={screen} onNavigate={navigate} />
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
              onOpen={() => navigate("results")}
            />
          ) : null}
          {screen === "new" ? (
            <NewControlScreen onContinue={() => navigate("upload")} />
          ) : null}
          {screen === "upload" ? (
            <UploadScreen
              files={files}
              total={totalFiles}
              onAdd={addFiles}
              onContinue={startProcessing}
            />
          ) : null}
          {screen === "processing" ? (
            <ProcessingScreen onContinue={() => navigate("review")} />
          ) : null}
          {screen === "review" ? (
            <ReviewScreen
              selected={selectedWorker}
              setSelected={setSelectedWorker}
              onContinue={() => navigate("results")}
            />
          ) : null}
          {screen === "results" ? (
            <ResultsScreen
              onSelect={(index) => {
                setSelectedWorker(index);
                navigate("review");
              }}
              onFinish={() => navigate("report")}
            />
          ) : null}
          {screen === "report" ? (
            <ReportScreen onBack={() => navigate("controls")} />
          ) : null}
        </div>
      </main>
      {processing ? <ProcessingOverlay /> : null}
    </div>
  );
}
