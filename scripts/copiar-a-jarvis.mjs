#!/usr/bin/env node
/**
 * Copia el informe y la transcripción de cada diagnóstico a la carpeta de JARVIS del PC de Aitor:
 *
 *   ORKESTA - JARVIS/03_PIPELINE/01_leads/<cliente>/
 *
 * Pide los archivos a la app (`/api/motor/archivos`, token del motor) y solo escribe los que han
 * cambiado. Nunca borra nada. Se puede lanzar a mano o desde el Programador de tareas de Windows.
 *
 *   node scripts/copiar-a-jarvis.mjs
 *
 * Configuración (variables de entorno o, si no están, .env.local del proyecto):
 *   DIAGNOSTICO_MOTOR_TOKEN   el mismo token que usa n8n
 *   DIAGNOSTICO_URL           por defecto https://diagnostico.orkestaia.com
 *   JARVIS_LEADS_DIR          por defecto la carpeta 01_leads de JARVIS en el Escritorio
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

function leerEnvLocal() {
  const ruta = join(raiz, ".env.local");
  if (!existsSync(ruta)) return {};
  return Object.fromEntries(
    readFileSync(ruta, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
      }),
  );
}

const env = { ...leerEnvLocal(), ...process.env };
const TOKEN = env.DIAGNOSTICO_MOTOR_TOKEN;
const URL_APP = (env.DIAGNOSTICO_URL || "https://diagnostico.orkestaia.com").replace(/\/$/, "");
const DESTINO =
  env.JARVIS_LEADS_DIR ||
  join(homedir(), "OneDrive", "Escritorio", "ORKESTA - JARVIS", "03_PIPELINE", "01_leads");

// La misma huella que la app (src/lib/archivos.ts): sin la línea de la fecha de generación.
const huella = (s) =>
  createHash("sha256")
    .update(s.replace(/^> Generado por la app[^\n]*\n/m, ""))
    .digest("hex")
    .slice(0, 16);

async function main() {
  if (!TOKEN) throw new Error("Falta DIAGNOSTICO_MOTOR_TOKEN (variable de entorno o .env.local).");
  if (!existsSync(DESTINO)) throw new Error(`No existe la carpeta de destino: ${DESTINO}`);

  const r = await fetch(`${URL_APP}/api/motor/archivos`, { headers: { "x-orkesta-token": TOKEN } });
  if (!r.ok) throw new Error(`La app responde ${r.status}`);
  const { clientes } = await r.json();

  let escritos = 0;
  let iguales = 0;
  for (const c of clientes) {
    const carpeta = join(DESTINO, c.carpeta);
    mkdirSync(carpeta, { recursive: true });
    for (const a of c.archivos) {
      const ruta = join(carpeta, a.nombre);
      if (existsSync(ruta) && huella(readFileSync(ruta, "utf8")) === a.hash) {
        iguales++;
        continue;
      }
      writeFileSync(ruta, a.contenido, "utf8");
      escritos++;
      console.log(`  ${c.carpeta}/${a.nombre}`);
    }
  }
  console.log(
    `${new Date().toISOString()} · ${clientes.length} clientes · ${escritos} escritos · ${iguales} sin cambios · ${DESTINO}`,
  );
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
