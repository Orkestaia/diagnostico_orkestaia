import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { TarjetaProceso } from "@/config/consultor/tarjeta";
import type { Respuestas, SectorId } from "@/config/tipos";
import { consentimientoActivo } from "@/config/consentimiento";
import { respuestasPorConfirmar } from "@/config/redacciones";
import { leerConsentimiento } from "@/lib/consentimiento";
import { COLUMNAS_VISITA } from "@/lib/diagnosticos";
import { pasosPrevio } from "@/lib/previo";
import { loQueHeEntendido } from "@/lib/resumenPrevio";
import { leerRedaccion } from "@/lib/redaccion";
import { supabaseAdmin } from "@/lib/supabase";
import { sugeridasDelPrevio, type RespuestasVisita } from "@/lib/visita";
import { Visita, type DatosVisita } from "./Visita";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Visita · ORKESTA Automatización & IA",
  robots: { index: false, follow: false },
};

/**
 * Modo consultor (spec §4). Se enseña al cliente en la tableta o el portátil de Aitor.
 * Aquí solo se cargan columnas visibles: lo 🔒 se pide aparte al activar la vista privada.
 */
export default async function PaginaVisita({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { data: d } = await supabaseAdmin()
    .from("diagnosticos")
    .select(COLUMNAS_VISITA)
    .eq("id", id)
    .maybeSingle();
  if (!d) notFound();

  const sector = d.sector as SectorId;
  const previo = (d.respuestas_previo ?? {}) as Respuestas;
  const respuestasVisita = (d.respuestas_visita ?? {}) as RespuestasVisita;
  // banco_v1.1: respuestas contestadas a una redacción anterior de la pregunta.
  const porConfirmar = respuestasPorConfirmar(previo, {
    redaccion: await leerRedaccion(d.id),
    configVersion: d.config_version,
    correcciones: respuestasVisita.correcciones_previo,
  });
  // "Lo que nos contaste": solo lo que respondió, con su texto, para poder corregirlo delante de él.
  const contado = pasosPrevio(sector, previo)
    .filter(
      ({ pregunta: p }) =>
        previo[p.id] !== undefined && previo[p.id] !== null && previo[p.id] !== "",
    )
    .map(({ pregunta: p }) => ({
      id: p.id,
      texto: p.texto,
      tipo: p.tipo,
      valor: previo[p.id],
      opciones: p.tipo === "si_no" ? ["Sí", "No"] : (p.opciones ?? []).map((o) => o.etiqueta),
      max: p.maxSeleccion ?? null,
      cual: Object.fromEntries(
        Object.entries(previo)
          .filter(([k]) => k.startsWith(`${p.id}::`))
          .map(([k, v]) => [k.split("::")[1], String(v ?? "")]),
      ),
      porConfirmar: porConfirmar.get(p.id)?.textoContestado ?? null,
    }));

  const datos: DatosVisita = {
    id: d.id,
    estado: d.estado,
    sector,
    empresa: d.empresa,
    contacto: d.contacto_nombre,
    tipoNegocio: d.tipo_negocio,
    fechaReunion: d.fecha_reunion,
    visitaCerradaAt: d.visita_cerrada_at,
    respuestasVisita,
    procesos: (d.procesos ?? []) as TarjetaProceso[],
    previo,
    sugeridas: sugeridasDelPrevio(sector, previo, porConfirmar.keys()),
    entendido: loQueHeEntendido(previo, sector, porConfirmar.keys()),
    contado,
    consentimiento: consentimientoActivo()
      ? { inicial: (await leerConsentimiento(d.id)).acepta }
      : null,
  };
  return <Visita datos={datos} />;
}
