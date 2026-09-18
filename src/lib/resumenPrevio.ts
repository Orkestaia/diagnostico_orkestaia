/**
 * Pantalla final del previo (spec §3): frases fijas que genera la app al momento, sin esperar
 * a n8n. Si luego llega el texto de la IA (callback del motor), lo sustituye.
 *
 * Plantillas propuestas a Aitor el 18-sep. Cada frase sale SOLO de las respuestas del cliente
 * (banco §1: ninguna estadística que no venga de sus respuestas). Si falta un dato, la frase
 * (o esa parte) no aparece.
 */
import { FRASES } from "@/config/sectores/comunes";
import type { Respuestas, SectorId } from "@/config/tipos";
import { temasARevisar } from "./calculo";
import { diaReunion } from "./invitacion";
import { leerEntradas } from "./preguntas";

/** "15-60 min" → "entre 15 y 60 minutos", "Más de 40" → "más de 40", "Casi nada" → "casi nada". */
export function prosa(etiqueta: string): string {
  const unidad = (u?: string) => (u === "min" ? " minutos" : u === "h" ? " horas" : "");
  let m = etiqueta.match(/^(\d+(?:,\d+)?)-(\d+(?:,\d+)?)\s*(min|h)?$/);
  if (m) return `entre ${m[1]} y ${m[2]}${unidad(m[3])}`;
  m = etiqueta.match(/^(Más|Menos) de (\d+(?:,\d+)?)\s*(min|h)?$/);
  if (m) return `${m[1].toLowerCase()} de ${m[2]}${unidad(m[3])}`;
  return etiqueta.charAt(0).toLowerCase() + etiqueta.slice(1);
}

