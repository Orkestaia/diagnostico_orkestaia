import { z } from "zod";
import { exigirAdmin } from "@/lib/acceso";
import { areasDe, cierrePorDefecto, resultadoMadurez } from "@/lib/datosEncuesta";
import { supabaseAdmin } from "@/lib/supabase";
import { nuevoToken } from "@/lib/tokens";
import { enlaceEncuesta, urlBase } from "@/lib/url";
import type { RespuestasVisita } from "@/lib/visita";

const uuid = z.string().uuid();

/** Estado y resultados de la encuesta (ya con el anonimato aplicado en `calcularMadurez`). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return Response.json({ error: "Id no válido" }, { status: 400 });

  const { data: d } = await supabaseAdmin()
    .from("diagnosticos")
    .select("encuesta_token, encuesta_abierta_hasta, respuestas_visita")
    .eq("id", id)
    .maybeSingle();
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 });

  return Response.json(
    {
      enlace: d.encuesta_token ? enlaceEncuesta(await urlBase(), d.encuesta_token) : null,
      abierta_hasta: d.encuesta_abierta_hasta,
      areas: areasDe(d.respuestas_visita as RespuestasVisita),
      resultado: await resultadoMadurez(id),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Crea el enlace de la encuesta (o alarga el plazo si ya existe). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return Response.json({ error: "Id no válido" }, { status: 400 });

  const cuerpo = z
    .object({ dias: z.number().int().min(1).max(60).optional() })
    .safeParse(await req.json().catch(() => ({})));
  if (!cuerpo.success) return Response.json({ error: "Datos no válidos" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: d } = await db
    .from("diagnosticos")
    .select("encuesta_token")
    .eq("id", id)
    .maybeSingle();
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 });

  const token = d.encuesta_token ?? nuevoToken();
  const abierta_hasta = cierrePorDefecto(cuerpo.data.dias);
  const { error } = await db
    .from("diagnosticos")
    .update({ encuesta_token: token, encuesta_abierta_hasta: abierta_hasta })
    .eq("id", id);
  if (error) {
    console.error("[encuesta] crear", error);
    return Response.json({ error: "No se ha podido crear el enlace" }, { status: 500 });
  }
  return Response.json(
    { enlace: enlaceEncuesta(await urlBase(), token), abierta_hasta },
    { status: 201 },
  );
}
