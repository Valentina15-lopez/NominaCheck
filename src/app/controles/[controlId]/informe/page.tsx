import Link from "next/link";
import { ReportView } from "@/components/nomina/report-view";
import { PageShell } from "@/components/nomina/ui";
import { getControlReport } from "@/lib/db/controls";

export default async function ReportPage({
  params,
}: PageProps<"/controles/[controlId]/informe">) {
  const { controlId } = await params;
  const report = await getControlReport(controlId);

  if (!report) {
    return (
      <PageShell
        eyebrow="Informe"
        title="Todavía no hay informe"
        description="Este control no tiene un análisis guardado."
      >
        <Link
          href={`/controles/${controlId}`}
          className="text-primary mt-8 inline-flex text-sm font-medium hover:underline"
        >
          Volver al control
        </Link>
      </PageShell>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-10 sm:px-10 lg:px-12 lg:py-14">
      <ReportView
        result={report.result}
        control={report.control}
        controlId={controlId}
      />
    </div>
  );
}
