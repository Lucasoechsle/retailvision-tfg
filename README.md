# RetailVision

Plataforma de analítica para retail basada en **visión por computadora** y **edge computing**.

Transforma las cámaras de seguridad ya existentes en un local comercial en sensores inteligentes: detecta y sigue a las personas en tiempo real sobre un dispositivo de borde, envía únicamente métricas agregadas a la nube (nunca imágenes) y las expone en un dashboard web multi-tenant con indicadores, alertas e insights accionables.

> **Trabajo Final de Grado** — Ingeniería en Software, Universidad Siglo 21. Autor: Lucas Oechsle (SOF01988).

---

## Demo

La plataforma se encuentra desplegada y accesible públicamente:

- **Aplicación en producción:** https://retail-vision-mocha.vercel.app
- **Credenciales de prueba** (misma contraseña para todos: `RetailVision2026!`). Cada usuario tiene uno de los cuatro perfiles del sistema, y el menú, el panel de inicio y los módulos disponibles cambian según el perfil:

| Perfil | Usuario | Qué ve |
|---|---|---|
| Administrador | `admin@retailvision.com` | Todo: gestión de tiendas, dispositivos, zonas, reglas de alertas y usuarios |
| Gerente de tienda | `tienda@retailvision.com` | Ocupación, tráfico, colas, alertas y predicciones de su tienda (Sucursal Centro) |
| Gerente de categoría | `categoria@retailvision.com` | Mapa de calor, zonas, recorridos, promociones y conversión |
| Director comercial | `director@retailvision.com` | Vistas consolidadas, benchmark e insights |

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
- **Perfiles de usuario**: administrador, gerente de tienda (limitado a las tiendas a su cargo), gerente de categoría y director comercial, con permisos centralizados en `lib/auth/roles.ts` y aplicados en el menú, las páginas y la API
- **Baja lógica de tiendas**: al dar de baja una tienda se conserva todo su histórico y puede reactivarse

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

La base de datos se crea ejecutando en el SQL Editor de Supabase, en este orden:

1. `supabase_schema_completo.sql` — 22 tablas, 18 funciones y las políticas de RLS.
2. `migration_roles_baja_logica.sql` — perfiles de usuario, tiendas a cargo y baja lógica de tiendas.
3. `migration_analisis_zonas.sql` — función de análisis de tráfico, dwell time y engagement por zona.
4. `migration_dispositivos_offline.sql` — tarea programada (pg_cron) que detecta dispositivos sin conexión y genera la alerta.

Para crear los usuarios de demostración de cada perfil: `node scripts/seed-demo-roles.mjs`.

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
