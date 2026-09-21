#!/usr/bin/env node
/**
 * Añade al motor de n8n (workflow 5MQckeZ5yXB1oDqV) los avisos de los eventos de mapa_v1.2:
 *
 *   diagnostico.prioridades_elegidas → Telegram + email a Aitor
 *   diagnostico.mapa_abierto         → Telegram a Aitor (solo llega con MAPA_APERTURA_ACTIVO=1)
 *
 * Por defecto NO cambia nada: enseña lo que haría y deja el workflow resultante en
 * n8n/copias/. Para aplicarlo (DESPUÉS de la visita del jueves 24 y con la rama mapa-v1-2 ya
 * desplegada):
 *
 *   node n8n/aplicar-eventos-mapa-v1-2.mjs --aplicar
 *
 * Antes de cambiar nada guarda una copia del workflow tal como estaba (n8n/copias/, fuera de git).
 * Se puede lanzar dos veces: si las ramas ya existen, no hace nada.
 *
 * Clave: N8N_API_KEY (variable de entorno o, si no está, secrets/orkesta-ops-credentials.txt).
 * Hasta que se aplique, n8n ignora esos eventos sin error (el switch no tiene salida para ellos).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://acgrowthmarketing.app.n8n.cloud/api/v1";
const WORKFLOW = "5MQckeZ5yXB1oDqV";
const aqui = dirname(fileURLToPath(import.meta.url));
const aplicar = process.argv.includes("--aplicar");

function clave() {
  if (process.env.N8N_API_KEY) return process.env.N8N_API_KEY;
  const ruta = join(aqui, "..", "..", "..", "secrets", "orkesta-ops-credentials.txt");
  if (existsSync(ruta)) {
    const linea = readFileSync(ruta, "utf8")
      .split(/\r?\n/)
      .find((l) => /N8N_API_KEY/i.test(l));
    if (linea) return linea.replace(/^[^=:]*[=:]\s*/, "").trim();
  }
  throw new Error("Falta N8N_API_KEY");
}

