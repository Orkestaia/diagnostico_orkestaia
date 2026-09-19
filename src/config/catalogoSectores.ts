/**
 * Catálogo de tipos de negocio para la invitación (decisión de Aitor, 18-sep: "hay muchos más
 * sectores de todo tipo").
 *
 * El banco tiene 5 juegos de preguntas (§5). Cada tipo de negocio de aquí usa el juego que mejor
 * encaja; NO se inventan preguntas nuevas. Cuando el banco añada un sector (§8: ecommerce,
 * turismo, inmobiliarias, educación, agencias), se cambia aquí su `sector` y listo.
 *
 * - `sector` / `subsector`: juego de preguntas y plantillas del banco y la batería.
 * - `crm`: valor para `crm_contactos.sector` (§7). Si no se da, sale del mapeo del banco.
 *
 * Regla de JARVIS (19-sep): si un tipo no encaja CLARAMENTE en un juego de preguntas, va a `otro`.
 * No se escriben juegos nuevos por ahora (esperan a las primeras visitas reales).
 */
import type { SectorId } from "./tipos";

export interface TipoNegocio {
  etiqueta: string;
  sector: SectorId;
  subsector?: string;
  crm?: string;
}

export interface GrupoNegocio {
  grupo: string;
  tipos: TipoNegocio[];
}

const SP = "servicios_profesionales" as const;
const HE = "hosteleria_eventos" as const;
const ID = "industria_distribucion" as const;
const SA = "salud" as const;
const OT = "otro" as const;

export const CATALOGO_SECTORES: GrupoNegocio[] = [
  {
    grupo: "Servicios profesionales",
    tipos: [
      { etiqueta: "Despacho de abogados", sector: SP, subsector: "Despacho de abogados" },
      { etiqueta: "Asesoría o gestoría", sector: SP, subsector: "Asesoría o gestoría" },
      { etiqueta: "Arquitectura", sector: SP, subsector: "Arquitectura, ingeniería u oficina técnica" },
      { etiqueta: "Ingeniería u oficina técnica", sector: SP, subsector: "Arquitectura, ingeniería u oficina técnica" },
      { etiqueta: "Consultoría", sector: SP, subsector: "Consultoría" },
      { etiqueta: "Notaría o registro", sector: SP, subsector: "Otro", crm: "Notarías" },
      { etiqueta: "Correduría o agencia de seguros", sector: SP, subsector: "Otro", crm: "Seguros" },
      { etiqueta: "Inmobiliaria", sector: OT, crm: "Inmobiliarias" },
      { etiqueta: "Agencia de marketing o comunicación", sector: OT, crm: "Agencias de marketing" },
      { etiqueta: "Recursos humanos o selección", sector: OT, crm: "Recursos humanos" },
      { etiqueta: "Diseño, fotografía o producción", sector: OT, crm: "Diseño y producción" },
      { etiqueta: "Traducción o formación a empresas", sector: OT, crm: "Servicios profesionales" },
    ],
  },
  {
    grupo: "Hostelería, turismo y eventos",
    tipos: [
      { etiqueta: "Restaurante", sector: HE, subsector: "Restaurante" },
      { etiqueta: "Restaurante con eventos o bodas", sector: HE, subsector: "Restaurante con eventos o bodas" },
      { etiqueta: "Catering", sector: HE, subsector: "Catering" },
      { etiqueta: "Espacio de eventos", sector: HE, subsector: "Espacio de eventos" },
      { etiqueta: "Bar o cafetería", sector: HE, subsector: "Bar o cafetería" },
      { etiqueta: "Wedding planner u organización de eventos", sector: HE, subsector: "Espacio de eventos", crm: "Eventos" },
      { etiqueta: "Hotel o alojamiento", sector: OT, crm: "Turismo y alojamiento" },
      { etiqueta: "Casa rural o apartamentos turísticos", sector: OT, crm: "Turismo y alojamiento" },
      { etiqueta: "Agencia de viajes o actividades turísticas", sector: OT, crm: "Turismo y alojamiento" },
    ],
  },
  {
    grupo: "Industria, oficios y servicios técnicos",
    tipos: [
      { etiqueta: "Fabricación o taller", sector: ID, subsector: "Fabricación o taller" },
      { etiqueta: "Carpintería, metal o cerrajería", sector: ID, subsector: "Fabricación o taller" },
      { etiqueta: "Taller mecánico", sector: ID, subsector: "Fabricación o taller", crm: "Talleres" },
      { etiqueta: "Distribución o suministros", sector: ID, subsector: "Distribución o suministros" },
      { etiqueta: "Transporte y logística", sector: ID, subsector: "Distribución o suministros", crm: "Transporte y logística" },
      { etiqueta: "Rotulación e imagen", sector: ID, subsector: "Rotulación e imagen" },
      { etiqueta: "Instalaciones o mantenimiento", sector: ID, subsector: "Instalaciones o mantenimiento" },
      { etiqueta: "Instaladora de energía solar o climatización", sector: ID, subsector: "Instalaciones o mantenimiento" },
      { etiqueta: "Limpieza o servicios a empresas", sector: OT, crm: "Limpieza y servicios" },
      { etiqueta: "Construcción o reformas", sector: ID, subsector: "Construcción o reformas" },
      { etiqueta: "Agroalimentaria o producción", sector: ID, subsector: "Fabricación o taller", crm: "Agroalimentaria" },
    ],
  },
  {
    grupo: "Salud, bienestar y cuidado",
    tipos: [
      { etiqueta: "Clínica dental", sector: SA, subsector: "Clínica dental" },
      { etiqueta: "Fisioterapia", sector: SA, subsector: "Fisioterapia" },
      { etiqueta: "Psicología", sector: SA, subsector: "Psicología" },
      { etiqueta: "Medicina o estética", sector: SA, subsector: "Medicina o estética" },
      { etiqueta: "Nutrición", sector: SA, subsector: "Nutrición" },
      { etiqueta: "Farmacia", sector: SA, subsector: "Farmacia" },
      { etiqueta: "Veterinaria", sector: SA, subsector: "Otro", crm: "Veterinarias" },
      { etiqueta: "Óptica o audiología", sector: OT, crm: "Ópticas" },
      { etiqueta: "Podología u otra consulta sanitaria", sector: SA, subsector: "Otro" },
      { etiqueta: "Centro de estética", sector: SA, subsector: "Medicina o estética" },
    ],
  },
  {
    grupo: "Comercio, educación y otros",
    tipos: [
      { etiqueta: "Tienda o comercio local", sector: OT, crm: "Comercio" },
      { etiqueta: "Ecommerce o tienda online", sector: OT, crm: "Ecommerce" },
      { etiqueta: "Academia o centro de formación", sector: OT, crm: "Educación y formación" },
      { etiqueta: "Autoescuela", sector: OT, crm: "Educación y formación" },
      { etiqueta: "Escuela infantil o colegio", sector: OT, crm: "Educación y formación" },
      { etiqueta: "Gimnasio o centro deportivo", sector: OT, crm: "Deporte" },
      { etiqueta: "Peluquería o barbería", sector: OT, crm: "Peluquerías" },
      { etiqueta: "Asociación, fundación u ONG", sector: OT, crm: "Asociaciones" },
      { etiqueta: "Otro tipo de negocio", sector: OT },
    ],
  },
];

export const TIPOS_NEGOCIO: TipoNegocio[] = CATALOGO_SECTORES.flatMap((g) => g.tipos);

export function tipoNegocio(etiqueta: string | null | undefined): TipoNegocio | undefined {
  return TIPOS_NEGOCIO.find((t) => t.etiqueta === etiqueta);
}
