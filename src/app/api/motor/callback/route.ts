import { z } from "zod";
import { exigirTokenMotor } from "@/lib/motor";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Callback del motor de n8n (spec del motor §7, fase 5). Autenticado con la cabecera x-orkesta-token (lib/motor.ts).
 *
 * Modo `pre_reunion` (lo único del sprint 1): guarda `interno` (hipótesis, preguntas y
 * alertas: SOLO Aitor) e `informe` con los textos visibles del previo. No cambia el estado.
 * 409 si ya tenía `interno`: un diagnóstico, una redacción (motor, regla 5).
 */
const texto = (max: number) => z.string().trim().min(1).max(max);

const esquema = z.object({
  diagnostico_id: z.string().uuid(),
  estado: z.string(),
  redaccion: z.enum(["ia", "base"]),
  informe: z
    .object({
      frase_orkestador: texto(160).optional(),
      resumen_entendido: z.array(texto(160)).min(1).max(5).optional(),
      temas_reunion: z.array(texto(80)).min(1).max(3).optional(),
    })
    .passthrough()
    .optional(),
  interno: z.record(z.string(), z.unknown()).optional(),
  modelo: z.string().optional(),
  execution_id: z.union([z.string(), z.number()]).optional(),
  generado_at: z.string().optional(),
});

export async function POST(req: Request) {
  const denegado = exigirTokenMotor(req);
  if (denegado) return denegado;
  const crudo = await req.text();

  let json: unknown;
  try {
    json = JSON.parse(crudo);
  } catch {
    return Response.json({ error: "JSON no válido" }, { status: 400 });
  }
  const c = esquema.safeParse(json);
  if (!c.success) return Response.json({ error: "Datos no válidos", detalle: c.error.issues }, { status: 422 });
  const b = c.data;

  const db = supabaseAdmin();
  const { data: d } = await db.from("diagnosticos").select("id, interno").eq("id", b.diagnostico_id).maybeSingle();
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (d.interno) return Response.json({ error: "Ya tenía redacción" }, { status: 409 });

  const meta = { redaccion: b.redaccion, modelo: b.modelo ?? null, execution_id: b.execution_id ?? null, generado_at: b.generado_at ?? new Date().toISOString() };
  const { error } = await db
    .from("diagnosticos")
    .update({
      informe: b.informe ? { ...b.informe, ...meta } : null,
      interno: { ...(b.interno ?? {}), ...meta },
    })
    .eq("id", b.diagnostico_id)
    .is("interno", null);
  if (error) {
    console.error("[motor] callback", error);
    return Response.json({ error: "No se ha podido guardar" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