/** Une una lista en español: "a", "a y b", "a, b y c". */
export function unir(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const ROL: Record<string, string> = {
  "Dirección o propiedad": "diriges el negocio",
  "Responsable de un área": "llevas un área",
  Administración: "llevas la administración",
  Comercial: "llevas la parte comercial",
};

const CANAL: Record<string, string> = {
  Recomendación: "recomendación",
  "Web o formulario": "la web",
  WhatsApp: "WhatsApp",
  Teléfono: "teléfono",
  Email: "email",
  "Redes sociales": "redes sociales",
  "Google / ficha de Maps": "Google",
  "Partners o distribuidores": "partners o distribuidores",
  Licitaciones: "licitaciones",
  "Ferias o networking": "ferias o networking",
};

const RESPUESTA: Record<string, string> = {
  "Menos de 1 hora": "en menos de una hora",
  "El mismo día": "el mismo día",
  "1-2 días": "en uno o dos días",
  Más: "en más de dos días",
};

const HERRAMIENTA: Record<string, string> = {
  "Excel u hojas de cálculo": "Excel",
  "Google Workspace": "Google Workspace",
  "Microsoft 365": "Microsoft 365",
  "Un CRM": "un CRM",
  "Programa de gestión o ERP": "un programa de gestión",
  "Software de mi sector": "software de vuestro sector",
  "WhatsApp Business": "WhatsApp Business",
  "Agenda o reservas online": "una agenda online",
  "Programa de facturación": "un programa de facturación",
};

function fraseEquipo(r: Respuestas, sector: SectorId): string | null {
  const e = leerEntradas(r, sector);
  const equipo = e.s("negocio.equipo");
  if (!equipo) return null;
  if (equipo === "Solo yo") return "Trabajas por tu cuenta.";
  const rol = ROL[e.s("negocio.rol") ?? ""];
  return `Sois ${prosa(equipo)} personas${rol ? ` y tú ${rol}` : ""}.`;
}

function fraseCaptacion(r: Respuestas, sector: SectorId): string | null {
  const e = leerEntradas(r, sector);
  const partes: string[] = [];
  const canales = (Array.isArray(r["captacion.canales"]) ? r["captacion.canales"] : [])
    .map((c) => CANAL[c])
    .filter(Boolean)
    .slice(0, 3);
  if (canales.length) partes.push(`Los clientes os llegan sobre todo por ${unir(canales)}.`);

  const consultas = e.s("captacion.consultas_mes");
  const respuesta = RESPUESTA[e.s("captacion.tiempo_respuesta") ?? ""];
  if (consultas && consultas !== "No lo sé") {
    partes.push(
      `Recibís ${prosa(consultas)} consultas nuevas al mes${respuesta ? ` y soléis contestar ${respuesta}` : ""}.`,
    );
  } else if (respuesta) {
    partes.push(`Soléis contestar las consultas nuevas ${respuesta}.`);
  }

  const presu = e.s("captacion.presupuestos_mes");
  if (e.s("captacion.hace_presupuestos") === "Sí" && presu) partes.push(`Hacéis ${prosa(presu)} presupuestos al mes.`);
  return partes.length ? partes.join(" ") : null;
}

function fraseSector(r: Respuestas, sector: SectorId): string | null {
  const e = leerEntradas(r, sector);
  const s = (id: string) => e.s(id);
  const dato = (id: string) => {
    const v = s(id);
    return v && v !== "No lo sé" ? prosa(v) : null;
  };
  const partes: string[] = [];

  switch (sector) {
    case "servicios_profesionales": {
      const exp = dato("dia.expedientes_mes");
      const doc = dato("dia.minutos_documentacion");
      const llam = dato("dia.llamadas_estado");
      if (exp) partes.push(`abrís ${exp} expedientes al mes`);
      if (doc) partes.push(`perseguir la documentación de cada uno lleva ${doc}`);
      if (llam) partes.push(`os preguntan «¿cómo va lo mío?» ${llam} veces a la semana`);
      break;
    }
    case "hosteleria_eventos": {
      const sol = s("dia.solicitudes_evento");
      if (sol === "Ninguna") partes.push("no recibís peticiones de eventos");
      else if (sol) partes.push(`recibís ${prosa(sol)} peticiones de eventos al mes`);
      const perd = s("dia.llamadas_perdidas");
      if (perd === "Casi ninguna") partes.push("en pleno servicio casi no se queda ninguna llamada sin coger");
      else if (perd) partes.push(`en pleno servicio se quedan ${perd.toLowerCase()} llamadas sin coger`);
      const res = s("dia.resenas");
      if (res === "Nadie") partes.push("las reseñas no las contesta nadie");
      else if (res) partes.push(`las reseñas se contestan ${res.toLowerCase()}`);
      break;
    }
    case "industria_distribucion": {
      const ped = dato("dia.pedidos_mes");
      if (ped) partes.push(`entran ${ped} pedidos al mes fuera de la tienda online`);
      const est: Record<string, string> = {
        "Con un programa": "con un programa",
        Excel: "con un Excel",
        "Pizarra o papel": "con pizarra o papel",
        Preguntando: "preguntando",
      };
      const et = est[s("dia.estado_trabajos") ?? ""];
      if (et) partes.push(`sabéis cómo va cada trabajo ${et}`);
      const fac = dato("dia.facturas_proveedor");
      if (fac) partes.push(`recibís ${fac} facturas de proveedor al mes`);
      break;
    }
    case "salud": {
      const citas = dato("dia.citas_semana");
      if (citas) partes.push(`tenéis ${citas} citas a la semana`);
      const conf = s("dia.confirmacion");
      if (conf === "No confirmamos") partes.push("no confirmáis las citas");
      else if (conf === "Ya es automático") partes.push("la confirmación de citas ya es automática");
      else if (conf) partes.push(`confirmáis las citas ${conf.toLowerCase()}`);
      break;
    }
    case "otro": {
      const tarea = e.t("dia.proceso_repetitivo");
      const veces = dato("dia.veces_mes");
      const min = dato("dia.minutos_vez");
      if (tarea) {
        const detalle = [veces ? `${veces} veces al mes` : null, min ? `${min} cada vez` : null].filter(Boolean);
        return `La tarea que más se repite es «${tarea.trim()}»${detalle.length ? `: ${unir(detalle as string[])}` : ""}.`;
      }
      break;
    }
  }
  return partes.length ? `${cap(unir(partes))}.` : null;
}

function fraseHerramientas(r: Respuestas): string | null {
  const lista = Array.isArray(r["herramientas.lista"]) ? r["herramientas.lista"] : [];
  if (lista.length === 0) return null;
  if (lista.includes("Nada en especial") && lista.length === 1) return "No usáis ningún programa en especial.";
  // Si dijo cuál (opción abierta), se usa su nombre: "Holded" en vez de "un programa de facturación".
  const hs = lista
    .map((h) => {
      const cual = r[`herramientas.lista::${h}`];
      return typeof cual === "string" && cual.trim() ? cual.trim() : HERRAMIENTA[h];
    })
    .filter(Boolean)
    .slice(0, 3);
  return hs.length ? `En el día a día usáis ${unir(hs)}.` : null;
}

function frasePrioridad(r: Respuestas): string | null {
  const t = typeof r["prioridad.tarea"] === "string" ? r["prioridad.tarea"].trim() : "";
  return t ? `Si pudieras quitarte una tarea de encima, sería: «${t}».` : null;
}

/** "Lo que he entendido": 3-5 frases (las que tengan datos), en orden fijo. */
export function loQueHeEntendido(r: Respuestas, sector: SectorId): string[] {
  return [
    fraseEquipo(r, sector),
    fraseCaptacion(r, sector),
    fraseSector(r, sector),
    fraseHerramientas(r),
    frasePrioridad(r),
  ].filter((x): x is string => !!x);
}

/** Título de la pantalla final: la frase del Orkestador del banco (§3, "Final pre_reunion"). */
export function tituloFinal(nombre: string, fechaReunion: string | null): string {
  if (fechaReunion) {
    return FRASES.finalPreReunion.replace("[nombre]", nombre).replace("[fecha]", diaReunion(fechaReunion));
  }
  // Sin fecha de reunión (propuesta a Aitor).
  return `Gracias, ${nombre}. Con esto, cuando nos veamos, vamos directos a lo importante.`;
}

/** Bienvenida del previo (banco §3, "Bienvenida pre_reunion"). Sin fecha, se omite "el [fecha]". */
export function bienvenida(nombre: string, fechaReunion: string | null): string {
  const f = FRASES.bienvenidaPreReunion.replace("[nombre]", nombre);
  return fechaReunion ? f.replace("[fecha]", diaReunion(fechaReunion)) : f.replace(" el [fecha]", "");
}

export interface ResumenFinal {
  entendido: string[];
  temas: string[];
  /** true si los textos vienen del motor (IA) y no de las plantillas. */
  delMotor: boolean;
}

/**
 * Resumen que ve el cliente: el del motor si ya llegó (informe.resumen_entendido /
 * temas_reunion), si no, el de las plantillas fijas.
 */
export function resumenFinal(
  r: Respuestas,
  sector: SectorId,
  informe: { resumen_entendido?: unknown; temas_reunion?: unknown } | null,
): ResumenFinal {
  const listaTextos = (v: unknown) =>
    Array.isArray(v) && v.every((x) => typeof x === "string") && v.length > 0 ? (v as string[]) : null;
  const ent = listaTextos(informe?.resumen_entendido);
  const tem = listaTextos(informe?.temas_reunion);
  return {
    entendido: ent ?? loQueHeEntendido(r, sector),
    temas: tem ?? temasARevisar(r, sector),
    delMotor: !!(ent || tem),
  };
}
