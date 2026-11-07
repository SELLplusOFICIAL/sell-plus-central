#!/usr/bin/env python3
"""Añade numeración de páginas y metadatos a la Guía de Despliegue PDF.
Estilo idéntico al Manual del Dueño: pie de página centrado, tono verde-gris,
saltando portada (página 1) y página de cierre (última)."""
import fitz  # pymupdf

SRC = "/home/z/my-project/download/Guia-Despliegue-Central-Vercel.pdf"
TMP = "/tmp/guia-vercel-numerada.pdf"

doc = fitz.open(SRC)
n = doc.page_count
W = 720  # ancho de página en puntos del diseño (720px @ 96dpi → pt se ajusta solo)

for i in range(1, n - 1):  # saltar portada y cierre
    page = doc[i]
    rect = page.rect
    texto = f"— {i + 1} de {n} —"
    page.insert_text(
        fitz.Point(rect.width / 2 - 28, rect.height - 20),
        texto,
        fontsize=8.5,
        fontname="helv",
        color=(0.36, 0.44, 0.39),  # verde-gris
    )

doc.set_metadata({
    "title": "Tu Central para siempre — Guía de despliegue en Vercel (Sell-Plus 3.1.0)",
    "author": "Sell-Plus Central",
    "subject": "Despliegue de Sell-Plus Central en Vercel + GitHub + Neon",
    "creator": "Sell-Plus Central 3.1.0",
    "producer": "Playwright + Paged.js + PyMuPDF",
})
doc.save(TMP, garbage=3, deflate=True)
doc.close()

import os
os.replace(TMP, SRC)
print("OK páginas numeradas:", n, "| bytes:", os.path.getsize(SRC))
