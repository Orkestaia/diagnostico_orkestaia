/**
 * Consentimiento para uso agregado y anónimo de los datos del diagnóstico (Aitor y JARVIS, 22-sep).
 *
 * Construido pero APAGADO: la casilla no se enseña ni la API guarda nada hasta que
 * `CONSENTIMIENTO_AGREGADO_ACTIVO=1` en Vercel. Se enciende cuando llegue el texto revisado
 * (TEMIS): entonces se cambian `TEXTO_CONSENTIMIENTO` y `VERSION_CONSENTIMIENTO` a la vez. La
 * versión se guarda con cada respuesta, así se sabe qué texto vio cada cliente.
 */

/** BORRADOR: no se enseña a nadie mientras el interruptor esté apagado. */
export const TEXTO_CONSENTIMIENTO =
  "Acepto que Orkesta use los datos de mi diagnóstico de forma agregada y anónima, sin que se pueda identificar a mi empresa, para mejorar sus análisis. Puedo retirarlo cuando quiera.";

export const VERSION_CONSENTIMIENTO = "borrador-2026-09-22";

/** El interruptor. Solo en el servidor: la página le pasa el resultado a la pantalla. */
export function consentimientoActivo(): boolean {
  return process.env.CONSENTIMIENTO_AGREGADO_ACTIVO === "1";
}
