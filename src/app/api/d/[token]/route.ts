import { leerPrevio, paraCliente } from "@/lib/datosPrevio";

/** Datos del previo para el cliente (spec §9). Solo columnas visibles, sin id interno. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await leerPrevio(token);
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 });
  return Response.json(paraCliente(d), { headers: { "Cache-Control": "no-store" } });
}
