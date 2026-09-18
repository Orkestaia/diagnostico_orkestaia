/**
 * Banco de sectores v1 — §5.4 `salud` (+ §9 y §10). Transcrito sin cambios.
 * Sprint 2: está en la configuración pero no se ofrece en las invitaciones todavía.
 */
import type { Sector } from "../tipos";
import { hay, producto } from "./comunes";

export const salud: Sector = {
  id: "salud",
  nombre: "Salud y clínicas",
  subsectores: [
    "Clínica dental",
    "Fisioterapia",
    "Psicología",
    "Medicina o estética",
    "Nutrición",
    "Farmacia",
    "Otro",
  ],
  avisoFijo: "No escribas datos de pacientes. Solo cómo funciona la clínica.",
  fraseIII: "Ahora, la consulta: citas, huecos y papeleo.",
  preguntas: [
    {
      id: "dia.citas_semana",
      texto: "¿Cuántas citas tenéis a la semana?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos de 30", valor: 20 },
        { etiqueta: "30-100", valor: 65 },
        { etiqueta: "100-250", valor: 175 },
        { etiqueta: "Más de 250", valor: 300 },
      ],
    },
    {
      id: "dia.canales_cita",
      texto: "¿Cómo piden cita?",
      tipo: "multi",
      opciones: ["Teléfono", "WhatsApp", "Web o app", "En recepción"].map((etiqueta) => ({
        etiqueta,
      })),
    },
    {
      id: "dia.ausencias",
      texto: "¿Cuántas citas se pierden sin avisar?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos del 5 %", valor: 0.03 },
        { etiqueta: "5-10 %", valor: 0.075 },
        { etiqueta: "10-20 %", valor: 0.15 },
        { etiqueta: "Más del 20 %", valor: 0.25 },
        { etiqueta: "No lo sé", valor: null },
      ],
    },
    {
      id: "dia.confirmacion",
      texto: "¿Cómo confirmáis las citas?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Llamando", valor: 3 },
        { etiqueta: "WhatsApp a mano", valor: 1.5 },
        { etiqueta: "Ya es automático", valor: 0 },
        { etiqueta: "No confirmamos", valor: 0 },
      ],
      nota: "valor = minutos por cita",
    },
    {
      id: "dia.papeleo",
      texto: "¿Cómo se rellena la ficha y el consentimiento de un paciente nuevo?",
      tipo: "chips",
      opciones: ["En papel", "PDF por email", "Formulario digital"].map((etiqueta) => ({
        etiqueta,
      })),
    },
    {
      id: "dia.pacientes_nuevos",
      texto: "¿Cuántos pacientes nuevos al mes?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos de 10", valor: 5 },
        { etiqueta: "10-30", valor: 20 },
        { etiqueta: "30-80", valor: 55 },
        { etiqueta: "Más de 80", valor: 100 },
      ],
    },
    {
      id: "dia.revisiones",
      texto: "¿Volvéis a contactar a quien tiene una revisión o tratamiento pendiente?",
      tipo: "chips",
      opciones: ["Siempre", "A veces", "Casi nunca"].map((etiqueta) => ({ etiqueta })),
    },
  ],
  quickWins: [
    {
      id: "SA-QW1",
      tituloBase: "Citas confirmadas y recordadas sin llamar",
      categoria: "clientes",
      tipo: "mixto",
      formula:
        "Tiempo: `citas_semana × 4,3 × confirmacion × 0,7`. Oportunidad: `citas_semana × 4,3 × ausencias` citas perdidas al mes (sin prometer reducirlas)",
      esfuerzo: "1-2 semanas",
      etiquetas: ["horas", "clientes"],
      palabrasClave: ["citas", "recordatorios", "ausencias"],
      antes:
        "Recepción dedica horas a llamar para confirmar citas, y aun así hay huecos.",
      despues:
        "Cada paciente recibe confirmación y recordatorio, y puede cambiar su cita sin llamar.",
      etiquetaTarea: "Confirmar citas",
      perfil: () => "operativo",
      elegible: (e) => hay(e.n("dia.citas_semana")),
      horasBase: (e) => {
        const m = e.n("dia.confirmacion");
        return producto(e.n("dia.citas_semana"), 4.3, m == null ? m : m / 60);
      },
      pct: 0.7,
      oportunidades: (e) => producto(e.n("dia.citas_semana"), 4.3, e.n("dia.ausencias")),
      unidadOportunidad: "citas perdidas al mes",
    },
    {
      id: "SA-QW2",
      tituloBase: "Peticiones de cita atendidas fuera de horario",
      categoria: "captacion",
      tipo: "oportunidad",
      formula: "`consultas_mes × fuera_horario`",
      esfuerzo: "2-4 semanas",
      etiquetas: ["clientes", "rapidez"],
      palabrasClave: ["llamadas", "horario", "recepción"],
      antes: "Quien llama fuera de horario cuelga y prueba en otra clínica.",
      despues:
        "Se le atiende al momento y recepción le devuelve la llamada a primera hora sabiendo qué necesita.",
      etiquetaTarea: "Atender llamadas fuera de horario",
      perfil: () => null,
      elegible: (e) => hay(e.n("captacion.fuera_horario")),
      oportunidades: (e) =>
        producto(e.n("captacion.consultas_mes"), e.n("captacion.fuera_horario")),
    },
    {
      id: "SA-QW3",
      tituloBase: "Ficha y consentimiento digitales antes de la primera visita",
      categoria: "administracion",
      tipo: "tiempo",
      formula: "`pacientes_nuevos × 12 min × 0,6` si `papeleo ≠ Formulario digital`",
      esfuerzo: "1-2 semanas",
      etiquetas: ["horas", "errores"],
      palabrasClave: ["papeleo", "fichas", "consentimientos"],
      antes:
        "El paciente nuevo rellena papeles en la sala de espera y alguien los transcribe.",
      despues: "Llega con la ficha y el consentimiento hechos desde el móvil.",
      etiquetaTarea: "Pasar a limpio las fichas de pacientes nuevos",
      perfil: () => "operativo",
      elegible: (e) => {
        const p = e.s("dia.papeleo");
        return p !== undefined && p !== "Formulario digital";
      },
      horasBase: (e) => producto(e.n("dia.pacientes_nuevos"), 12 / 60),
      pct: 0.6,
    },
    {
      id: "SA-QW4",
      tituloBase: "Pacientes que vuelven a su revisión",
      categoria: "clientes",
      tipo: "oportunidad",
      // ⚠️ "Cualitativo": sin conteo. En el ranking se trata como un QW sin cifras (valor fijo,
      // igual que los de riesgo). Pendiente de confirmar con Aitor antes del sprint 2.
      formula: "Cualitativo si `revisiones ≠ Siempre`",
      esfuerzo: "1-2 semanas",
      etiquetas: ["clientes"],
      palabrasClave: ["revisiones", "tratamientos", "reactivar"],
      antes: "Los pacientes con revisión pendiente se olvidan.",
      despues: "Reciben un recordatorio amable en su momento.",
      etiquetaTarea: "Recordar revisiones pendientes",
      perfil: () => null,
      elegible: (e) => {
        const r = e.s("dia.revisiones");
        return r !== undefined && r !== "Siempre";
      },
    },
  ],
  noAutomatizar: [
    "nada que implique datos clínicos o diagnóstico",
    "la respuesta a urgencias (siempre derivar a humano o a emergencias)",
    "comunicaciones sobre resultados",
  ],
  validar: [
    "qué programa de gestión de la clínica usáis",
    "normativa aplicable (en EEUU, HIPAA)",
    "que ningún dato clínico pase por el sistema de avisos",
  ],
  previoIII: ["dia.citas_semana", "dia.ausencias", "dia.confirmacion"],
  activoEnInvitaciones: false,
};
