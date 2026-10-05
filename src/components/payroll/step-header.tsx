import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { PAYROLL_STEPS, WORKFLOW_SCREENS } from "@/constants/payroll";
import type { PayrollScreen } from "@/types/payroll";

export function StepHeader({
  screen,
  onBack,
}: {
  screen: PayrollScreen;
  onBack: () => void;
}) {
  const current = Math.max(0, WORKFLOW_SCREENS.indexOf(screen));

  return (
    <div className="mb-8 print:hidden">
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver
      </button>
      <ol
        className="flex items-center gap-2 overflow-x-auto pb-2"
        aria-label="Progreso del control"
      >
        {PAYROLL_STEPS.map((step, index) => (
          <li key={step} className="flex shrink-0 items-center gap-2">
            <div
              className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                index <= current
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              } ${index === current ? "ring-primary/15 ring-4" : ""}`}
            >
              {index < current ? (
                <Check className="size-3.5" aria-hidden />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`text-xs ${
                index === current
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground"
              }`}
              aria-current={index === current ? "step" : undefined}
            >
              {step}
            </span>
            {index < PAYROLL_STEPS.length - 1 ? (
              <ChevronRight
                className="text-muted-foreground/50 mx-1 size-4"
                aria-hidden
              />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
