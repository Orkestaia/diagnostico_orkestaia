/**
 * Banco de sectores v1 — §9 Previo del cliente (5 minutos).
 * 12 preguntas (13 si hace presupuestos) en 5 movimientos. Empresa, nombre, sector y fecha
 * llegan rellenos desde la invitación.
 */
import { FRASES } from "./sectores/comunes";
import { SECTORES } from "./sectores";
import type { SectorId } from "./tipos";

export interface Movimiento {
  numero: "I" | "II" | "III" | "IV" | "V";
  titulo: string;
  frase: string;
  preguntas: string[];
}

export function movimientosPrevio(sector: SectorId): Movimiento[] {
  return [
    {
      numero: "I",
      titulo: "Tu negocio",
      frase: FRASES.movimientoI,
      preguntas: ["negocio.equipo", "negocio.rol"],
    },
    {
      numero: "II",
      titulo: "Cómo llegan tus clientes",
      frase: FRASES.movimientoII,
      preguntas: [
        "captacion.canales",
        "captacion.consultas_mes",
        "captacion.tiempo_respuesta",
        "captacion.hace_presupuestos",
        // "(+ captacion.presupuestos_mes si responde sí)": su `mostrarSi` lo resuelve
        "captacion.presupuestos_mes",
      ],
    },
    {
      numero: "III",
      titulo: "Tu día a día",
      frase: SECTORES[sector].fraseIII,
      preguntas: [...SECTORES[sector].previoIII],
    },
    {
      numero: "IV",
      titulo: "Tus herramientas",
      frase: FRASES.movimientoIV,
      preguntas: ["herramientas.lista"],
    },
    {
      numero: "V",
      titulo: "Tu prioridad",
      frase: FRASES.movimientoV,
      preguntas: ["prioridad.tarea", "prioridad.exito"],
    },
  ];
}

/**
 * §9: qué respuesta del previo precarga qué tarjeta de proceso de la visita.
 * `tarjeta` es el nombre exacto de la plantilla en la batería §3. En `otro` no hay plantilla:
 * se sugiere una tarjeta en blanco con el nombre que dio el cliente.
 * Los minutos solo se rellenan si los dio el cliente; los de las fórmulas son solo ejemplo.
 */
export interface Precarga {
  sector: SectorId | "todos";
  tarjeta: string | { nombreDesde: string };
  volumen: { desde: string; periodo: "dia" | "semana" | "mes" };
  minutosDesde?: string;
}

export const PRECARGAS: Precarga[] = [
  {
    sector: "todos",
    tarjeta: "Primera respuesta a una consulta nueva",
    volumen: { desde: "captacion.consultas_mes", periodo: "mes" },
  },
  {
    sector: "todos",
    tarjeta: "Seguimiento de presupuestos",
    volumen: { desde: "captacion.presupuestos_mes", periodo: "mes" },
  },
  {
    sector: "servicios_profesionales",
    tarjeta: "Recogida de documentación",
    volumen: { desde: "dia.expedientes_mes", periodo: "mes" },
    minutosDesde: "dia.minutos_documentacion",
  },
  {
    sector: "servicios_profesionales",
    tarjeta: "Estado del asunto y comunicación con el cliente",
    volumen: { desde: "dia.llamadas_estado", periodo: "semana" },
  },
  {
    sector: "hosteleria_eventos",
    tarjeta: "Peticiones de eventos hasta el cierre",
    volumen: { desde: "dia.solicitudes_evento", periodo: "mes" },
  },
  {
    sector: "industria_distribucion",
    tarjeta: "Entrada de pedidos",
    volumen: { desde: "dia.pedidos_mes", periodo: "mes" },
  },
  {
    sector: "industria_distribucion",
    tarjeta: "Facturas de proveedor y albaranes",
    volumen: { desde: "dia.facturas_proveedor", periodo: "mes" },
  },
  {
    sector: "salud",
    tarjeta: "Confirmación y recordatorios",
    volumen: { desde: "dia.citas_semana", periodo: "semana" },
    minutosDesde: "dia.confirmacion",
  },
  {
    sector: "otro",
    tarjeta: { nombreDesde: "dia.proceso_repetitivo" },
    volumen: { desde: "dia.veces_mes", periodo: "mes" },
    minutosDesde: "dia.minutos_vez",
  },
];
