import { cookies } from "next/headers";
import { encuestaCaducada, galleta, guardarRespuesta, leerEncuesta } from "@/lib/datosEncuesta";
import { demasiadas, dentroDelLimite } from "@/lib/limite";
import { sanearRespuestaEncuesta } from "@/lib/madurez";

/**
 * Envío de la encuesta del equipo (batería v2 §6). Sin cuenta y ANÓNIMO: solo se guarda lo que
 * marcó, nunca quién es. Una respuesta por dispositivo (cookie), como dice el documento: es
 * orientativo, no un control.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const encuesta = await leerEncuesta(token);
  if (!encuesta) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (encuestaCaducada(encuesta.abiertaHasta))
    return Response.json({ error: "La encuesta está cerrada" }, { status: 410 });
  if (!(await dentroDelLimite(token))) return demasiadas();

  const tarro = await cookies();
  if (tarro.get(galleta(token)))
    return Response.json({ error: "Ya has contestado desde este dispositivo" }, { status: 409 });

  const respuesta = sanearRespuestaEncuesta(await req.json().catch(() => null), encuesta.areas);
  if (!respuesta) return Response.json({ error: "Datos no válidos" }, { status: 400 });
  if (!(await guardarRespuesta(encuesta.id, respuesta))) {
    return Response.json({ error: "No se ha podido guardar" }, { status: 500 });
  }

  tarro.set(galleta(token), "1", {
    maxAge: 60 * 60 * 24 * 90,
    sameSite: "lax",
    path: "/",
    httpOnly: true,
  });
  return Response.json({ gracias: true }, { status: 201 });
}
