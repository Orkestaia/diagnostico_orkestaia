/**
 * Batería del consultor v1 — §3 Plantillas de procesos por sector (+ extras del bloque A).
 * Fuente: ORKESTA - JARVIS/01_ORKESTA_CORE/sales-system/diagnostico-app/
 *         diagnostico-app_bateria-consultor_v1_2026-09-18.md
 * Transcrito sin cambiar textos ni valores. El orden de cada lista es el sugerido.
 */
import type { SectorId } from "../tipos";
import type { Area } from "./tarjeta";

/**
 * "QW / pct" de la batería: el QW del banco y su % automatizable por defecto.
 * - número: pct por defecto.
 * - "oportunidad" / "riesgo": el QW no tiene % de tiempo; la tarjeta solo enseña las horas de hoy.
 * `qw: null` = "genérico".
 */
export interface Plantilla {
  nombre: string;
  area: Area;
  pregunta: string;
  qw: string | null;
  pct: number | "oportunidad" | "riesgo";
}

export interface ExtraBloqueA {
  texto: string;
  privado: boolean;
}

export const PLANTILLAS_COMUNES: Plantilla[] = [
  {
    nombre: "Informes y datos copiados a mano",
    area: "Administración",
    pregunta: "¿Qué informe o Excel preparáis cada semana o cada mes?",
    qw: "C-QW3",
    pct: 0.6,
  },
  {
    nombre: "Primera respuesta a una consulta nueva",
    area: "Captación",
    pregunta: "Enséñame la última consulta que entró. ¿Qué pasó después?",
    qw: "C-QW1",
    pct: 0.5,
  },
  {
    nombre: "Seguimiento de presupuestos",
    area: "Captación",
    pregunta: "¿Qué pasa con un presupuesto que no contestan?",
    qw: "C-QW2",
    pct: 0.7,
  },
];

