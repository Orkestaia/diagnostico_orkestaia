/**
 * "Qué tener a mano el día de la visita": sale en la pantalla final del previo.
 * Nace de la regla de la visita "enséñame, no me cuentes" (batería §1) y de las preguntas para
 * abrir cada proceso (batería §3): si el cliente lo tiene a mano, las 3 h rinden más.
 *
 * ⚠️ Textos propuestos por BUILDS (18-sep), aprobados en concepto por Aitor. Revisar redacción.
 * Nunca pedir datos personales de clientes o pacientes: se enseña, no se entrega.
 */
import type { SectorId } from "../tipos";

export const PREPARACION_INTRO = "Para el día de la visita, si puedes, ten a mano:";

const COMUNES = [
  "Acceso a los programas que usáis cada día, con la sesión abierta",
  "Un ejemplo reciente de la tarea que más tiempo os quita",
];

export const PREPARACION: Record<SectorId, string[]> = {
  servicios_profesionales: [
    "Un expediente reciente, desde la primera consulta hasta el encargo",
    "La lista de documentos que pedís al empezar y cómo la enviáis",
    "Un escrito, informe o memoria que redactéis casi igual cada vez",
    "Una oferta de honorarios o presupuesto reciente",
  ],
  hosteleria_eventos: [
    "La última petición de evento y todo lo que vino después",
    "Cómo apuntáis las reservas: libreta, programa o plataforma",
    "La ficha o los mensajes con los que pasáis un evento a cocina y sala",
  ],
  industria_distribucion: [
    "Un pedido que os llegó por email o WhatsApp",
    "Un presupuesto reciente y la solicitud de la que salió",
    "Una factura de proveedor con su albarán",
    "Una tarifa de proveedor que hayáis cargado hace poco",
  ],
  salud: [
    "La agenda o el programa con el que dais y confirmáis las citas",
    "La ficha y el consentimiento de un paciente nuevo, en blanco",
    "Un presupuesto de tratamiento",
  ],
  otro: ["Un ejemplo real de la tarea que más se repite"],
};

export const PREPARACION_CIERRE =
  "Y, si puede ser, que esté la persona que hace esas tareas cada día. No hace falta preparar nada más: aproximado vale.";

export function preparacionDe(sector: SectorId): string[] {
  return [...PREPARACION[sector], ...COMUNES];
}
