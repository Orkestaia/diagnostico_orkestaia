import "server-only";
import { DIAS_ENCUESTA } from "@/config/consultor/encuesta";
import { calcularMadurez, type Madurez, type RespuestaEncuesta } from "./madurez";
import { supabaseAdmin } from "./supabase";
import { tokenValido } from "./limite";
import type { RespuestasVisita } from "./visita";

/**
 * Encuesta de madurez (batería v2 §6): un enlace por empresa, anónimo. Aquí vive todo lo que
 * toca la base de datos; el cálculo está en `madurez.ts` y no depende de nada de esto.
 */

export interface EncuestaAbierta {
  id: string;
  empresa: string;
  areas: string[];
  abiertaHasta: string | null;
}

/** Áreas del bloque F (`ia.areas`); si no se rellenaron, las del equipo (`a.equipo`). */
export function areasDe(respuestasVisita: RespuestasVisita | null | undefined): string[] {
  const rv = respuestasVisita ?? {};
  const lista = (rv.campos?.["ia.areas"] ?? rv.campos?.["a.equipo"]) as
    { rol?: string }[] | undefined;
  if (!Array.isArray(lista)) return [];
  const areas = lista.map((x) => (typeof x?.rol === "string" ? x.rol.trim() : "")).filter(Boolean);
  return [...new Set(areas)].slice(0, 20);
}

export function encuestaCaducada(abiertaHasta: string | null): boolean {
  return !!abiertaHasta && Date.parse(abiertaHasta) < Date.now();
}

/** Cookie de "ya he contestado" (§6: una respuesta por dispositivo, sin más control). */
export const galleta = (token: string) => `ork_encuesta_${token}`;

export const cierrePorDefecto = (dias = DIAS_ENCUESTA) =>
  new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();

/** Diagnóstico al que pertenece un enlace de encuesta, si sigue abierto. */
export async function leerEncuesta(token: string): Promise<EncuestaAbierta | null> {
  if (!tokenValido(token)) return null;
  const { data } = await supabaseAdmin()
    .from("diagnosticos")
    .select("id, empresa, respuestas_visita, encuesta_abierta_hasta")
    .eq("encuesta_token", token)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    empresa: data.empresa,
    areas: areasDe(data.respuestas_visita as RespuestasVisita),
    abiertaHasta: data.encuesta_abierta_hasta,
  };
}

export async function guardarRespuesta(diagnosticoId: string, respuestas: RespuestaEncuesta) {
  const { error } = await supabaseAdmin()
    .from("diagnostico_encuesta_respuestas")
    .insert({ diagnostico_id: diagnosticoId, respuestas });
  if (error) {
    console.error("[encuesta] guardar", error);
    return false;
  }
  return true;
}

/** Resultado de la encuesta de un diagnóstico, ya con las reglas de anonimato aplicadas. */
export async function resultadoMadurez(diagnosticoId: string): Promise<Madurez> {
  const db = supabaseAdmin();
  const [{ data: filas }, { data: d }] = await Promise.all([
    db
      .from("diagnostico_encuesta_respuestas")
      .select("respuestas")
      .eq("diagnostico_id", diagnosticoId),
    db.from("diagnosticos").select("respuestas_visita").eq("id", diagnosticoId).maybeSingle(),
  ]);
  const rv = (d?.respuestas_visita ?? {}) as RespuestasVisita;
  return calcularMadurez(
    (filas ?? []).map((f) => f.respuestas as RespuestaEncuesta),
    {
      normasDireccion:
        typeof rv.campos?.["ia.normas"] === "string"
          ? (rv.campos["ia.normas"] as string)
          : undefined,
    },
  );
}
