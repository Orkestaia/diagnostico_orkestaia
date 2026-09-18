import { exigirAdmin } from "@/lib/acceso";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Buscador de `crm_contactos` para rellenar la invitación (spec §11, sprint 1).
 * SOLO LECTURA: esta app no escribe en el CRM hasta el sprint 2.
 */
export async function GET(req: Request) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  // Sin caracteres que rompan el filtro `or` de PostgREST.
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/[,()*%\\]/g, " ").trim().slice(0, 60);
  if (q.length < 2) return Response.json({ contactos: [] });

  const patron = `%${q}%`;
  const { data, error } = await supabaseAdmin()
    .from("crm_contactos")
    .select("id, empresa, persona_contacto, email, telefono, web, sector, estado, localidad")
    .or(`empresa.ilike.${patron},persona_contacto.ilike.${patron},email.ilike.${patron}`)
    .order("empresa")
    .limit(8);
  if (error) {
    console.error("[crm/buscar]", error);
    return Response.json({ error: "No se ha podido buscar en el CRM" }, { status: 500 });
  }
  return Response.json({ contactos: data });
}
