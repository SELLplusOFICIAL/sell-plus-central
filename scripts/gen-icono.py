#!/usr/bin/env python3
# Genera icono.ico para el instalador de Sell-Plus (cuadrado verde redondeado con carrito estilizado "S+")
from PIL import Image, ImageDraw, ImageFont

S = 256
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Fondo redondeado verde esmeralda
d.rounded_rectangle([8, 8, S - 8, S - 8], radius=52, fill=(5, 150, 105, 255))

# Carrito estilizado simple en blanco
white = (255, 255, 255, 255)
lw = 14
# canasta
d.line([(52, 84), (86, 84), (104, 160), (176, 160)], fill=white, width=lw, joint='curve')
d.line([(104, 160), (188, 160)], fill=white, width=lw)
# mango
d.line([(88, 100), (196, 100)], fill=white, width=lw)
# ruedas
d.ellipse([104, 176, 132, 204], fill=white)
d.ellipse([156, 176, 184, 204], fill=white)
# texto S+
try:
    fuente = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 58)
except Exception:
    fuente = ImageFont.load_default()
d.text((108, 44), 'S+', font=fuente, fill=white)

tamaños = [256, 128, 64, 48, 32, 16]
img.save('/home/z/my-project/work/icono.ico', format='ICO', sizes=[(t, t) for t in tamaños])
print('icono.ico creado')
