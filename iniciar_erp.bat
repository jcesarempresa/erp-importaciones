@echo off
cls
echo  [1;36m=================================================== [0m
echo  [1;32m  ERP MAXICOM BEJUMA - SISTEMA DE IMPORTACIONES      [0m
echo  [1;36m=================================================== [0m
echo.
echo  [1;32m[*] Conectando directamente a Firebase Firestore...  [0m
echo  [1;32m[*] Iniciando interfaz en http://localhost:3700       [0m
echo.
cd frontend
npm run dev -- -p 3700
