#!/usr/bin/env python3
"""Genera el icono de Sell-Plus Central (central.ico) con varios tamaños.

Diseño: cuadrado redondeado con degradado verde bosque (marca Sell-Plus),
borde interior claro y las iniciales "S+" en blanco, legible desde 16 px.
"""
from PIL import Image, ImageDraw, ImageFont
import os

SIZES = [16, 24, 32, 48, 64, 128, 256]
OUT = "/home/z/my-project/download/Kit-Acceso-Central/central.ico"

VERDE_OSCURO = (6, 78, 59, 255)     # esmeralda-800
VERDE_MEDIO = (5, 150, 105, 255)    # esmeralda-600
VERDE_CLARO = (167, 243, 208, 255)  # esmeralda-200
BLANCO = (255, 255, 255, 255)

BASE = 512  # dibujamos grande y reducimos


def base_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (BASE, BASE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Degradado vertical dibujado línea a línea dentro de la máscara redondeada
    grad = Image.new("RGBA", (BASE, BASE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(BASE):
        t = y / BASE
        r = int(VERDE_OSCURO[0] + (VERDE_MEDIO[0] - VERDE_OSCURO[0]) * t)
        g = int(VERDE_OSCURO[1] + (VERDE_MEDIO[1] - VERDE_OSCURO[1]) * t)
        b = int(VERDE_OSCURO[2] + (VERDE_MEDIO[2] - VERDE_OSCURO[2]) * t)
        gd.line([(0, y), (BASE, y)], fill=(r, g, b, 255))

    mask = Image.new("L", (BASE, BASE), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([8, 8, BASE - 8, BASE - 8], radius=110, fill=255)
    img.paste(grad, (0, 0), mask)

    # Borde interior sutil
    d.rounded_rectangle(
        [28, 28, BASE - 28, BASE - 28], radius=92, outline=(*VERDE_CLARO[:3], 160), width=6
    )

    # Texto "S+"
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    if not os.path.exists(font_path):
        # búsqueda alternativa
        import glob
        cand = glob.glob("/usr/share/fonts/**/*Sans*Bold*.ttf", recursive=True)
        font_path = cand[0] if cand else None
    font = ImageFont.truetype(font_path, 300) if font_path else ImageFont.load_default()
    texto = "S+"
    bbox = d.textbbox((0, 0), texto, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (BASE - w) / 2 - bbox[0]
    y = (BASE - h) / 2 - bbox[1] - 6
    d.text((x, y), texto, font=font, fill=BLANCO)
    return img


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    grande = base_icon(BASE)
    # PIL genera cada tamaño reduciendo desde la imagen de 256 px
    img256 = grande.resize((256, 256), Image.LANCZOS)
    img256.save(OUT, format="ICO", sizes=[(s, s) for s in SIZES])
    # vista previa para inspección
    prev = img256.resize((192, 192), Image.LANCZOS)
    prev.save("/tmp/ico-preview.png")
    print("OK", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
