import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

/**
 * Cliente con service role (salta RLS). Solo servidor: `server-only` rompe el build si
 * algún componente cliente lo importa. Las tablas no tienen políticas públicas (spec §8).
 */
export function supabaseAdmin(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) throw new Error("Supabase no configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  cliente = createClient(url, clave, { auth: { persistSession: false } });
  return cliente;
}
