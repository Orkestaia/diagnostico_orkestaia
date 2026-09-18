/** Banco de sectores v1 — índice, mapeo al CRM (§7). */
import type { Pregunta, Sector, SectorId } from "../tipos";
import { PREGUNTAS_I, PREGUNTAS_II, PREGUNTAS_IV, PREGUNTAS_V, QUICK_WINS_COMUNES } from "./comunes";
import { hosteleriaEventos } from "./hosteleria_eventos";
import { industriaDistribucion } from "./industria_distribucion";
import { otro } from "./otro";
import { salud } from "./salud";
import { serviciosProfesionales } from "./servicios_profesionales";

export const SECTORES: Record<SectorId, Sector> = {
  servicios_profesionales: serviciosProfesionales,
  hosteleria_eventos: hosteleriaEventos,
  industria_distribucion: industriaDistribucion,
  salud,
  otro,
};

export const SECTORES_EN_INVITACIONES = Object.values(SECTORES).filter(
  (s) => s.activoEnInvitaciones,
);

export function esSectorId(v: string): v is SectorId {
  return v in SECTORES;
}

/** Todas las preguntas que pueden aparecer para un sector (comunes + las del sector). */
export function preguntasDeSector(sector: SectorId): Pregunta[] {
  return [
    ...PREGUNTAS_I,
    ...PREGUNTAS_II,
    ...SECTORES[sector].preguntas,
    ...PREGUNTAS_IV,
    ...PREGUNTAS_V,
  ];
}

/** Quick wins que se evalúan para un sector: comunes (§4) + los del sector. */
export function quickWinsDeSector(sector: SectorId) {
  return [...QUICK_WINS_COMUNES, ...SECTORES[sector].quickWins];
}

// ── §7 Mapeo al CRM (`crm_contactos.sector`, texto libre) ──
export function sectorCrm(sector: SectorId, subsector?: string | null): string {
  switch (sector) {
    case "servicios_profesionales":
      if (subsector === "Despacho de abogados") return "Abogados";
      if (subsector === "Asesoría o gestoría") return "Asesorías";
      if (subsector === "Arquitectura, ingeniería u oficina técnica")
        return "Arquitectura e ingeniería";
      return "Servicios profesionales"; // Consultoría / Otro
    case "hosteleria_eventos":
      return "Hostelería y eventos";
    case "industria_distribucion":
      if (subsector === "Rotulación e imagen") return "Rotulación";
      if (subsector === "Construcción o reformas") return "Construcción y reformas";
      return "Industria y distribución";
    case "salud":
      if (subsector === "Clínica dental") return "Dentistas";
      if (subsector === "Medicina o estética") return "Clínicas Estéticas";
      if (subsector === "Nutrición") return "Nutricionistas";
      return "Salud";
    case "otro":
      return "Otros";
  }
}
