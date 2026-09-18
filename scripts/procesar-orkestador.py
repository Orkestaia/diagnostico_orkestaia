"""
Prepara el Orkestador de la app a partir de la imagen de Higgsfield (fondo oscuro, sin texto).

    python scripts/procesar-orkestador.py <imagen.png>

Genera public/orkestador/orkestador.webp (con transparencia) y escribe en consola la posición
de las puntas de las batutas en coordenadas de la imagen final, para `orkestador-path.ts`.

Quitar el fondo: la figura es luminosa sobre casi negro, así que se usa "luminosidad a
transparencia": se resta el fondo y el alfa sale del canal más brillante; el color se
des-premultiplica. Compuesta sobre negro, la imagen queda igual que la original.
"""
import sys
from PIL import Image, ImageFilter
import numpy as np

LADO = 820  # px del lado mayor: suficiente para 80 vh en escritorio

src = Image.open(sys.argv[1]).convert("RGB")
a = np.asarray(src).astype(np.float32)

# Fondo: estimado con una versión muy desenfocada de las zonas oscuras (viñeta y resplandor del
# suelo incluidos), limitado para no comerse la figura.
oscuro = np.minimum(a, 40)
fondo = np.asarray(Image.fromarray(oscuro.astype(np.uint8)).filter(ImageFilter.GaussianBlur(60))).astype(np.float32)
fondo = np.minimum(fondo, np.array([30, 34, 60], dtype=np.float32))

c = np.clip(a - fondo, 0, 255)
alfa = c.max(axis=2) / 255.0
alfa = np.clip((alfa - 0.02) / 0.98, 0, 1) ** 0.85  # quita el velo del fondo y da cuerpo al metal
col = np.where(alfa[..., None] > 0.001, np.clip(c / np.maximum(alfa[..., None], 1e-3), 0, 255), 0)

rgba = np.dstack([col, alfa * 255]).astype(np.uint8)
im = Image.fromarray(rgba, "RGBA")

# Recorte al contenido con un margen y cuadrado
caja = im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
x0, y0, x1, y1 = caja
m = 40
x0, y0, x1, y1 = max(0, x0 - m), max(0, y0 - m), min(im.width, x1 + m), min(im.height, y1 + m)
im = im.crop((x0, y0, x1, y1))
ancho, alto = im.size
escala = LADO / max(ancho, alto)
im = im.resize((round(ancho * escala), round(alto * escala)), Image.LANCZOS)
im.save("public/orkestador/orkestador.webp", "WEBP", quality=80, method=6)

# Puntas de las batutas: el píxel cian más brillante y más alto a cada lado del tercio superior
arr = np.asarray(im).astype(np.int32)
h, w = arr.shape[:2]
sup = arr[: h // 3]
brillo = sup[..., 2] + sup[..., 1] - sup[..., 0]  # cian
for lado, xs in (("izquierda", range(0, w // 2)), ("derecha", range(w // 2, w))):
    mejor = None
    for y in range(sup.shape[0]):
        fila = [x for x in xs if sup[y, x, 3] > 160 and brillo[y, x] > 300]
        if fila:
            mejor = (fila[len(fila) // 2], y)
            break
    print(lado, mejor)
print("tamaño", im.size)
