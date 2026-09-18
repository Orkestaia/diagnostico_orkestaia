import "server-only";
import { supabaseAdmin } from "./supabase";

/**
 * Spec §10: 60 escrituras por minuto y token en las rutas públicas. Lo cuenta Postgres
 * (`diagnostico_registrar_escritura`, atómica). Si la función falla, se deja pasar: mejor
 * no bloquear a un cliente de verdad por un fallo del contador.
 */
export async function dentroDelLimite(token: string, limite = 60): Promise<boolean> {
  const { data, error } = await supabaseAdmin().rpc("diagnostico_registrar_escritura", {
    p_token: token,
    p_limite: limite,
  });
  if (error) {
    console.error("[limite]", error);
    return true;
  }
  return data === true;
}

export const demasiadas = () =>
  Response.json({ error: "Demasiadas peticiones. Espera un momento." }, { status: 429 });

/** Tokens nanoid(21): 21 caracteres del alfabeto URL-safe. Filtra basura antes de ir a la BD. */
export const tokenValido = (t: string) => /^[A-Za-z0-9_-]{21}$/.test(t);
