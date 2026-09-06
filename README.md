# RetailVision

Plataforma de analítica para retail basada en **visión por computadora** y **edge computing**.

Transforma las cámaras de seguridad ya existentes en un local comercial en sensores inteligentes: detecta y sigue a las personas en tiempo real sobre un dispositivo de borde, envía únicamente métricas agregadas a la nube (nunca imágenes) y las expone en un dashboard web multi-tenant con indicadores, alertas e insights accionables.

> **Trabajo Final de Grado** — Ingeniería en Software, Universidad Siglo 21. Autor: Lucas Oechsle (SOF01988).

---

## Demo

La plataforma se encuentra desplegada y accesible públicamente:

- **Aplicación en producción:** https://retail-vision-mocha.vercel.app
- **Credenciales de prueba:** `admin@retailvision.com` / `RetailVision2026!`

---

## Arquitectura

Tres capas distribuidas geográficamente:

```
┌─────────────────────────┐     métricas      ┌──────────────────────┐     ┌─────────────────┐
│   EDGE (en el local)    │   agregadas       │   BACKEND (nube)     │     │   DASHBOARD     │
│  Python 3.10            │  ───────────────► │  Next.js 14 API      │ ──► │  React 18       │
│  YOLOv8 + ByteTrack     │   HTTPS + device  │  Supabase/PostgreSQL │     │  Recharts       │
│  OpenCV · buffer SQLite │   key             │  RLS multi-tenant    │     │  Tailwind       │
└─────────────────────────┘                   └──────────────────────┘     └─────────────────┘
     El video NUNCA sale del local
```

El procesamiento de video ocurre íntegramente en el borde. Solo viajan números (conteos, tiempos, coordenadas de zona), lo que preserva la privacidad de los clientes, reduce el ancho de banda y mantiene baja latencia. Ante una caída de conexión, el edge almacena las métricas en un buffer local SQLite y las reenvía al reconectar.

## Stack

| Capa | Tecnologías |
|---|---|
| **Edge / Visión** | Python 3.10, Ultralytics YOLOv8, ByteTrack, OpenCV, httpx, websockets |
| **Backend** | Next.js 14 (App Router, API Routes), Supabase (PostgreSQL, Auth, Row Level Security) |
| **Frontend** | React 18, Tailwind CSS, Shadcn/ui, Recharts, Zustand, TanStack Query |
| **Infraestructura** | Vercel (serverless), Supabase gestionado |

## Funcionalidades implementadas

- **Detección y seguimiento** de personas en tiempo real (YOLOv8 + ByteTrack sobre el edge)
- **Conteo** de entradas, salidas y ocupación mediante líneas virtuales configurables
- **Mapas de calor** de tráfico segmentados por franja horaria y día
- **Análisis por zonas** con cálculo de *dwell time* y clasificación de engagement (pass / browse / engaged)
- **Customer journey**: reconstrucción de recorridos y patrones de circulación entre zonas
- **Monitoreo de colas** en cajas con estimación de tiempo de espera y alertas anticipadas
- **Campañas promocionales**: comparación de tráfico y engagement en períodos previo, activo y posterior
- **Tasa de conversión** a partir del cruce de visitantes con transacciones del POS
- **Alertas configurables** por umbral e **insights prescriptivos** generados automáticamente
- **Multi-tenant** con aislamiento de datos por organización vía Row Level Security

## Estructura del proyecto

```
app/
├── (auth)/           # login, registro, recuperación de contraseña
├── (dashboard)/      # dashboard, sucursales, zonas, heatmap, journeys, colas, promos, conversión
└── api/
    ├── ingest/       # endpoints de ingesta (autenticados por device key)
    └── analytics/    # endpoints de consulta (autenticados por JWT)

edge/                 # pipeline de visión por computadora
├── main.py           # loop principal
├── detector.py       # YOLOv8 + ByteTrack
├── counter.py        # conteo por línea virtual
├── zone_tracker.py   # zonas, dwell time, engagement
├── journey_tracker.py# recorridos entre zonas
├── queue_detector.py # colas en cajas
├── heatmap.py        # acumulación de mapa de calor
├── local_buffer.py   # buffer SQLite ante pérdida de conexión
└── uploader.py       # envío de métricas al backend

components/           # UI (Shadcn/ui + vistas del dashboard)
lib/supabase/         # clientes de Supabase (browser, server, admin)
```

## Puesta en marcha

### 1. Aplicación web (backend + dashboard)

```bash
npm install
cp .env.example .env.local   # completar con las credenciales de Supabase
npm run dev
```

Variables requeridas en `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

La base de datos se crea ejecutando `supabase_schema_completo.sql` en el SQL Editor de Supabase (22 tablas, 18 funciones y las políticas de RLS).

### 2. Pipeline de visión (edge)

```bash
cd edge
python -m venv venv
venv/Scripts/activate          # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env           # configurar BACKEND_URL, DEVICE_API_KEY y CAMERA_SOURCE
python main.py
```

`CAMERA_SOURCE` acepta el índice de una webcam (`0`), la ruta a un archivo de video o una URL RTSP de una cámara IP.

## Estado del proyecto

Prototipo **completo y operativo**, desplegado en producción. Cubre los cinco objetivos específicos del TFG: pipeline de visión sobre edge, conteo de personas, mapas de calor, análisis por zonas y dashboard multi-tenant.
