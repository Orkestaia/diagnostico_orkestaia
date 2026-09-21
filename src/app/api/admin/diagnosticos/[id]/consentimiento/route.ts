import { z } from "zod";
import { consentimientoActivo } from "@/config/consentimiento";
import { exigirAdmin } from "@/lib/acceso";
import { guardarConsentimiento } from "@/lib/consentimiento";

/**
 * Consentimiento agregado marcado por el cliente en el portátil de Aitor, en la pantalla de cierre
 * de la visita (spec §7). Clerk. Con el interruptor apagado, 404.
 */
const esquema = z.object({ acepta: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!consentimientoActivo()) return Response.json({ error: "No encontrado" }, { status: 404 });
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return Response.json({ error: "Id no válido" }, { status: 400 });
  const cuerpo = esquema.safeParse(await req.json().catch(() => null));
  if (!cuerpo.success) return Response.json({ error: "Datos no válidos" }, { status: 400 });
  if (!(await guardarConsentimiento(id, cuerpo.data.acepta)))
    return Response.json({ error: "No se ha podido guardar" }, { status: 500 });
  return Response.json({ acepta: cuerpo.data.acepta });
}
