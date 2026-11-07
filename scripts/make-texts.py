#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera los textos de entrega de Sell-Plus 3.0.1 (CRLF, UTF-8)."""
import os

DL = "/home/z/my-project/download"
TREE = "/home/z/my-project/work/src/Sell-Plus"

leeme = """==================================================
  SELL-PLUS 3.0.1  —  LEEME PRIMERO
  Punto de Venta con lotes, caducidad y multiusuario
==================================================

QUE HAY DE NUEVO EN LA VERSION 3.0.1
--------------------------------------------------
Se encontro y corrigio el defecto que impedia abrir
el programa: la ventana principal nunca llegaba a
mostrarse y la aplicacion se cerraba sola unos
segundos despues de iniciar (en cualquier Windows,
no dependia de tu equipo). Ademas:

  * El programa ahora escribe un registro detallado
    de todo lo que hace en:
    C:\\Sell-Plus\\resources\\app\\db\\sellplus-servidor.log
  * Si el servidor interno se detiene, el programa
    intenta recuperarse solo (3 reintentos).
  * Nueva herramienta "Diagnostico Sell-Plus" que
    genera un informe tecnico completo en el
    Escritorio con un solo clic.

REQUISITOS
--------------------------------------------------
  * Windows 10 u 11 de 64 bits (no hay version de
    32 bits: el motor de base de datos Prisma solo
    existe para 64 bits).
  * 4 GB de RAM recomendados.
  * Espacio en disco: aprox. 1 GB.
  * No requiere internet: todo funciona en local.

INSTALACION
--------------------------------------------------
  1. Ejecuta: Sell-Plus-3.0.1-Instalador-Windows-64bits.exe
     (si Windows SmartScreen avisa, pulsa "Mas
     informacion" y luego "Ejecutar de todas formas":
     el instalador no esta firmado digitalmente).
  2. Deja la carpeta predeterminada C:\\Sell-Plus.
     No lo instales dentro de "Archivos de programa".
  3. Al terminar, marca "Abrir Sell-Plus ahora".
  4. Aparece la pantalla de carga azul unos segundos
     y despues se abre la ventana del programa.

USUARIOS DE PRUEBA
--------------------------------------------------
  Dueno:   PIN 1234
  Maria:   PIN 1111

SI ALGO FALLA
--------------------------------------------------
  * Abre el icono "Diagnostico Sell-Plus" (quedo en
    el Escritorio y dentro de la carpeta del
    programa). Genera un archivo
    "Informe-Sell-Plus-FECHA.txt" en tu Escritorio
    con toda la informacion tecnica.
  * Comparte ese informe en el chat y la causa
    exacta saldra de ahi.
  * Tambien puedes revisar el registro en vivo:
    C:\\Sell-Plus\\resources\\app\\db\\sellplus-servidor.log

TUS DATOS
--------------------------------------------------
  * Tus ventas y productos se guardan en:
    C:\\Sell-Plus\\resources\\app\\db\\custom.db
  * Al DESINSTALAR, se guarda automaticamente una
    copia de tu base de datos en:
    %APPDATA%\\Sell-Plus-Respaldo-Datos
  * Si reinstalas, el instalador detecta esa copia
    y te ofrece recuperarla.

DESINSTALAR
--------------------------------------------------
  Menu Inicio > Sell-Plus > Desinstalar Sell-Plus,
  o desde Configuracion de Windows > Aplicaciones.
"""


def crlf(path, text):
    data = text.replace("\r\n", "\n").replace("\n", "\r\n").encode("utf-8")
    with open(path, "wb") as f:
        f.write(data)
    print("OK", path, len(data), "bytes")


crlf(os.path.join(DL, "LEEME-PRIMERO-Sell-Plus.txt"), leeme)

instalado = """==================================================
  SELL-PLUS 3.0.1 — YA ESTA INSTALADO EN TU PC
==================================================

QUE SE CORRIGIO EN ESTA VERSION
  El defecto que hacia que el programa abriera y se
  cerrara solo unos segundos despues. Ahora la
  ventana principal se abre y permanece abierta.

DONDE QUEDO INSTALADO
  C:\\Sell-Plus

COMO ABRIRLO
  - Doble clic en el icono "Sell-Plus" del Escritorio, o
  - Menu de Inicio > Sell-Plus > Sell-Plus.
  - La primera apertura puede tardar 15-60 segundos.
    Es normal: el programa arranca su servidor interno.

USUARIOS PARA ENTRAR (luego los puedes cambiar)
  - Dueno     PIN 1234
  - Maria     PIN 1111

DIAGNOSTICO (para saber siempre que esta pasando)
  - Icono "Diagnostico Sell-Plus" en el Escritorio y
    en el Menu de Inicio.
  - Doble clic y genera un informe tecnico completo:
    datos de tu Windows, antivirus, archivos del
    programa, estado actual, ultimas 50 lineas del
    registro y caidas recientes registradas por
    Windows.
  - El informe se guarda en el Escritorio como
    "Informe-Sell-Plus-FECHA.txt": compartelo en el
    chat si algo falla y la causa saldra a la luz.

REGISTROS QUE EL PROGRAMA ESCRIBE SOLO
  C:\\Sell-Plus\\registro-instalacion.txt
      fecha y hora de la instalacion.
  C:\\Sell-Plus\\resources\\app\\db\\sellplus-servidor.log
      cada arranque, con version, arquitectura,
      puerto usado, errores y recuperaciones. El
      programa anota aqui incluso sus propios fallos
      internos (registro sincrono a prueba de todo).

TUS DATOS (ventas, productos, usuarios)
  Se guardan en:
  C:\\Sell-Plus\\resources\\app\\db\\custom.db
  Consejo: cada semana copia ese archivo a una USB.

DESINSTALAR
  Panel de Control > Programas > "Sell-Plus 3.0.1" >
  Desinstalar. Al desinstalar se guarda
  automaticamente una copia de tus datos en:
  C:\\ProgramData\\Sell-Plus-Respaldo-Datos
  Si reinstalas, el instalador te ofrecera recuperarlos.

SOBRE LA ADVERTENCIA DE WINDOWS
  Sell-Plus no tiene firma digital de pago. La primera
  vez, Windows SmartScreen puede mostrar una advertencia:
  pulsa "Mas informacion" y luego "Ejecutar de todas
  formas".
"""
crlf(os.path.join(TREE, "LEEME-INSTALACION.txt"), instalado)
print("Textos generados.")
