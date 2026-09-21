import { after } from "next/server";
import { z } from "zod";
import { aperturaMapaActiva } from "@/config/interruptores";
import { leerMapaPublico } from "@/lib/datosMapa";
import { guardarAperturas, leerAperturas } from "@/lib/datosInteraccion";
import { dispositivoDe, registrarApertura } from "@/lib/interaccionMapa";
import { demasiadas, dentroDelLimite } from "@/lib/limite";
import { enviarEvento } from "@/lib/motor";
import { urlBase } from "@/lib/url";

/**
 * Aviso de que el cliente ha abierto su mapa (spec §7). APAGADO hasta la luz verde de TEMIS: con
 * el interruptor apagado responde 404 y la página ni lo llama. La página solo lo llama tras
 * interacción real (10 s visible o scroll) y nunca desde el panel. Sin IP ni navegador: se guarda
 * el tipo de dispositivo y un identificador aleatorio del navegador.
 */
const esquema = z.object({ dispositivo: z.string().regex(/^[A-Za-z0-9_-]{8,40}$/) });

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!aperturaMapaActiva()) return Response.json({ error: "No encontrado" }, { status: 404 });
  const { token } = await params;
  const datos = await leerMapaPublico(token);
  if (!datos) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (!(await dentroDelLimite(token, 10))) return demasiadas();
  const cuerpo = esquema.safeParse(await req.json().catch(() => null));
  if (!cuerpo.success) return Response.json({ error: "Datos no válidos" }, { status: 400 });

  const tipo = dispositivoDe(req.headers.get("user-agent"));
  const r = registrarApertura(
    await leerAperturas(datos.id),
    { id: cuerpo.data.dispositivo, tipo },
    new Date(),
  );
  if (!(await guardarAperturas(datos.id, r.aperturas)))
    return Response.json({ error: "No se ha podido guardar" }, { status: 500 });

  if (r.aviso) {
    const base = await urlBase();
    after(() =>
      enviarEvento("diagnostico.mapa_abierto", {
        diagnostico_id: datos.id,
        empresa: datos.empresa,
        aviso: r.aviso,
        dispositivo: tipo,
        aperturas: r.aperturas.total,
        urls: { admin: `${base}/admin/d/${datos.id}/mapa` },
      }),
    );
  }
  return Response.json({ registrado: true });
}
