import "server-only";
import { supabaseAdmin } from "./supabase";

/**
 * Grabación de la visita (decisión de Aitor, 19-sep): el navegador graba fragmentos de ~5 min,
 * los sube aquí, se transcriben con OpenAI y el audio se borra en cuanto hay texto.
 * Con el consentimiento del cliente registrado antes de aceptar ningún audio.
 */

export const BUCKET_AUDIO = "diagnostico-audio";
/** Por debajo del límite de 4,5 MB del cuerpo en Vercel (5 min a 32 kbps ≈ 1,2 MB). */
export const MAX_BYTES_FRAGMENTO = 4 * 1024 * 1024;
export const MAX_INTENTOS = 5;
export const TIPOS_AUDIO = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg"] as const;

export interface Fragmento {
  id: string;
  diagnostico_id: string;
  orden: number;
  duracion_s: number | null;
  audio_path: string | null;
  estado: "pendiente" | "transcrito" | "error";
  texto: string | null;
  intentos: number;
}

const EXTENSION: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
};

export function tipoBase(tipo: string): (typeof TIPOS_AUDIO)[number] | null {
  const base = tipo.split(";")[0].trim().toLowerCase();
  return (TIPOS_AUDIO as readonly string[]).includes(base)
    ? (base as (typeof TIPOS_AUDIO)[number])
    : null;
}

export function rutaAudio(diagnosticoId: string, orden: number, tipo: string) {
  return `${diagnosticoId}/${orden}.${EXTENSION[tipo] ?? "webm"}`;
}

/** Transcribe un fragmento y, si sale bien, borra su audio. Nunca lanza: deja el estado en la fila. */
export async function transcribirFragmento(fragmentoId: string, empresa: string): Promise<void> {
  const db = supabaseAdmin();
  const { data: f } = await db
    .from("diagnostico_grabaciones")
    .select("id, diagnostico_id, orden, duracion_s, audio_path, estado, texto, intentos")
    .eq("id", fragmentoId)
    .maybeSingle<Fragmento>();
  if (!f || f.estado === "transcrito" || !f.audio_path) return;

  const clave = process.env.OPENAI_API_KEY;
  if (!clave) return; // Queda pendiente: se transcribe al configurar la clave ("Reintentar").

  try {
    const { data: audio, error: e1 } = await db.storage.from(BUCKET_AUDIO).download(f.audio_path);
    if (e1 || !audio) throw new Error(`No se ha podido leer el audio: ${e1?.message ?? "vacío"}`);

    const form = new FormData();
    form.append("file", audio, f.audio_path.split("/").pop());
    form.append("model", process.env.OPENAI_MODELO_TRANSCRIPCION || "gpt-4o-transcribe");
    form.append("language", "es");
    form.append("response_format", "json");
    form.append(
      "prompt",
      `Reunión de diagnóstico de procesos de Orkesta con ${empresa}. Español de España.`,
    );
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}` },
      body: form,
      signal: AbortSignal.timeout(50_000),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const { text } = (await r.json()) as { text?: string };

    await db
      .from("diagnostico_grabaciones")
      .update({
        estado: "transcrito",
        texto: (text ?? "").trim(),
        error: null,
        transcrito_at: new Date().toISOString(),
        intentos: f.intentos + 1,
      })
      .eq("id", f.id);
    // Con el texto guardado, el audio sobra (decisión de Aitor: se borra al transcribirse).
    const { error: e2 } = await db.storage.from(BUCKET_AUDIO).remove([f.audio_path]);
    if (!e2) await db.from("diagnostico_grabaciones").update({ audio_path: null }).eq("id", f.id);
    else console.error("[grabacion] borrar audio", f.id, e2.message);
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    console.error("[grabacion] transcribir", f.id, mensaje);
    await db
      .from("diagnostico_grabaciones")
      .update({ estado: "error", error: mensaje.slice(0, 500), intentos: f.intentos + 1 })
      .eq("id", f.id);
  }
}
