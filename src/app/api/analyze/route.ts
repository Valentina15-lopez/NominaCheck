import { NextResponse } from "next/server";
import {
  buildResultFromExtractions,
  processDocuments,
} from "@/lib/nominacheck/process";
import { createClient } from "@/lib/supabase/server";
import type { ControlInput } from "@/types/nominacheck";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "csv",
  "xlsx",
]);
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_FILES = 40;
const PERIOD_PATTERN = /^20\d{2}-(0[1-9]|1[0-2])$/;

export async function POST(request: Request) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return errorResponse(
        "CONFIGURACION_INCOMPLETA",
        "Falta configurar la conexión con Supabase.",
        503,
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse(
        "SESION_REQUERIDA",
        "Iniciá sesión para ejecutar un análisis.",
        401,
      );
    }

    if (!process.env.MISTRAL_API_KEY) {
      return errorResponse(
        "CONFIGURACION_INCOMPLETA",
        "Falta configurar MISTRAL_API_KEY para ejecutar el análisis.",
        503,
      );
    }

    const formData = await request.formData();
    const organization = String(formData.get("organization") ?? "").trim();
    const period = String(formData.get("period") ?? "").trim();

    if (!organization) {
      return errorResponse(
        "ORGANIZACION_INVALIDA",
        "La organización es obligatoria.",
        400,
      );
    }
    if (!PERIOD_PATTERN.test(period)) {
      return errorResponse(
        "PERIODO_INVALIDO",
        "El período debe tener el formato AAAA-MM.",
        400,
      );
    }

    const fileEntries = formData.getAll("files");
    const files = fileEntries.filter(
      (entry): entry is File => entry instanceof File,
    );
    if (files.length !== fileEntries.length) {
      return errorResponse(
        "ARCHIVOS_INVALIDOS",
        "Todos los valores de files deben ser archivos.",
        400,
      );
    }
    if (!files.length) {
      return errorResponse(
        "ARCHIVOS_INVALIDOS",
        "Debés cargar al menos un archivo.",
        400,
      );
    }
    if (files.length > MAX_FILES) {
      return errorResponse(
        "LIMITE_DE_ARCHIVOS",
        `El POC admite hasta ${MAX_FILES} archivos por corrida.`,
        413,
      );
    }

    for (const file of files) {
      if (file.size === 0) {
        return errorResponse(
          "ARCHIVO_VACIO",
          `El archivo ${file.name} está vacío.`,
          400,
        );
      }
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        return errorResponse(
          "TIPO_DE_ARCHIVO_NO_ADMITIDO",
          `El archivo ${file.name} no tiene un formato admitido.`,
          415,
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return errorResponse(
          "ARCHIVO_DEMASIADO_GRANDE",
          `${file.name} supera el máximo de 15 MB.`,
          413,
        );
      }
    }

    const toleranceRaw = String(formData.get("roundingTolerance") ?? "").trim();
    const tolerance = toleranceRaw === "" ? null : Number(toleranceRaw);
    if (tolerance !== null && (!Number.isFinite(tolerance) || tolerance < 0)) {
      return errorResponse(
        "TOLERANCIA_INVALIDA",
        "La tolerancia debe ser un número mayor o igual a cero.",
        400,
      );
    }

    const control: ControlInput = {
      organization,
      period,
      roundingTolerance: tolerance,
      observations: String(formData.get("observations") ?? "").trim(),
    };

    const result = await processDocuments(control, files);
    return NextResponse.json(result, {
      status: result.processing_status === "FAILED" ? 502 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error al analizar documentos de NóminaCheck", error);
    return errorResponse(
      "ANALISIS_FALLIDO",
      error instanceof Error
        ? error.message
        : "No fue posible completar el análisis.",
      500,
    );
  }
}

function errorResponse(code: string, description: string, status: number) {
  const payload = buildResultFromExtractions(
    {
      organization: "",
      period: "",
      roundingTolerance: null,
      observations: "",
    },
    [],
    [],
  );
  payload.incidents.unshift({
    code,
    severity: "ERROR",
    worker_id: null,
    employment_record_id: null,
    document_id: null,
    description,
    evidence: [],
  });
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
