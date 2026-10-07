"use client";

import { useRouter } from "next/navigation";
import { ReportScreen } from "@/components/payroll/report-screen";
import type { ControlInput, NominaCheckResult } from "@/types/nominacheck";

export function ReportView({
  result,
  control,
  controlId,
}: {
  result: NominaCheckResult;
  control: ControlInput;
  controlId: string;
}) {
  const router = useRouter();
  return (
    <ReportScreen
      result={result}
      control={control}
      onBack={() => router.push(`/controles/${controlId}`)}
    />
  );
}
