import { exigirAdmin } from "@/lib/acceso";
import { COLUMNAS_LISTADO } from "@/lib/diagnosticos";
import { supabaseAdmin } from "@/lib/supabase";

/** Listado del panel (spec §9). */
export async function GET() {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .select(COLUMNAS_LISTADO)
    .eq("tipo", "diagnostico")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return Response.json({ error: "No se ha podido leer el listado" }, { status: 500 });
  return Response.json({ diagnosticos: data });
}
