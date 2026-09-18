/**
 * Imagen del Orkestador (decisión de Aitor, 18-sep: sustituye a la silueta plana del brandbook).
 * Origen: imagen de Higgsfield con fondo oscuro, procesada con `scripts/procesar-orkestador.py`
 * → public/orkestador/orkestador.webp (con transparencia). Si se regenera la imagen, actualizar
 * aquí el tamaño y las puntas de las batutas que imprime el script.
 */
export const ORKESTADOR_IMAGEN = {
  src: "/orkestador/orkestador.webp",
  ancho: 743,
  alto: 820,
};

/** Puntas de las batutas en píxeles de la imagen (las imprime el script). */
export const BATUTAS = {
  izquierda: { x: 296, y: 68 },
  derecha: { x: 430, y: 72 },
};

/** De la punta de la batuta derecha sale la estela "da la entrada" (spec §2). */
export const PUNTA_BATUTA = BATUTAS.derecha;
