import "server-only";
import { CONFIG_VERSION } from "@/config/tipos";
import { supabaseAdmin } from "./supabase";

/**
 * Lectura y escritura de `respuestas_previo_redaccion` (DDL v5): con qué versión del banco se
 * contestó cada respuesta del previo. Va aparte del resto de columnas a propósito: si el DDL aún
 * no se ha ejecutado, nada de lo demás falla (se lee como «sin versión propia» y no se apunta).
 */
const COLUMNA = "respuestas_previo_redaccion";

export async function leerRedaccion(id: string): Promise<Record<string, string> | null> {
  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .select(COLUMNA)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return ((data as Record<string, unknown>)[COLUMNA] as Record<string, string> | null) ?? null;
}

/** Apunta la versión actual del banco en las preguntas que se acaban de contestar. */
export async function apuntarRedaccion(id: string, claves: string[]): Promise<void> {
  const ids = [...new Set(claves.map((k) => k.split("::")[0]))];
  if (!ids.length) return;
  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .select(COLUMNA)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    console.warn("[previo] sin columna de redacción (DDL v5 pendiente)", error?.message);
    return;
  }
  const actual = ((data as Record<string, unknown>)[COLUMNA] as Record<string, string> | null) ?? {};
  const nuevo = { ...actual, ...Object.fromEntries(ids.map((k) => [k, CONFIG_VERSION])) };
  const { error: e2 } = await supabaseAdmin()
    .from("diagnosticos")
    .update({ [COLUMNA]: nuevo })
    .eq("id", id);
  if (e2) console.warn("[previo] no se ha podido apuntar la redacción", e2.message);
}
