@echo off
cls
echo ===================================================
echo   INSTALADOR ERP MAXICOM BEJUMA
echo ===================================================
echo.
echo [*] Instalando dependencias del entorno global...
call npm install

echo.
echo [*] Instalando dependencias del frontend...
cd frontend
call npm install

echo.
echo [*] Construyendo la aplicacion (esto puede tardar varios minutos)...
call npm run build

echo.
echo ===================================================
echo   INSTALACION COMPLETADA
echo ===================================================
echo.
echo El sistema ha sido instalado y compilado correctamente.
echo Ya puedes iniciarlo ejecutando el archivo: iniciar_erp.bat
echo.
pause
