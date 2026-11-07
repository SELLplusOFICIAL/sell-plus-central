"""Genera el icono oficial de Sell-Plus (.ico) — bolsa verde con 'S+'."""
from PIL import Image, ImageDraw, ImageFont

S = 512

def crear():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Fondo: cuadrado redondeado verde esmeralda con degradado simulado
    radio = 110
    # capa 1 (más clara arriba)
    d.rounded_rectangle([8, 8, S - 8, S - 8], radius=radio, fill=(5, 150, 105, 255))
    # brillo superior
    overlay = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rounded_rectangle([8, 8, S - 8, S // 2], radius=radio, fill=(16, 185, 129, 120))
    img = Image.alpha_composite(img, overlay)
    d = ImageDraw.Draw(img)

    # Asa de la bolsa
    d.arc([S * 0.33, S * 0.10, S * 0.67, S * 0.42], start=180, end=360,
          fill=(236, 253, 245, 255), width=26)

    # Cuerpo de la bolsa
    d.rounded_rectangle([S * 0.17, S * 0.30, S * 0.83, S * 0.90], radius=60,
                        fill=(6, 95, 70, 255),
                        outline=(236, 253, 245, 255), width=18)

    # Texto S+
    try:
        fuente = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 190)
    except Exception:
        fuente = ImageFont.load_default()
    texto = "S+"
    caja = d.textbbox((0, 0), texto, font=fuente)
    w = caja[2] - caja[0]
    h = caja[3] - caja[1]
    d.text(((S - w) / 2 - caja[0], (S * 0.60) - h / 2 - caja[1]), texto,
           font=fuente, fill=(255, 255, 255, 255))

    tamanos = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    img.save("/home/z/my-project/work/installer/Sell-Plus.ico",
             format="ICO", sizes=tamanos)
    print("Icono generado")

crear()
