/** Banco de sectores v1 — §5.2 `hosteleria_eventos` (+ §9 y §10). Transcrito sin cambios. */
import type { Sector } from "../tipos";
import { hay, producto } from "./comunes";

export const hosteleriaEventos: Sector = {
  id: "hosteleria_eventos",
  nombre: "Hostelería y eventos",
  subsectores: [
    "Restaurante",
    "Restaurante con eventos o bodas",
    "Catering",
    "Espacio de eventos",
    "Bar o cafetería",
  ],
  fraseIII: "Ahora, el servicio: lo que pasa mientras la cocina está a tope.",
  preguntas: [
    {
      id: "dia.canales_reserva",
      texto: "¿Cómo entran las reservas?",
      tipo: "multi",
      opciones: [
        "Teléfono",
        "Web o plataforma de reservas",
        "WhatsApp",
        "Redes sociales",
        "En persona",
      ].map((etiqueta) => ({ etiqueta })),
    },
    {
      id: "dia.llamadas_servicio",
      texto: "¿Cuántas llamadas entran al día durante el servicio?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Pocas", valor: 2 },
        { etiqueta: "Algunas", valor: 8 },
        { etiqueta: "Muchas", valor: 20 },
      ],
    },
    {
      id: "dia.llamadas_perdidas",
      texto: "¿Cuántas se quedan sin coger?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Casi ninguna", valor: 0.05 },
        { etiqueta: "Algunas", valor: 0.2 },
        { etiqueta: "Bastantes", valor: 0.4 },
      ],
    },
    {
      id: "dia.solicitudes_evento",
      texto: "¿Cuántas peticiones de presupuesto de eventos recibís al mes?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Ninguna", valor: 0 },
        { etiqueta: "1-5", valor: 3 },
        { etiqueta: "5-15", valor: 10 },
        { etiqueta: "15-40", valor: 25 },
        { etiqueta: "Más de 40", valor: 50 },
      ],
    },
    {
      id: "dia.minutos_respuesta_evento",
      texto: "¿Cuánto lleva contestar cada una?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos de 15 min", valor: 10 },
        { etiqueta: "15-30 min", valor: 22 },
        { etiqueta: "30-60 min", valor: 45 },
        { etiqueta: "Más de 1 h", valor: 75 },
      ],
      mostrarSi: { id: "dia.solicitudes_evento", op: "gt", valor: 0 },
    },
    {
      id: "dia.eventos_mes",
      texto: "¿Cuántos eventos cerrados celebráis al mes?",
      tipo: "rango",
      opciones: [
        { etiqueta: "0", valor: 0 },
        { etiqueta: "1-4", valor: 2.5 },
        { etiqueta: "5-15", valor: 10 },
        { etiqueta: "Más de 15", valor: 20 },
      ],
    },
    {
      id: "dia.info_cocina",
      texto: "¿Cómo llega la información de un evento a cocina y sala?",
      tipo: "chips",
      opciones: ["Con un programa", "Papel o WhatsApp", "De palabra"].map((etiqueta) => ({
        etiqueta,
      })),
      mostrarSi: { id: "dia.eventos_mes", op: "gt", valor: 0 },
    },
    {
      id: "dia.incidencias_evento",
      texto: "¿Ha habido errores (alérgenos, número de comensales, horarios)?",
      tipo: "chips",
      opciones: ["Nunca", "Alguna vez", "A menudo"].map((etiqueta) => ({ etiqueta })),
      mostrarSi: { id: "dia.eventos_mes", op: "gt", valor: 0 },
    },
    {
      id: "dia.resenas",
      texto: "¿Quién contesta las reseñas?",
      tipo: "chips",
      opciones: ["Nadie", "Cuando se puede", "Siempre"].map((etiqueta) => ({ etiqueta })),
    },
    {
      id: "dia.clientes_base",
      texto: "¿Guardáis datos de clientes para volver a contactarlos?",
      tipo: "chips",
      opciones: ["No", "Los tenemos pero no los usamos", "Hacemos campañas"].map(
        (etiqueta) => ({ etiqueta }),
      ),
    },
  ],
  quickWins: [
    {
      id: "HE-QW1",
      tituloBase: "Peticiones de eventos contestadas al momento y con seguimiento",
      categoria: "captacion",
      tipo: "mixto",
      formula:
        "Tiempo: `solicitudes_evento × minutos_respuesta_evento × 0,5`. Oportunidad: `solicitudes_evento × 0,5` peticiones que hoy no reciben seguimiento si `tiempo_respuesta ∈ {1-2 días, Más}`",
      esfuerzo: "2-3 semanas",
      etiquetas: ["clientes", "rapidez"],
      palabrasClave: ["eventos", "bodas", "presupuestos", "comuniones"],
      antes:
        "Las peticiones de boda o comunión esperan a que alguien tenga tiempo, y si no contestan, se pierden.",
      despues:
        "Cada petición recibe al momento la información adecuada y un seguimiento en los días siguientes.",
      etiquetaTarea: "Contestar peticiones de eventos",
      perfil: () => "tactico",
      elegible: (e) => hay(e.n("dia.solicitudes_evento")),
      horasBase: (e) => {
        const m = e.n("dia.minutos_respuesta_evento");
        return producto(e.n("dia.solicitudes_evento"), m == null ? m : m / 60);
      },
      pct: 0.5,
      oportunidades: (e) =>
        ["1-2 días", "Más"].includes(e.s("captacion.tiempo_respuesta") ?? "")
          ? producto(e.n("dia.solicitudes_evento"), 0.5)
          : 0,
      unidadOportunidad: "peticiones que hoy no reciben seguimiento",
    },
    {
      id: "HE-QW2",
      tituloBase: "Reservas y preguntas atendidas aunque estéis en servicio",
      categoria: "captacion",
      tipo: "oportunidad",
      formula: "`llamadas_servicio × 26 días × llamadas_perdidas` llamadas sin atender al mes",
      esfuerzo: "2-4 semanas",
      etiquetas: ["clientes", "rapidez"],
      palabrasClave: ["teléfono", "llamadas", "reservas"],
      antes: "En plena comida suena el teléfono y nadie puede cogerlo.",
      despues:
        "Las reservas y preguntas repetidas se atienden solas; lo demás te llega como recado ordenado.",
      etiquetaTarea: "Atender el teléfono en pleno servicio",
      perfil: () => null,
      elegible: (e) => hay(e.n("dia.llamadas_perdidas")),
      oportunidades: (e) =>
        producto(e.n("dia.llamadas_servicio"), 26, e.n("dia.llamadas_perdidas")),
      unidadOportunidad: "llamadas sin atender al mes",
    },
    {
      id: "HE-QW3",
      tituloBase: "Ficha de evento que llega igual a cocina y a sala",
      categoria: "operaciones",
      tipo: "mixto",
      formula: "Tiempo: `eventos_mes × 45 min × 0,5`. Riesgo si `incidencias_evento ≠ Nunca`",
      esfuerzo: "2-3 semanas",
      etiquetas: ["errores"],
      palabrasClave: ["cocina", "alérgenos", "coordinación"],
      antes: "Los datos del evento viajan por WhatsApp o de palabra.",
      despues:
        "Una ficha única con comensales, alérgenos y horarios llega igual a cocina y a sala.",
      etiquetaTarea: "Pasar los datos de cada evento a cocina y sala",
      perfil: () => "tactico",
      elegible: (e) => hay(e.n("dia.eventos_mes")),
      horasBase: (e) => producto(e.n("dia.eventos_mes"), 45 / 60),
      pct: 0.5,
      riesgo: (e) => {
        const inc = e.s("dia.incidencias_evento");
        return inc !== undefined && inc !== "Nunca";
      },
    },
    {
      id: "HE-QW4",
      tituloBase: "Reseñas contestadas y clientes que vuelven",
      categoria: "clientes",
      tipo: "riesgo",
      formula:
        "Sin cifras (no se pregunta el volumen de reseñas). Elegible si `resenas ≠ Siempre` o `clientes_base ≠ Hacemos campañas`",
      esfuerzo: "1-2 semanas",
      etiquetas: ["clientes"],
      palabrasClave: ["reseñas", "fidelizar", "campañas"],
      antes:
        "Las reseñas se contestan cuando se puede y los clientes de eventos no se vuelven a contactar.",
      despues:
        "Cada reseña recibe respuesta y quien celebró algo con vosotros recibe una invitación en la fecha adecuada.",
      etiquetaTarea: "Contestar reseñas y volver a contactar clientes",
      perfil: () => null,
      elegible: (e) => {
        const r = e.s("dia.resenas");
        const c = e.s("dia.clientes_base");
        return (r !== undefined && r !== "Siempre") || (c !== undefined && c !== "Hacemos campañas");
      },
    },
  ],
  noAutomatizar: [
    "la negociación del precio de un evento",
    "la respuesta a una reseña negativa sin revisión",
    "cambios de menú sin confirmación de cocina",
  ],
  validar: [
    "qué sistema de reservas usáis",
    "dónde se apuntan hoy los eventos",
    "quién decide el menú de cada evento",
  ],
  previoIII: ["dia.solicitudes_evento", "dia.llamadas_perdidas", "dia.resenas"],
  activoEnInvitaciones: true,
};
