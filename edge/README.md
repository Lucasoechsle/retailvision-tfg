# RetailVision - Edge Computer Vision Pipeline

Pipeline de visión por computadora para conteo de personas y generación de heatmaps usando YOLO v8 y ByteTrack.

## Requisitos

- Python 3.10+
- Webcam o cámara USB
- GPU CUDA (opcional, para mejor rendimiento)

## Instalación

1. Crear entorno virtual:
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Configurar variables de entorno:
Editar `.env` con tu configuración:
```
BACKEND_URL=http://localhost:3001
DEVICE_API_KEY=test_device_key_123
CAMERA_SOURCE=0
```

## Uso

Ejecutar el pipeline:
```bash
python main.py
```

Esto abrirá una ventana mostrando:
- Detecciones de personas con bounding boxes
- Track IDs de cada persona
- Línea de conteo amarilla horizontal
- Contador de entradas/salidas/personas dentro

Presionar `q` para salir.

## Componentes

### detector.py
- Usa YOLO v8 para detectar personas
- Integra ByteTrack para tracking persistente
- Retorna detecciones con IDs de tracking

### counter.py
- Implementa línea virtual de conteo
- Detecta cruces de arriba↓abajo (entrada) y abajo↑arriba (salida)
- Mantiene contador de personas dentro

### heatmap.py
- Acumula posiciones de centroides en grilla 20x15
- Normaliza valores 0-1
- Genera JSON para enviar al backend

### uploader.py
- Sube conteos cada 5 minutos a `/api/ingest/counts`
- Sube heatmap cada 1 hora a `/api/ingest/heatmap`
- Autenticación con header `X-Device-Key`

### main.py
- Orquesta todo el pipeline
- Loop principal de procesamiento de video
- Visualización en tiempo real

## Configuración

Ver `config.py` para ajustar:
- Intervalos de subida de datos
- Resolución del heatmap
- Threshold de confianza de YOLO
- Tamaño de display

## Notas

- YOLO descargará automáticamente el modelo `yolov8n.pt` en la primera ejecución
- Para mejor rendimiento en producción, usar GPU CUDA
- El sistema automáticamente actualiza el status del device a "online" en el backend
