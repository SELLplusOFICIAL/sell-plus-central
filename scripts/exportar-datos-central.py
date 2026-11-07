#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exporta los datos reales de la BD de la Central (SQLite) a
prisma/datos-iniciales.json — el archivo que consume prisma/seed.mjs
durante el despliegue en Vercel (espejo PostgreSQL).

Uso:  python3 scripts/exportar-datos-central.py
Idempotente: regenera siempre el JSON completo desde la BD viva.
"""
import json
import os
import sqlite3
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BD = os.path.join(RAIZ, "db", "custom.db")
DESTINO = os.path.join(RAIZ, "prisma", "datos-iniciales.json")

TABLAS = {
    "versiones": "Version",
    "tutoriales": "Tutorial",
    "solicitudes": "Solicitud",
    "paladinReportes": "PaladinReporte",
    "actividad": "Actividad",
}


def volcar(cur, tabla):
    cols = [r[1] for r in cur.execute(f"PRAGMA table_info({tabla})")]
    filas = []
    for row in cur.execute(f"SELECT * FROM {tabla} ORDER BY id"):
        d = dict(zip(cols, row))
        # Normaliza fechas: Prisma/SQLite las guarda como texto ISO; se
        # garantiza el formato ISO-8601 con T y Z para que seed.mjs las
        # convierta a Date sin sorpresas.
        for k, v in list(d.items()):
            if v is not None and isinstance(v, str) and (
                k == "fecha" or k == "actualizadoEn" or k.endswith("At")
            ) and (" " in v or "T" in v):
                d[k] = v.replace(" ", "T")
                if d[k].endswith("Z") is False and d[k].count(":") >= 2 and "Z" not in d[k]:
                    # añade Z si falta zona (SQLite a veces guarda sin zona)
                    if "+" not in d[k].split("T")[-1]:
                        d[k] = d[k] + ".000Z"
        filas.append(d)
    return filas


def main():
    if not os.path.exists(BD):
        print(f"[exportar] ERROR: no existe la BD {BD}")
        sys.exit(1)
    con = sqlite3.connect(BD)
    cur = con.cursor()
    datos = {clave: volcar(cur, tabla) for clave, tabla in TABLAS.items()}
    con.close()

    with open(DESTINO, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)

    resumen = ", ".join(f"{k}={len(v)}" for k, v in datos.items())
    print(f"[exportar] OK → {DESTINO}")
    print(f"[exportar] {resumen}")


if __name__ == "__main__":
    main()
