import "server-only";
import type { Aperturas, Prioridades } from "./interaccionMapa";
import { supabaseAdmin } from "./supabase";

/**
 * Prioridades y aperturas del mapa (DDL v7). Columnas aparte y lectura tolerante: si el DDL aún
 * no se ha ejecutado, se leen vacías y guardar devuelve false sin romper la página.
 */
async function leer<T>(id: string, columna: string): Promise<T | null> {
  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .select(columna)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return ((data as unknown as Record<string, unknown>)[columna] as T | null) ?? null;
}

async function guardar(id: string, columna: string, valor: unknown): Promise<boolean> {
  const { error } = await supabaseAdmin()
    .from("diagnosticos")
    .update({ [columna]: valor })
    .eq("id", id);
  if (error) console.error(`[mapa] guardar ${columna}`, error.message);
  return !error;
}

export const leerPrioridades = (id: string) => leer<Prioridades>(id, "prioridades_cliente");
export const guardarPrioridades = (id: string, p: Prioridades) =>
  guardar(id, "prioridades_cliente", p);
export const leerAperturas = (id: string) => leer<Aperturas>(id, "mapa_aperturas");
export const guardarAperturas = (id: string, a: Aperturas) => guardar(id, "mapa_aperturas", a);