const cabeceras = { "X-N8N-API-KEY": clave(), "Content-Type": "application/json" };
const pedir = async (ruta, init = {}) => {
  const r = await fetch(`${BASE}${ruta}`, { ...init, headers: cabeceras });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${ruta} → ${r.status}: ${texto.slice(0, 300)}`);
  return JSON.parse(texto);
};

const EVENTOS = [
  { evento: "diagnostico.prioridades_elegidas", salida: "prioridades_elegidas" },
  { evento: "diagnostico.mapa_abierto", salida: "mapa_abierto" },
];
const COMPONER = "Componer aviso de mapa";
const TELEGRAM = "Telegram aviso de mapa";
const IF_EMAIL = "¿El aviso lleva email?";
const EMAIL = "Email aviso de mapa";

/** Código del nodo: reutiliza la plantilla de email (diseño claro) del aviso de visita cerrada. */
function codigoComponer(codigoVisita) {
  const corte = codigoVisita.indexOf("const d = $input.first().json;");
  if (corte === -1) throw new Error("No encuentro la plantilla de email en «Componer aviso de visita»");
  return (
    codigoVisita.slice(0, corte).replace(
      /^\/\/ visita_cerrada:.*$/m,
      "// mapa_v1.2: prioridades elegidas por el cliente y aperturas del mapa (plantilla de email de «Componer aviso de visita»).",
    ) +
    `const d = $input.first().json;
const empresa = d.empresa || '';
const admin = (d.urls || {}).admin || '';
if (d.evento === 'diagnostico.prioridades_elegidas') {
  const ps = Array.isArray(d.prioridades) ? d.prioridades : [];
  const verbo = d.cambios > 0 ? 'ha cambiado sus prioridades' : 'ha elegido sus prioridades';
  const lineas = ps.length ? ps.map((p, i) => (i + 1) + ') ' + p).join('\\n') : '(ha quitado todas)';
  return [{ json: {
    ...d,
    telegram: empresa + ' ' + verbo + ':\\n' + lineas + '\\n' + admin,
    lleva_email: true,
    asunto_interno: empresa + ' ' + verbo,
    html_interno: email(empresa + ' ' + verbo, empresa + ': ' + verbo,
      parrafo((d.contacto && d.contacto.nombre ? esc(d.contacto.nombre) + ' (' + esc(empresa) + ')' : esc(empresa)) + ' ' + verbo + ' en su mapa:')
      + lista(ps.map(esc))
      + boton('Ver el mapa en el panel', admin)),
  } }];
}
// diagnostico.mapa_abierto (solo con MAPA_APERTURA_ACTIVO=1)
const disp = { movil: 'el móvil', tableta: 'una tableta', escritorio: 'un ordenador' }[d.dispositivo] || 'un dispositivo';
const txt = d.aviso === 'primera'
  ? empresa + ' ha abierto su mapa por primera vez (desde ' + disp + ').'
  : d.aviso === 'otro_dispositivo'
    ? empresa + ' ha abierto su mapa desde otro dispositivo (' + disp + ').'
    : empresa + ' ha vuelto a abrir su mapa (' + d.aperturas + ' veces en total).';
return [{ json: { ...d, telegram: txt + '\\n' + admin, lleva_email: false } }];
`
  );
}

function regla(ev) {
  return {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
      conditions: [
        {
          id: crypto.randomUUID(),
          leftValue: "={{ $json.evento }}",
          rightValue: ev.evento,
          operator: { type: "string", operation: "equals" },
        },
      ],
      combinator: "and",
    },
    renameOutput: true,
    outputKey: ev.salida,
  };
}

const w = await pedir(`/workflows/${WORKFLOW}`);
const porNombre = (n) => w.nodes.find((x) => x.name === n);
const sw = porNombre("Según el evento");
const telegramVisita = porNombre("Telegram visita cerrada");
const emailVisita = porNombre("Email visita cerrada");
const componerVisita = porNombre("Componer aviso de visita");
if (!sw || !telegramVisita || !emailVisita || !componerVisita)
  throw new Error("El workflow ha cambiado: no encuentro los nodos de referencia");

const reglas = sw.parameters.rules.values;
const faltan = EVENTOS.filter((ev) => !reglas.some((r) => r.outputKey === ev.salida));
if (!faltan.length && porNombre(COMPONER)) {
  console.log("Ya estaba aplicado: no hay nada que hacer.");
  process.exit(0);
}

const copias = join(aqui, "copias");
mkdirSync(copias, { recursive: true });
const sello = new Date().toISOString().replace(/[:.]/g, "-");
writeFileSync(join(copias, `motor-antes-${sello}.json`), JSON.stringify(w, null, 2));

// 1. Salidas nuevas en el switch, todas hacia el mismo nodo de composición.
for (const ev of faltan) reglas.push(regla(ev));
const conexionesSwitch = (w.connections["Según el evento"] ??= { main: [] }).main;
while (conexionesSwitch.length < reglas.length) conexionesSwitch.push([]);
reglas.forEach((r, i) => {
  if (EVENTOS.some((ev) => ev.salida === r.outputKey))
    conexionesSwitch[i] = [{ node: COMPONER, type: "main", index: 0 }];
});

// 2. Nodos nuevos, debajo de los de visita cerrada.
const [x, y] = componerVisita.position;
const nuevos = [
  {
    id: crypto.randomUUID(),
    name: COMPONER,
    type: "n8n-nodes-base.code",
    typeVersion: componerVisita.typeVersion,
    position: [x, y + 420],
    parameters: { jsCode: codigoComponer(componerVisita.parameters.jsCode) },
  },
  {
    id: crypto.randomUUID(),
    name: TELEGRAM,
    type: telegramVisita.type,
    typeVersion: telegramVisita.typeVersion,
    position: [x + 240, y + 360],
    parameters: structuredClone(telegramVisita.parameters),
    credentials: structuredClone(telegramVisita.credentials),
  },
  {
    id: crypto.randomUUID(),
    name: IF_EMAIL,
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [x + 240, y + 520],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
        conditions: [
          {
            id: crypto.randomUUID(),
            leftValue: "={{ $json.lleva_email }}",
            rightValue: "",
            operator: { type: "boolean", operation: "true", singleValue: true },
          },
        ],
        combinator: "and",
      },
      options: {},
    },
  },
  {
    id: crypto.randomUUID(),
    name: EMAIL,
    type: emailVisita.type,
    typeVersion: emailVisita.typeVersion,
    position: [x + 480, y + 520],
    parameters: structuredClone(emailVisita.parameters),
    credentials: structuredClone(emailVisita.credentials),
  },
];
for (const n of nuevos) if (!porNombre(n.name)) w.nodes.push(n);
w.connections[COMPONER] = {
  main: [[
    { node: TELEGRAM, type: "main", index: 0 },
    { node: IF_EMAIL, type: "main", index: 0 },
  ]],
};
w.connections[IF_EMAIL] = { main: [[{ node: EMAIL, type: "main", index: 0 }], []] };

// La API pública solo acepta estos campos (y estos ajustes).
const AJUSTES = [
  "executionOrder", "saveManualExecutions", "callerPolicy", "errorWorkflow", "timezone",
  "saveExecutionProgress", "saveDataErrorExecution", "saveDataSuccessExecution", "executionTimeout",
];
const cuerpo = {
  name: w.name,
  nodes: w.nodes,
  connections: w.connections,
  settings: Object.fromEntries(Object.entries(w.settings ?? {}).filter(([k]) => AJUSTES.includes(k))),
};
writeFileSync(join(copias, `motor-propuesto-${sello}.json`), JSON.stringify(cuerpo, null, 2));

console.log(`Salidas nuevas en «Según el evento»: ${faltan.map((f) => f.salida).join(", ") || "(ya estaban)"}`);
console.log(`Nodos nuevos: ${nuevos.map((n) => n.name).join(" · ")}`);
console.log(`Copia del workflow actual y del propuesto en ${copias}`);
if (!aplicar) {
  console.log("\nSimulación: no se ha cambiado nada. Para aplicarlo: --aplicar");
  process.exit(0);
}
await pedir(`/workflows/${WORKFLOW}`, { method: "PUT", body: JSON.stringify(cuerpo) });
console.log("\nAplicado. El workflow sigue activo; los eventos nuevos ya tienen aviso.");
