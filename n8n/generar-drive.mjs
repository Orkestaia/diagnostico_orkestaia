// Genera el workflow "Orkesta - Diagnóstico → Drive" (id icBM7fr68LLHJ01a) y, con "crear", lo crea
// en el n8n de Aitor por REST. Uso: node n8n/generar-drive.mjs <secretos.txt> <salida.json> [crear]
import { readFileSync, writeFileSync } from "node:fs";

const [, , secretos, salida, modo] = process.argv;
const KEY = readFileSync(secretos, "utf8").match(/N8N_API_KEY=(\S+)/)[1];
const BASE = "https://acgrowthmarketing.app.n8n.cloud/api/v1";

const CRED_DRIVE = { googleDriveOAuth2Api: { id: "vZ6HJRfkvw7OQLiF", name: "Google Drive Orkesta " } };
const CRED_APP = { httpHeaderAuth: { id: "SU6JD77rWqcyxTYI", name: "Diagnóstico · token app ↔ motor" } };
const CARPETA = "application/vnd.google-apps.folder";
const esc = (expr) => `${expr}.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'")`;

let x = 0;
const nodo = (name, type, typeVersion, parameters, extra = {}) => ({
  id: `drive-${++x}`,
  name,
  type,
  typeVersion,
  position: [x * 220, 300],
  parameters,
  ...extra,
});

const buscarDrive = (name, q) =>
  nodo(
    name,
    "n8n-nodes-base.httpRequest",
    4.2,
    {
      method: "GET",
      url: "https://www.googleapis.com/drive/v3/files",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "googleDriveOAuth2Api",
      sendQuery: true,
      specifyQuery: "keypair",
      queryParameters: {
        parameters: [
          { name: "q", value: q },
          { name: "fields", value: "files(id,name,appProperties)" },
          { name: "spaces", value: "drive" },
        ],
      },
      options: {},
    },
    { credentials: CRED_DRIVE },
  );

const crearCarpeta = (name, cuerpo) =>
  nodo(
    name,
    "n8n-nodes-base.httpRequest",
    4.2,
    {
      method: "POST",
      url: "https://www.googleapis.com/drive/v3/files",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "googleDriveOAuth2Api",
      sendBody: true,
      specifyBody: "json",
      jsonBody: cuerpo,
      options: {},
    },
    { credentials: CRED_DRIVE },
  );

const subir = (name, method, url) =>
  nodo(
    name,
    "n8n-nodes-base.httpRequest",
    4.2,
    {
      method,
      url,
      authentication: "predefinedCredentialType",
      nodeCredentialType: "googleDriveOAuth2Api",
      sendBody: true,
      contentType: "raw",
      rawContentType: "multipart/related; boundary=orkesta_limite",
      body: "={{ $json.cuerpo }}",
      options: {},
    },
    { credentials: CRED_DRIVE },
  );

const siVacio = (name, expr) =>
  nodo(name, "n8n-nodes-base.if", 2, {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "loose" },
      conditions: [
        {
          id: `c-${name}`,
          leftValue: `={{ ${expr} }}`,
          rightValue: "",
          operator: { type: "boolean", operation: "true", singleValue: true },
        },
      ],
      combinator: "and",
    },
    options: {},
  });

const codigo = (name, jsCode) => nodo(name, "n8n-nodes-base.code", 2, { mode: "runOnceForAllItems", jsCode });

