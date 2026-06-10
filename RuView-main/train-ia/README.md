# Train-IA

Este directorio contiene los scripts y la documentación necesaria para entrenar un modelo personalizado de RuView y probarlo con el servidor en ejecución.

## Estructura
```
train-ia/
├─ README.md
├─ run_all.bat
└─ run_all.sh
```

Los scripts están diseñados para Windows (batch) y Linux/macOS (bash).  Si usas Docker Desktop en Windows, asegúrate de que el contenedor `sensing-server` esté corriendo antes de ejecutar los pasos.

## Pasos a seguir
1. **Recolectar datos** – Usa la API del servidor para iniciar una grabación:
   ```bash
   curl -X POST http://localhost:3000/api/v1/recording/start \
        -H 'Content-Type: application/json' \
        -d '{"session_name":"calib-01","label":"room_geom"}'
   ```
   Cuando hayas grabado suficiente tiempo (p.ej. 5 min), detén la grabación:
   ```bash
   curl -X POST http://localhost:3000/api/v1/recording/stop
   ```
2. **Ejecutar el script** `run_all.bat` o `run_all.sh`.  Este script realizará los siguientes pasos automáticamente:
   * Pre‑entrenamiento contrastivo con `train-ruvllm.js`.
   * Entrenamiento supervisado WiFlow con `train-wiflow-supervised.js`.
   * Entrenamiento del head de conteo con `train-count.py`.
   * Copia de los artefactos a la carpeta `data/models/` que el servidor lee al arrancar.
   * Una llamada de prueba a `/api/v1/predictions` para verificar que el modelo está activo.

> **Nota**: Si tu entorno no tiene Node.js o Python instalados, instala las versiones recomendadas (Node 20+, Python 3.10+).  Los scripts usan `node` y `python` en la ruta del sistema.

## Ejecución
```bat
# En Windows
run_all.bat
```
```bash
# En Linux/macOS
chmod +x run_all.sh
./run_all.sh
```

Si todo sale bien, verás mensajes de éxito y una respuesta JSON con las predicciones.
