import { z } from "zod";
import { consentimientoActivo } from "@/config/consentimiento";
import { guardarConsentimiento } from "@/lib/consentimiento";
import { leerPrevio } from "@/lib/datosPrevio";
import { demasiadas, dentroDelLimite } from "@/lib/limite";

/**
 * El cliente marca o retira el consentimiento agregado desde su enlace. Mientras el interruptor
 * esté apagado responde 404, como si no existiera.
 */
const esquema = z.object({ acepta: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!consentimientoActivo()) return Response.json({ error: "No encontrado" }, { status: 404 });
  const { token } = await params;
  const d = await leerPrevio(token);
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (!(await dentroDelLimite(token))) return demasiadas();
  const cuerpo = esquema.safeParse(await req.json().catch(() => null));
  if (!cuerpo.success) return Response.json({ error: "Datos no válidos" }, { status: 400 });
  if (!(await guardarConsentimiento(d.id, cuerpo.data.acepta)))
    return Response.json({ error: "No se ha podido guardar" }, { status: 500 });
  return Response.json({ acepta: cuerpo.data.acepta });
}
