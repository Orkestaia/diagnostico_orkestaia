import { after } from "next/server";
import { z } from "zod";
import { exigirAdmin } from "@/lib/acceso";
import {
  BUCKET_AUDIO,
  MAX_BYTES_FRAGMENTO,
  rutaAudio,
  tipoBase,
  transcribirFragmento,
} from "@/lib/grabacion";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

const uuid = z.string().uuid();

/** Estado de la grabación: consentimiento y fragmentos (sin el texto: eso va al export). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return Response.json({ error: "Id no válido" }, { status: 400 });
  const db = supabaseAdmin();
  const [{ data: d }, { data: fragmentos }] = await Promise.all([
    db.from("diagnosticos").select("grabacion_consentimiento_at").eq("id", id).maybeSingle(),
    db
      .from("diagnostico_grabaciones")
      .select("orden, duracion_s, estado")
      .eq("diagnostico_id", id)
      .order("orden"),
  ]);
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 });
  return Response.json(
    { consentimiento_at: d.grabacion_consentimiento_at, fragmentos: fragmentos ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Sube un fragmento (multipart: `audio`, `orden`, `duracion`). Idempotente por (diagnóstico, orden):
 * la cola del navegador puede reenviarlo sin duplicar. Exige el consentimiento registrado.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!uuid.safeParse(id).success) return Response.json({ error: "Id no válido" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  const orden = Number(form?.get("orden"));
  const duracion = Math.round(Number(form?.get("duracion")) || 0);
  if (!(audio instanceof Blob) || !Number.isSafeInteger(orden) || orden <= 0) {
    return Response.json({ error: "Fragmento no válido" }, { status: 400 });
  }
  const tipo = tipoBase(audio.type);
  if (!tipo) return Response.json({ error: "Formato de audio no admitido" }, { status: 415 });
  if (audio.size === 0 || audio.size > MAX_BYTES_FRAGMENTO)
    return Response.json({ error: "Tamaño no válido" }, { status: 413 });

  const db = supabaseAdmin();
  const { data: d } = await db
    .from("diagnosticos")
    .select("id, empresa, grabacion_consentimiento_at")
    .eq("id", id)
    .maybeSingle();
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (!d.grabacion_consentimiento_at)
    return Response.json({ error: "Falta el consentimiento del cliente" }, { status: 403 });

  const { data: existente } = await db
    .from("diagnostico_grabaciones")
    .select("id, estado")
    .eq("diagnostico_id", id)
    .eq("orden", orden)
    .maybeSingle();
  if (existente) return Response.json({ recibido: true, estado: existente.estado });

  const ruta = rutaAudio(id, orden, tipo);
  const { error: e1 } = await db.storage
    .from(BUCKET_AUDIO)
    .upload(ruta, audio, { contentType: tipo, upsert: true });
  if (e1) {
    console.error("[grabacion] subir", e1.message);
    return Response.json({ error: "No se ha podido guardar el audio" }, { status: 502 });
  }
  const { data: fila, error: e2 } = await db
    .from("diagnostico_grabaciones")
    .insert({ diagnostico_id: id, orden, duracion_s: duracion || null, audio_path: ruta })
    .select("id")
    .single();
  if (e2 || !fila) {
    // Carrera con un reenvío: si ya existe, vale.
    if (e2?.code === "23505") return Response.json({ recibido: true });
    console.error("[grabacion] registrar", e2);
    return Response.json({ error: "No se ha podido registrar el fragmento" }, { status: 500 });
  }
  after(() => transcribirFragmento(fila.id, d.empresa));
  return Response.json({ recibido: true, estado: "pendiente" }, { status: 201 });
}
