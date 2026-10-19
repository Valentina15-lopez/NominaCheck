import "server-only";
import { cache } from "react";
import { ControlError } from "@/lib/db/controls";
import { createClient } from "@/lib/supabase/server";
import type { UserSettings } from "@/types/nomina";

const DEFAULT_SETTINGS: UserSettings = {
  currency: "UYU",
  warnDifferences: true,
  roundingTolerance: null,
};

type SettingsRow = {
  currency: UserSettings["currency"];
  warn_differences: boolean;
  rounding_tolerance: string | number | null;
};

const session = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ControlError("Iniciá sesión para continuar.");
  return { supabase, user };
});

export async function getSettings(): Promise<UserSettings> {
  const { supabase, user } = await session();
  const { data, error } = await supabase
    .from("user_settings")
    .select("currency, warn_differences, rounding_tolerance")
    .eq("user_id", user.id)
    .maybeSingle<SettingsRow>();
  if (error) {
    console.error("NóminaCheck · cargar preferencias", error);
    throw new ControlError("No pudimos cargar tus preferencias.");
  }
  if (!data) return DEFAULT_SETTINGS;

  const tolerance =
    data.rounding_tolerance === null ? null : Number(data.rounding_tolerance);
  return {
    currency: data.currency,
    warnDifferences: data.warn_differences,
    roundingTolerance:
      tolerance !== null && Number.isFinite(tolerance) ? tolerance : null,
  };
}

export async function saveSettings(input: UserSettings) {
  const { supabase, user } = await session();
  if (input.roundingTolerance !== null && input.roundingTolerance < 0) {
    throw new ControlError("La tolerancia no puede ser negativa.");
  }
  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    currency: input.currency,
    warn_differences: input.warnDifferences,
    rounding_tolerance: input.roundingTolerance,
  });
  if (error) {
    console.error("NóminaCheck · guardar preferencias", error);
    throw new ControlError("No pudimos guardar tus preferencias.");
  }
}
