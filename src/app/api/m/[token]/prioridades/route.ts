import { after } from "next/server";
import { leerMapaPublico } from "@/lib/datosMapa";
import { guardarPrioridades, leerPrioridades } from "@/lib/datosInteraccion";
import { nuevasPrioridades, validarPrioridades } from "@/lib/interaccionMapa";
import { demasiadas, dentroDelLimite } from "@/lib/limite";
import { enviarEvento } from "@/lib/motor";
import { supabaseAdmin } from "@/lib/supabase";
import { urlBase } from "@/lib/url";

/**
 * «Elige tus 3 prioridades» (spec §7, mapa_v1.2). Sin login: el token del enlace, solo con el
 * mapa publicado y con límite de escrituras. Se puede cambiar; cada vez se avisa a Aitor
 * (`diagnostico.prioridades_elegidas` → n8n: Telegram y email).
 */
const LIMITE_POR_MINUTO = 10;

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const datos = await leerMapaPublico(token);
  // Solo los mapas mapa_v1.2 enseñan la sección (MapaCliente).
  if (!datos || datos.mapa.version !== "mapa_v1.2")
    return Response.json({ error: "No encontrado" }, { status: 404 });
  if (!(await dentroDelLimite(token, LIMITE_POR_MINUTO))) return demasiadas();

  const cuerpo = (await req.json().catch(() => null)) as { seleccion?: unknown } | null;
  const v = validarPrioridades(datos.mapa, cuerpo?.seleccion);
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });

  const p = nuevasPrioridades(await leerPrioridades(datos.id), v.seleccion, new Date());
  if (!(await guardarPrioridades(datos.id, p)))
    return Response.json({ error: "No se ha podido guardar" }, { status: 500 });

  const base = await urlBase();
  after(async () => {
    const { data: c } = await supabaseAdmin()
      .from("diagnosticos")
      .select("contacto_nombre, contacto_email")
      .eq("id", datos.id)
      .maybeSingle();
    await enviarEvento("diagnostico.prioridades_elegidas", {
      diagnostico_id: datos.id,
      empresa: datos.empresa,
      contacto: { nombre: c?.contacto_nombre ?? null, email: c?.contacto_email ?? null },
      prioridades: p.seleccion,
      fecha: p.fecha,
      cambios: p.cambios,
      urls: { mapa: `${base}/m/${token}`, admin: `${base}/admin/d/${datos.id}/mapa` },
    });
  });
  return Response.json({ guardado: true, prioridades: p });
}
