#!/usr/bin/env node
/**
 * Genera el PDF del mapa de un cliente a partir de su versión para imprimir.
 *
 *   node scripts/mapa-pdf.mjs <url-del-mapa> [salida.pdf]
 *
 * La URL es la del mapa publicado (`https://diagnostico.orkestaia.com/m/<token>`); el script añade
 * `?imprimir=1`. Usa el Edge o el Chrome instalado en el PC (puppeteer-core no descarga
 * navegadores) y respeta el tamaño de página del CSS: proporción A4 a 1024 px de ancho, fondo a
 * sangre. Así el PDF sale maquetado como en escritorio.
 */
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const NAVEGADORES = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

const [url, salida = "mapa.pdf"] = process.argv.slice(2);
if (!url) {
  console.error("Uso: node scripts/mapa-pdf.mjs <url-del-mapa> [salida.pdf]");
  process.exit(1);
}
const ejecutable = process.env.NAVEGADOR || NAVEGADORES.find((p) => existsSync(p));
if (!ejecutable) {
  console.error("No encuentro Edge ni Chrome. Indica la ruta con la variable NAVEGADOR.");
  process.exit(1);
}

const destino = new URL(url);
destino.searchParams.set("imprimir", "1");

const navegador = await puppeteer.launch({ executablePath: ejecutable, headless: true });
try {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 1024, height: 1448 });
  await pagina.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  const r = await pagina.goto(destino.toString(), { waitUntil: "networkidle0", timeout: 60000 });
  if (!r || !r.ok()) throw new Error(`El mapa responde ${r?.status()}: ¿está publicado?`);
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.pdf({ path: salida, printBackground: true, preferCSSPageSize: true });
  console.log(`PDF guardado en ${salida}`);
} finally {
  await navegador.close();
}