const nodes = [
  nodo("Cada hora", "n8n-nodes-base.scheduleTrigger", 1.2, {
    rule: { interval: [{ field: "hours", hoursInterval: 1 }] },
  }),
  nodo(
    "Lanzar a mano",
    "n8n-nodes-base.webhook",
    2,
    { httpMethod: "POST", path: "diagnostico-drive", authentication: "headerAuth", responseMode: "onReceived", options: {} },
    { webhookId: "diagnostico-drive", credentials: CRED_APP },
  ),
  nodo(
    "Pedir archivos a la app",
    "n8n-nodes-base.httpRequest",
    4.2,
    {
      method: "GET",
      url: "https://diagnostico.orkestaia.com/api/motor/archivos",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      options: { timeout: 60000 },
    },
    { credentials: CRED_APP },
  ),
  buscarDrive(
    "Buscar carpeta raíz",
    `={{ "name = '" + ${esc("$json.carpeta_raiz")} + "' and mimeType = '${CARPETA}' and trashed = false and 'root' in parents" }}`,
  ),
  codigo("¿Hay raíz?", "const f = ($input.first().json.files || [])[0];\nreturn [{ json: { raizId: f ? f.id : null } }];"),
  siVacio("¿Falta la raíz?", "!$json.raizId"),
  crearCarpeta(
    "Crear carpeta raíz",
    `={{ JSON.stringify({ name: $('Pedir archivos a la app').first().json.carpeta_raiz, mimeType: '${CARPETA}' }) }}`,
  ),
  codigo(
    "Un elemento por cliente",
    [
      "// Llega de «¿Falta la raíz?» (ya existía: raizId) o de «Crear carpeta raíz» (recién creada: id).",
      "const e = $input.first().json;",
      "const raizId = e.raizId || e.id;",
      "const { clientes } = $('Pedir archivos a la app').first().json;",
      "return clientes.map(c => ({ json: { raizId, carpeta: c.carpeta, archivos: c.archivos } }));",
    ].join("\n"),
  ),
  buscarDrive(
    "Buscar carpeta del cliente",
    `={{ "name = '" + ${esc("$json.carpeta")} + "' and '" + $json.raizId + "' in parents and mimeType = '${CARPETA}' and trashed = false" }}`,
  ),
  codigo(
    "¿Hay carpeta?",
    [
      "return $input.all().map((it, i) => {",
      "  const base = $('Un elemento por cliente').itemMatching(i).json;",
      "  const f = (it.json.files || [])[0];",
      "  return { json: { ...base, carpetaId: f ? f.id : null } };",
      "});",
    ].join("\n"),
  ),
  siVacio("¿Falta la carpeta?", "!$json.carpetaId"),
  crearCarpeta(
    "Crear carpeta del cliente",
    `={{ JSON.stringify({ name: $json.carpeta, mimeType: '${CARPETA}', parents: [$json.raizId] }) }}`,
  ),
  codigo(
    "Un elemento por archivo",
    [
      "// Llega de «¿Falta la carpeta?» (ya existía) o de «Crear carpeta del cliente» (recién creada).",
      "const salida = [];",
      "$input.all().forEach((it, i) => {",
      "  const base = it.json.archivos ? it.json : $('¿Hay carpeta?').itemMatching(i).json;",
      "  const carpetaId = base.carpetaId || it.json.id;",
      "  for (const a of base.archivos) salida.push({ json: { carpetaId, carpeta: base.carpeta, nombre: a.nombre, contenido: a.contenido, hash: a.hash } });",
      "});",
      "return salida;",
    ].join("\n"),
  ),
  buscarDrive(
    "Buscar archivo",
    `={{ "name = '" + ${esc("$json.nombre")} + "' and '" + $json.carpetaId + "' in parents and trashed = false" }}`,
  ),
  codigo(
    "Decidir qué subir",
    [
      "// Solo se sube lo que ha cambiado: la huella viaja en appProperties.hash del archivo en Drive.",
      "const LIM = 'orkesta_limite';",
      "const salida = [];",
      "$input.all().forEach((it, i) => {",
      "  const a = $('Un elemento por archivo').itemMatching(i).json;",
      "  const f = (it.json.files || [])[0];",
      "  if (f && f.appProperties && f.appProperties.hash === a.hash) return;",
      "  const meta = { name: a.nombre, mimeType: 'text/markdown', appProperties: { hash: a.hash } };",
      "  if (!f) meta.parents = [a.carpetaId];",
      "  const cuerpo = '--' + LIM + '\\r\\nContent-Type: application/json; charset=UTF-8\\r\\n\\r\\n' + JSON.stringify(meta)",
      "    + '\\r\\n--' + LIM + '\\r\\nContent-Type: text/markdown; charset=UTF-8\\r\\n\\r\\n' + a.contenido + '\\r\\n--' + LIM + '--';",
      "  salida.push({ json: { nuevo: !f, id: f ? f.id : null, carpeta: a.carpeta, nombre: a.nombre, cuerpo } });",
      "});",
      "return salida;",
    ].join("\n"),
  ),
  siVacio("¿Archivo nuevo?", "$json.nuevo"),
  subir("Subir archivo nuevo", "POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"),
  subir(
    "Actualizar archivo",
    "PATCH",
    "={{ 'https://www.googleapis.com/upload/drive/v3/files/' + $json.id + '?uploadType=multipart' }}",
  ),
];

const a = (desde, hacia, salidaIf = 0) => ({ desde, hacia, salidaIf });
const aristas = [
  a("Cada hora", "Pedir archivos a la app"),
  a("Lanzar a mano", "Pedir archivos a la app"),
  a("Pedir archivos a la app", "Buscar carpeta raíz"),
  a("Buscar carpeta raíz", "¿Hay raíz?"),
  a("¿Hay raíz?", "¿Falta la raíz?"),
  a("¿Falta la raíz?", "Crear carpeta raíz", 0),
  a("¿Falta la raíz?", "Un elemento por cliente", 1),
  a("Crear carpeta raíz", "Un elemento por cliente"),
  a("Un elemento por cliente", "Buscar carpeta del cliente"),
  a("Buscar carpeta del cliente", "¿Hay carpeta?"),
  a("¿Hay carpeta?", "¿Falta la carpeta?"),
  a("¿Falta la carpeta?", "Crear carpeta del cliente", 0),
  a("¿Falta la carpeta?", "Un elemento por archivo", 1),
  a("Crear carpeta del cliente", "Un elemento por archivo"),
  a("Un elemento por archivo", "Buscar archivo"),
  a("Buscar archivo", "Decidir qué subir"),
  a("Decidir qué subir", "¿Archivo nuevo?"),
  a("¿Archivo nuevo?", "Subir archivo nuevo", 0),
  a("¿Archivo nuevo?", "Actualizar archivo", 1),
];
const connections = {};
for (const { desde, hacia, salidaIf } of aristas) {
  connections[desde] ??= { main: [] };
  const m = connections[desde].main;
  while (m.length <= salidaIf) m.push([]);
  m[salidaIf].push({ node: hacia, type: "main", index: 0 });
}

const workflow = {
  name: "Orkesta - Diagnóstico → Drive",
  nodes,
  connections,
  settings: { executionOrder: "v1", timezone: "Europe/Madrid", errorWorkflow: "dYdCdIkmNtUoKCuj" },
};
writeFileSync(salida, JSON.stringify(workflow, null, 2));

if (modo === "crear") {
  const h = { "X-N8N-API-KEY": KEY, "Content-Type": "application/json" };
  const r = await fetch(`${BASE}/workflows`, { method: "POST", headers: h, body: JSON.stringify(workflow) });
  const j = await r.json();
  console.log("crear", r.status, j.id ?? j.message);
  if (j.id) {
    const act = await fetch(`${BASE}/workflows/${j.id}/activate`, { method: "POST", headers: h });
    console.log("activar", act.status, (await act.json()).active ?? "");
  }
} else {
  console.log("generado", nodes.length, "nodos →", salida);
}
