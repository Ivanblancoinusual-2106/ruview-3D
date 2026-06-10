@echo off
setlocal

rem ------------------------------------------------------------------
rem 1 Iniciar grabación CSI
rem ------------------------------------------------------------------
curl -X POST http://localhost:3000/api/v1/recording/start `
     -H 'Content-Type: application/json' `
     -d '{"session_name":"calib-01","label":"room_geom"}'
if %ERRORLEVEL% neq 0 (
    echo ERROR: No se pudo iniciar la grabación.
    exit /b %ERRORLEVEL%
)

rem ------------------------------------------------------------------
rem 2 Esperar 5–10 min (ajusta según tu escenario)
rem ------------------------------------------------------------------
echo Esperando 8 minutos para que el servidor guarde los frames CSI...
timeout /t 480 >nul

rem ------------------------------------------------------------------
rem 3 Detener grabación
rem ------------------------------------------------------------------
curl -X POST http://localhost:3000/api/v1/recording/stop
if %ERRORLEVEL% neq 0 (
    echo ERROR: No se pudo detener la grabación.
    exit /b %ERRORLEVEL%
)

rem ------------------------------------------------------------------
rem 4 Pre‑entrenamiento contrastivo (ruvllm)
rem ------------------------------------------------------------------
node ..\scripts\train-ruvllm.js ^
    --data ..\data\recordings\*.csi.jsonl ^
    --output ..\train-ia\models\contrastive
if %ERRORLEVEL% neq 0 (
    echo ERROR: Pre‑entrenamiento falló.
    exit /b %ERRORLEVEL%
)

rem ------------------------------------------------------------------
rem 5 Copiar artefacto a la carpeta que el servidor lee (data/models/)
rem ------------------------------------------------------------------
mkdir ..\data\models\contrastive >nul 2>&1
xcopy /E /I /Y ..\train-ia\models\contrastive\* ..\data\models\contrastive\ >nul

rem ------------------------------------------------------------------
rem 6 Reiniciar contenedor (opcional, si ya estaba corriendo)
rem ------------------------------------------------------------------
echo Reiniciando el contenedor ruview...
docker restart ruview
if %ERRORLEVEL% neq 0 (
    echo WARNING: No se pudo reiniciar el contenedor. Asegúrate de que esté en ejecución.
)

rem ------------------------------------------------------------------
rem 7 Verificar predicciones
rem ------------------------------------------------------------------
curl http://localhost:3000/api/v1/predictions?node_id=1
if %ERRORLEVEL% neq 0 (
    echo ERROR: No se pudo obtener predicción.
) else (
    echo Predicción obtenida correctamente.
)

endlocal