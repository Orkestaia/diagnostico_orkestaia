import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { encuestaCaducada, galleta, leerEncuesta } from "@/lib/datosEncuesta";
import { Encuesta } from "./Encuesta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Encuesta de IA · ORKESTA Automatización & IA",
  robots: { index: false, follow: false },
};

/**
 * Encuesta de madurez en IA para el equipo (batería v2 §6). Anónima: no se pide nombre ni email
 * y no se guarda nada que permita saber quién ha contestado.
 */
export default async function PaginaEncuesta({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const encuesta = await leerEncuesta(token);
  if (!encuesta) notFound();
  const cerrada = encuestaCaducada(encuesta.abiertaHasta);
  const yaContestada = !!(await cookies()).get(galleta(token));
  return (
    <Encuesta
      token={token}
      empresa={encuesta.empresa}
      areas={encuesta.areas}
      cerrada={cerrada}
      yaContestada={yaContestada}
    />
  );
}
