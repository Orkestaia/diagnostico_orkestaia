/**
 * Interruptores de funciones que están construidas pero apagadas. Se encienden en Vercel
 * (variable a "1") y redespliegue. Solo en el servidor.
 */

/**
 * Aviso de apertura del mapa (`diagnostico.mapa_abierto`, spec §7). Apagado hasta la luz verde de
 * TEMIS: guarda un identificador aleatorio en el navegador del cliente (puede requerir aviso de
 * cookies).
 */
export function aperturaMapaActiva(): boolean {
  return process.env.MAPA_APERTURA_ACTIVO === "1";
}
