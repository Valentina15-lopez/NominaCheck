import { NextResponse } from "next/server";
import {
  ControlError,
  getControlForAnalysis,
  markControlAsFailed,
  markControlAsProcessing,
  saveAnalysis,
} from "@/lib/db/controls";
import {
  analysisDocumentId,
  processDocuments,
} from "@/lib/nominacheck/process";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Corre el análisis sobre los documentos ya guardados del control y persiste
 * el resultado. Es una ruta y no una server action para poder extender el
 * tiempo máximo de ejecución a 300 s.
 */
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/controles/[controlId]/analizar">,
) {
  const { controlId } = await params;

  if (!process.env.MISTRAL_API_KEY) {
    return NextResponse.json(
      { error: "Falta configurar MISTRAL_API_KEY para ejecutar el análisis." },
      { status: 503 },
    );
  }

  let started = false;
  try {
    const { input, files } = await getControlForAnalysis(controlId);
    await markControlAsProcessing(controlId);
    started = true;

    const result = await processDocuments(
      input,
      files.map(({ file }) => file),
    );

    // El motor identifica cada documento por el hash de su contenido; con eso
    // se vuelve de una fila del resultado al archivo guardado.
    const analysisIdByDocumentId = new Map(
      await Promise.all(
        files.map(
          async ({ documentId, file }) =>
            [documentId, await analysisDocumentId(file)] as const,
        ),
      ),
    );
    await saveAnalysis(controlId, result, analysisIdByDocumentId);

    return NextResponse.json(
      { status: result.processing_status },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof ControlError
        ? error.message
        : error instanceof Error
          ? error.message
          : "No fue posible completar el análisis.";
    if (started) {
      await markControlAsFailed(controlId, message).catch(() => {});
    }
    console.error("NóminaCheck · análisis del control", error);
    return NextResponse.json(
      { error: message },
      { status: error instanceof ControlError ? 400 : 500 },
    );
  }
}
