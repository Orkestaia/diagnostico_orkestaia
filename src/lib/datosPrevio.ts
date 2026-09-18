import "server-only";
import type { Respuestas, SectorId } from "@/config/tipos";
import { COLUMNAS_PREVIO, type EstadoDiagnostico } from "./diagnosticos";
import { tokenValido } from "./limite";
import { supabaseAdmin } from "./supabase";

/** Lo que el previo puede ver del diagnóstico (columnas explícitas, spec §8). */
export interface DatosPrevio {
  id: string;
  estado: EstadoDiagnostico;
  sector: SectorId;
  subsector: string | null;
  empresa: string | null;
  contacto_nombre: string | null;
  fecha_reunion: string | null;
  respuestas_previo: Respuestas;
  informe: { resumen_entendido?: string[]; temas_reunion?: string[] } | null;
  previo_completado_at: string | null;
}

/** Busca por token. null si el token no existe (o está revocado): el cliente ve un 404 neutro. */
export async function leerPrevio(token: string): Promise<DatosPrevio | null> {
  if (!tokenValido(token)) return null;
  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .select(COLUMNAS_PREVIO)
    .eq("token", token)
    .eq("tipo", "diagnostico")
    .maybeSingle();
  if (error) {
    console.error("[previo] lectura", error);
    return null;
  }
  return data as DatosPrevio | null;
}

/** El `id` interno nunca va al navegador (spec §10): se quita antes de responder. */
export function paraCliente(d: DatosPrevio) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...resto } = d;
  return resto;
}
