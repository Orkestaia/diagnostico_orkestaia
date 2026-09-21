import { carpetasClientes } from "@/lib/archivos";
import { exigirTokenMotor } from "@/lib/motor";

/**
 * Archivos de cada diagnóstico (informe y transcripción) para guardarlos fuera de la app:
 * n8n los sube a Google Drive y el script de Aitor los copia a su carpeta de JARVIS.
 * Mismo token que el resto del motor (`x-orkesta-token`); fuera de Clerk, como `/api/motor/*`.
 */
export const maxDuration = 60;

export async function GET(req: Request) {
  const denegado = exigirTokenMotor(req);
  if (denegado) return denegado;
  return Response.json(
    { carpeta_raiz: "Diagnósticos Orkesta", clientes: await carpetasClientes() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
