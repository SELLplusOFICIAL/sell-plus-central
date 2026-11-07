#!/bin/bash
# Compila el instalador de Sell-Plus con makensis (NSIS extraído sin root)
set -e
export NSISDIR=/home/z/my-project/work/nsis/root/usr/share/nsis
export PATH=/home/z/my-project/work/nsis/root/usr/bin:$PATH
export LD_LIBRARY_PATH=/home/z/my-project/work/nsis/root/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}
cd /home/z/my-project/work
makensis -V2 installer-64.nsi
ls -la /home/z/my-project/download/*.exe
sha256sum /home/z/my-project/download/Sell-Plus-3.2.0-Instalador-Windows-64bits.exe