export const PLANTILLAS_SECTOR: Record<SectorId, Plantilla[]> = {
  servicios_profesionales: [
    {
      nombre: "Alta de un cliente nuevo (de la consulta al encargo firmado)",
      area: "Captación",
      pregunta: "Desde que alguien os escribe hasta que firmáis el encargo, ¿qué pasa?",
      qw: "C-QW1",
      pct: 0.5,
    },
    {
      nombre: "Recogida de documentación",
      area: "Operación",
      pregunta: "Enséñame qué le pedís a un cliente al empezar y cómo lo perseguís.",
      qw: "SP-QW1",
      pct: 0.6,
    },
    {
      nombre: "Documentos que se repiten",
      area: "Operación",
      pregunta: "¿Cuál es el último escrito, memoria o informe que redactaste casi igual que otro?",
      qw: "SP-QW2",
      pct: 0.3,
    },
    {
      nombre: "Estado del asunto y comunicación con el cliente",
      area: "Clientes",
      pregunta: "¿Cuántas veces os preguntan cómo va lo suyo?",
      qw: "SP-QW3",
      pct: 0.5,
    },
    {
      nombre: "Plazos y vencimientos",
      area: "Operación",
      pregunta: "¿Cómo sabéis que vence un plazo?",
      qw: "SP-QW4",
      pct: "riesgo",
    },
    {
      nombre: "Ofertas de honorarios",
      area: "Captación",
      pregunta: "Enséñame la última oferta. ¿Cuánto tardaste?",
      qw: "C-QW4",
      pct: 0.4,
    },
    {
      nombre: "Expedientes de ayudas o subvenciones (arquitectura, asesoría)",
      area: "Operación",
      pregunta: "¿Quién persigue los papeles de cada propietario o cliente?",
      qw: "SP-QW1",
      pct: 0.6,
    },
    {
      nombre: "Licitaciones y concursos (arquitectura, ingeniería)",
      area: "Captación",
      pregunta: "¿Cómo os enteráis y cuánto cuesta preparar uno?",
      qw: "ID-QW5",
      pct: 0.3,
    },
    {
      nombre: "Facturación, provisiones y cobros",
      area: "Administración",
      pregunta: "¿Cuántos cobros tenéis que perseguir al mes?",
      qw: "SP-QW5",
      pct: 0.6,
    },
  ],
  hosteleria_eventos: [
    {
      nombre: "Reservas",
      area: "Captación",
      pregunta: "¿Quién coge el teléfono en mitad del servicio? ¿Y los lunes?",
      qw: "HE-QW2",
      pct: "oportunidad",
    },
    {
      nombre: "Peticiones de eventos hasta el cierre",
      area: "Captación",
      pregunta: "Enséñame la última petición de boda o comunión y todo lo que vino después.",
      qw: "HE-QW1",
      pct: 0.5,
    },
    {
      nombre: "Coordinación de un evento cerrado con cocina y sala",
      area: "Operación",
      pregunta: "¿Cómo llega a cocina el número de comensales y los alérgenos?",
      qw: "HE-QW3",
      pct: 0.5,
    },
    {
      nombre: "Reseñas y reputación",
      area: "Clientes",
      pregunta: "¿Quién contesta las reseñas y cuándo?",
      qw: "HE-QW4",
      pct: "riesgo",
    },
    {
      nombre: "Clientes que vuelven (campañas de temporada, Navidad, comuniones)",
      area: "Clientes",
      pregunta: "¿Qué hacéis con los datos de quien ya celebró algo con vosotros?",
      qw: "HE-QW4",
      pct: "riesgo",
    },
    {
      nombre: "Tarjetas regalo",
      area: "Clientes",
      pregunta: "¿Cómo se venden y cómo se canjean?",
      qw: null,
      pct: 0.4,
    },
    {
      nombre: "Compras a proveedores",
      area: "Administración",
      pregunta: "¿Cómo se hace el pedido semanal?",
      qw: null,
      pct: 0.4,
    },
  ],
  industria_distribucion: [
    {
      nombre: "Entrada de pedidos",
      area: "Operación",
      pregunta: "Enséñame un pedido que llegó por email: desde que entra hasta que sale.",
      qw: "ID-QW1",
      pct: 0.6,
    },
    {
      nombre: "Presupuestos (con visita o medición)",
      area: "Captación",
      pregunta: "Enséñame el último presupuesto. ¿Qué faltaba cuando llegó la solicitud?",
      qw: "C-QW4",
      pct: 0.4,
    },
    {
      nombre: "Tarifas y catálogo de proveedores",
      area: "Administración",
      pregunta: "¿Cómo se carga una tarifa nueva?",
      qw: "ID-QW2",
      pct: 0.5,
    },
    {
      nombre: "Estado de pedidos o trabajos y avisos al cliente",
      area: "Clientes",
      pregunta: "¿Cómo sabéis en qué punto está cada trabajo?",
      qw: "ID-QW3",
      pct: 0.5,
    },
    {
      nombre: "Partes de trabajo o montaje hasta la factura",
      area: "Administración",
      pregunta: "¿Cómo vuelve un parte firmado a la oficina?",
      qw: null,
      pct: 0.5,
    },
    {
      nombre: "Facturas de proveedor y albaranes",
      area: "Administración",
      pregunta: "¿Quién cuadra cada factura con su albarán?",
      qw: "ID-QW4",
      pct: 0.5,
    },
    {
      nombre: "Licitaciones",
      area: "Captación",
      pregunta: "¿Cuántas al año? ¿Quién lee los pliegos?",
      qw: "ID-QW5",
      pct: 0.3,
    },
    {
      nombre: "Permisos y licencias (rotulación, instalaciones)",
      area: "Operación",
      pregunta: "¿Cuánto retrasa un permiso municipal?",
      qw: null,
      pct: 0.3,
    },
    {
      nombre: "Compras y reposición de stock (distribución)",
      area: "Operación",
      pregunta: "¿Cómo decidís qué reponer?",
      qw: null,
      pct: 0.4,
    },
  ],
  salud: [
    {
      nombre: "Petición de cita",
      area: "Captación",
      pregunta: "¿Qué pasa con una llamada que entra fuera de horario?",
      qw: "SA-QW2",
      pct: "oportunidad",
    },
    {
      nombre: "Confirmación y recordatorios",
      area: "Clientes",
      pregunta: "¿Cuánto tiempo pasa recepción confirmando citas?",
      qw: "SA-QW1",
      pct: 0.7,
    },
    {
      nombre: "Primera visita: ficha y consentimientos",
      area: "Administración",
      pregunta: "Enséñame la ficha de un paciente nuevo.",
      qw: "SA-QW3",
      pct: 0.6,
    },
    {
      nombre: "Revisiones y tratamientos pendientes",
      area: "Clientes",
      pregunta: "¿Qué pasa con quien no vuelve a su revisión?",
      qw: "SA-QW4",
      pct: "oportunidad",
    },
    {
      nombre: "Presupuestos de tratamiento",
      area: "Captación",
      pregunta: "¿Qué pasa con un presupuesto que el paciente no acepta en el momento?",
      qw: "C-QW2",
      pct: 0.7,
    },
    {
      nombre: "Cobros y financiación",
      area: "Administración",
      pregunta: "¿Cómo se gestionan los pagos aplazados?",
      qw: null,
      pct: 0.4,
    },
  ],
  // "Sin plantillas: tarjetas en blanco."
  otro: [],
};

/** `otro`: `pct_automatizable` por defecto de las tarjetas en blanco. */
export const PCT_DEFECTO_OTRO = 0.4;

export const EXTRAS_BLOQUE_A: Record<SectorId, ExtraBloqueA[]> = {
  servicios_profesionales: [
    { texto: "reparto del trabajo por tipo de encargo", privado: false },
    { texto: "¿trabajáis con subvenciones o licitaciones?", privado: false },
    {
      texto:
        "en despachos de familia o penal: ¿hay casos de violencia? (nada automático con esos clientes)",
      privado: true,
    },
  ],
  hosteleria_eventos: [
    { texto: "peso de eventos frente a carta", privado: false },
    { texto: "temporadas", privado: false },
    { texto: "quién gestiona la oficina de eventos", privado: false },
  ],
  industria_distribucion: [
    { texto: "canales de venta y su peso", privado: false },
    { texto: "tipo de cliente", privado: false },
    {
      texto:
        "¿tenéis un proyecto con la ayuda SPRI u otro proveedor en marcha? (qué cubre, para no pisarlo)",
      privado: true,
    },
  ],
  salud: [
    { texto: "número de profesionales y gabinetes", privado: false },
    { texto: "programa de gestión clínica", privado: false },
    {
      texto: "datos clínicos: confirmar que nada clínico pasará por el sistema",
      privado: true,
    },
  ],
  otro: [],
};

export function plantillasDeSector(sector: SectorId): Plantilla[] {
  return [...PLANTILLAS_COMUNES, ...PLANTILLAS_SECTOR[sector]];
}
