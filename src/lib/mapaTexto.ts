/**
 * Copia del mapa publicado para Aitor (revisión con JARVIS, 21-sep): el contenido del mapa tal
 * como lo recibió el cliente, en texto, con la fecha de publicación y hasta cuándo abre el enlace.
 * Va a Drive y a la carpeta de JARVIS con el resto de archivos del cliente (`archivos.ts`), así
 * queda constancia aunque el enlace caduque o el mapa se corrija después.
 *
 * Solo lo que ve el cliente: nada del `calculo` completo ni de lo privado.
 */
import { redondearHoras } from "./calculo";
import type { Mapa } from "./mapa";

const h = (x: number) => `${String(redondearHoras(x)).replace(".", ",")} h`;
const rango = (r: { min: number; max: number }) => `${h(r.min)}–${h(r.max)}`;

export function mapaMarkdown(
  mapa: Mapa,
  info: { empresa: string; enlace: string; publicadoAt: string | null; caducaAt: string | null },
): string {
  const l: string[] = [
    `# Mapa de automatización · ${info.empresa}`,
    "",
    `> Copia del mapa publicado para el cliente. Publicado: ${info.publicadoAt?.slice(0, 10) ?? "—"} · enlace disponible hasta: ${info.caducaAt?.slice(0, 10) ?? "—"}`,
    `> Enlace: ${info.enlace}`,
    "",
    `**${mapa.frase_apertura}**`,
    "",
    mapa.resumen,
    "",
  ];
  if (mapa.hallazgos?.length) {
    l.push("## Lo que hemos visto", "");
    for (const x of mapa.hallazgos) l.push(`- **${x.titulo}** — en qué nos basamos: ${x.evidencia}`);
    l.push("");
  }
  if (mapa.lo_que_ya_funciona?.length) {
    l.push("## Lo que ya funciona bien", "", ...mapa.lo_que_ya_funciona.map((x) => `- ${x}`), "");
  }
  l.push("## Dónde se os va el tiempo", "");
  for (const f of mapa.fugas) {
    l.push(`- **${f.titulo}**: hoy ~${h(f.horas_mes_hoy)} al mes · se podrían liberar ${rango(f.ahorro_horas_mes)}`);
    for (const s of f.supuestos) l.push(`  - Supuesto: ${s}`);
  }
  l.push("", "## Hoja de ruta", "");
  for (const fase of mapa.hoja_de_ruta) {
    l.push(`### Fase ${fase.fase} · ${fase.nombre} (plazo orientativo: ${fase.plazo})`, "");
    for (const it of fase.items) {
      const plazo = it.plazo_orientativo
        ? ` · ${it.plazo_orientativo.min_semanas}–${it.plazo_orientativo.max_semanas} semanas`
        : "";
      l.push(`- **${it.titulo}** (esfuerzo: ${it.esfuerzo}${plazo})`);
      l.push(`  - Hoy: ${it.antes}`, `  - Con el sistema: ${it.despues}`);
      if (it.depende_de.length) l.push(`  - Hace falta: ${it.depende_de.join("; ")}`);
      if (it.diagrama) {
        const txt = new Map(it.diagrama.nodos.map((n) => [n.id, n.texto]));
        l.push(`  - Diagrama «${it.diagrama.titulo}»:`);
        for (const a of it.diagrama.aristas)
          l.push(`    - ${txt.get(a.de)} → ${txt.get(a.a)}${a.etiqueta ? ` (${a.etiqueta})` : ""}`);
      }
    }
    l.push("");
  }
  if (mapa.preocupaciones?.length) {
    l.push("## Lo que os preocupa", "");
    for (const x of mapa.preocupaciones) l.push(`- «${x.preocupacion}» — ${x.como_lo_abordamos}`);
    l.push("");
  }
  if (mapa.no_rentables?.length) {
    l.push("## Lo que no compensa automatizar", "");
    for (const x of mapa.no_rentables) l.push(`- **${x.que}**: ${x.motivo}`);
    l.push("");
  }
  if (mapa.no_automatizar.length)
    l.push("## Lo que no automatizaríamos todavía", "", ...mapa.no_automatizar.map((x) => `- ${x}`), "");
  if (mapa.validar.length)
    l.push("## Lo que hay que validar antes", "", ...mapa.validar.map((x) => `- ${x}`), "");
  l.push("## Siguiente paso", "", mapa.siguiente_paso.texto, "", mapa.siguiente_paso.cta_url, "");
  return l.join("\n");
}
