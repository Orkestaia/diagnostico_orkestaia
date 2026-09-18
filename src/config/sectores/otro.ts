/** Banco de sectores v1 — §5.5 `otro` (+ §9 y §10). Transcrito sin cambios. */
import type { Perfil, Sector } from "../tipos";
import { hay, producto } from "./comunes";

const OPCIONES_QUIEN: { etiqueta: string; perfil: Perfil }[] = [
  { etiqueta: "Yo (dirección)", perfil: "directivo" },
  { etiqueta: "Un responsable", perfil: "tactico" },
  { etiqueta: "Administración", perfil: "operativo" },
];

export const otro: Sector = {
  id: "otro",
  nombre: "Otro",
  subsectores: [],
  fraseIII: "Cuéntame qué se repite en tu semana. Ahí suele estar el margen.",
  preguntas: [
    { id: "dia.proceso_repetitivo", texto: "¿Qué tarea se repite más cada semana?", tipo: "texto" },
    {
      id: "dia.veces_mes",
      texto: "¿Cuántas veces al mes?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos de 10", valor: 5 },
        { etiqueta: "10-50", valor: 30 },
        { etiqueta: "50-200", valor: 125 },
        { etiqueta: "Más de 200", valor: 300 },
      ],
    },
    {
      id: "dia.minutos_vez",
      texto: "¿Cuánto lleva cada vez?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos de 5 min", valor: 3 },
        { etiqueta: "5-15 min", valor: 10 },
        { etiqueta: "15-60 min", valor: 35 },
        { etiqueta: "Más de 1 h", valor: 90 },
      ],
    },
    { id: "dia.quien", texto: "¿Quién la hace?", tipo: "chips", opciones: OPCIONES_QUIEN },
  ],
  quickWins: [
    {
      id: "OT-QW1",
      tituloBase: 'Automatizar "[proceso_repetitivo]" (la IA ajusta el título)',
      categoria: "operaciones",
      tipo: "tiempo",
      formula: "`veces_mes × minutos_vez × 0,4`",
      esfuerzo: "a validar",
      etiquetas: [],
      palabrasClave: [],
      antes: "",
      despues: "",
      // §10: la etiqueta es el propio texto de `dia.proceso_repetitivo` (se resuelve en calculo.ts).
      etiquetaTarea: "[texto de `dia.proceso_repetitivo`]",
      // según `dia.quien`
      perfil: (e) => OPCIONES_QUIEN.find((o) => o.etiqueta === e.s("dia.quien"))?.perfil ?? null,
      elegible: (e) => (e.t("dia.proceso_repetitivo") ?? "").trim() !== "" && hay(e.n("dia.veces_mes")),
      horasBase: (e) => {
        const m = e.n("dia.minutos_vez");
        return producto(e.n("dia.veces_mes"), m == null ? m : m / 60);
      },
      pct: 0.4,
    },
  ],
  noAutomatizar: [],
  validar: [],
  previoIII: ["dia.proceso_repetitivo", "dia.veces_mes", "dia.minutos_vez"],
  avisoMapa:
    "estimación con un solo proceso: en el diagnóstico completo aparecen el resto",
  activoEnInvitaciones: true,
};
