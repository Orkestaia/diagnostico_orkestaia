import "server-only";
import { VERSION_CONSENTIMIENTO } from "@/config/consentimiento";
import { supabaseAdmin } from "./supabase";

/**
 * Consentimiento agregado (DDL v6). Columnas aparte y lectura tolerante: si el DDL aún no se ha
 * ejecutado, se lee como «sin respuesta» y no falla nada más.
 */
export interface EstadoConsentimiento {
  acepta: boolean | null;
  fecha: string | null;
  version: string | null;
}

const COLUMNAS =
  "consentimiento_agregado, consentimiento_agregado_at, consentimiento_agregado_version";

export async function leerConsentimiento(id: string): Promise<EstadoConsentimiento> {
  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .select(COLUMNAS)
    .eq("id", id)
    .maybeSingle();
  const d = (error ? null : data) as Record<string, unknown> | null;
  return {
    acepta: (d?.consentimiento_agregado as boolean | null) ?? null,
    fecha: (d?.consentimiento_agregado_at as string | null) ?? null,
    version: (d?.consentimiento_agregado_version as string | null) ?? null,
  };
}

/** Guarda el sí o el no (retirarlo = guardar false), con la fecha y la versión del texto mostrado. */
export async function guardarConsentimiento(id: string, acepta: boolean): Promise<boolean> {
  const { error } = await supabaseAdmin()
    .from("diagnosticos")
    .update({
      consentimiento_agregado: acepta,
      consentimiento_agregado_at: new Date().toISOString(),
      consentimiento_agregado_version: VERSION_CONSENTIMIENTO,
    })
    .eq("id", id);
  if (error) console.error("[consentimiento] guardar", error.message);
  return !error;
}
