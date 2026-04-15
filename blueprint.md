# RetailVision — Blueprint Completo

## 1. Visión del Producto

Plataforma B2B de analytics para retail que combina computer vision + IA para dar insights accionables a dueños de tiendas. El sistema cuenta personas, genera heatmaps de zonas calientes, y mide tasas de conversión.

**Modelo de negocio:** Hardware (cámara) como costo único del cliente + suscripción mensual por el software.

---

## 2. Arquitectura del Sistema

```
┌─────────────────────┐     REST API (cada 1-5 min)     ┌──────────────────────┐
│   EDGE DEVICE        │ ──────────────────────────────► │   BACKEND            │
│   (Mini PC / RPi)    │                                 │   (Supabase + Next)  │
│                      │     POST /api/ingest/counts     │                      │
│   - YOLO v8          │     POST /api/ingest/heatmap    │   - PostgreSQL       │
│   - ByteTrack        │     POST /api/ingest/snapshot   │   - Edge Functions   │
│   - OpenCV           │                                 │   - Auth (API keys)  │
│   - FastAPI local    │     ◄──────────────────────     │   - RLS multi-tenant │
│                      │     GET /api/device/config      │                      │
└─────────────────────┘                                  └──────────┬───────────┘
                                                                    │
                                                         ┌──────────▼───────────┐
                                                         │   DASHBOARD          │
                                                         │   (Next.js 14)       │
                                                         │                      │
                                                         │   - Tailwind + Shadcn│
                                                         │   - Recharts         │
                                                         │   - Supabase Client  │
                                                         │   - Polling 60s      │
                                                         └──────────────────────┘
```

---

## 3. Stack Tecnológico

### Edge Device (Python)
- **Python 3.10+**
- **ultralytics** (YOLO v8) — detección de personas
- **ByteTrack** — tracking entre frames (evitar contar doble)
- **OpenCV** — procesamiento de video + heatmap
- **FastAPI** — API local para config/status del device
- **httpx** — para pushear data al backend
- **schedule** — cron jobs para envío periódico

### Backend
- **Supabase** (PostgreSQL + Auth + RLS + Edge Functions)
- **Next.js 14 API Routes** — endpoints de ingesta y lógica de negocio
- **Vercel** — deploy del frontend + API routes

### Dashboard Frontend
- **Next.js 14** (App Router)
- **Tailwind CSS**
- **Shadcn/ui** — componentes base
- **Recharts** — gráficos (line, bar, area)
- **Zustand** — state management
- **date-fns** — manejo de fechas/rangos

---

## 4. Schema de Base de Datos (Supabase/PostgreSQL)

### Tabla: `organizations`
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'trial', -- trial, starter, pro, enterprise
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `users`
> Se usa Supabase Auth. Tabla extra para vincular user → org.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  role TEXT DEFAULT 'viewer', -- owner, admin, viewer
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `stores`
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  timezone TEXT DEFAULT 'America/Argentina/Cordoba',
  opening_time TIME DEFAULT '09:00',
  closing_time TIME DEFAULT '21:00',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `devices`
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) NOT NULL,
  api_key TEXT UNIQUE NOT NULL, -- para autenticar el device
  name TEXT DEFAULT 'Camera 1',
  status TEXT DEFAULT 'offline', -- online, offline, error
  last_seen_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}', -- resolución, fps, zonas, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `people_counts` (time-series)
```sql
CREATE TABLE people_counts (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID REFERENCES devices(id) NOT NULL,
  store_id UUID REFERENCES stores(id) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  entries INTEGER NOT NULL DEFAULT 0,    -- personas que entraron
  exits INTEGER NOT NULL DEFAULT 0,      -- personas que salieron
  current_inside INTEGER DEFAULT 0,      -- ocupación actual
  period_seconds INTEGER DEFAULT 300     -- ventana de agregación (5 min)
);

-- Índice para queries por tiempo
CREATE INDEX idx_people_counts_store_time ON people_counts (store_id, timestamp DESC);

-- Particionar por mes si escala (futuro)
```

### Tabla: `zone_heatmaps`
```sql
CREATE TABLE zone_heatmaps (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID REFERENCES devices(id) NOT NULL,
  store_id UUID REFERENCES stores(id) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  period TEXT NOT NULL, -- 'hourly', 'daily'
  heatmap_data JSONB NOT NULL, -- grilla normalizada de intensidades
  resolution TEXT DEFAULT '20x15', -- grilla de celdas
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_heatmaps_store_period ON zone_heatmaps (store_id, period, timestamp DESC);
```

### Tabla: `transactions` (para conversión)
```sql
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount DECIMAL(12,2),
  items_count INTEGER DEFAULT 1,
  source TEXT DEFAULT 'manual' -- manual, pos_api, csv_import
);

CREATE INDEX idx_transactions_store_time ON transactions (store_id, timestamp DESC);
```

### Row Level Security (RLS)
```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_heatmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: usuarios solo ven data de su organización
CREATE POLICY "Users see own org data" ON stores
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Repetir patrón para cada tabla, filtrando por organization_id via store_id
-- Para people_counts/heatmaps: JOIN a stores para chequear org
```

---

## 5. API Endpoints

### Ingesta (Device → Backend)
Autenticación por header `X-Device-Key: {api_key}`

```
POST /api/ingest/counts
Body: {
  entries: number,
  exits: number,
  current_inside: number,
  period_seconds: number,
  timestamp: ISO8601
}

POST /api/ingest/heatmap
Body: {
  period: "hourly" | "daily",
  heatmap_data: number[][],  // grilla normalizada 0-1
  resolution: "20x15",
  timestamp: ISO8601
}
```

### Dashboard (Frontend → Backend)
Autenticación por Supabase Auth (JWT)

```
GET /api/stores                          -- listar tiendas del org
GET /api/stores/:id/stats                -- resumen actual
GET /api/stores/:id/counts?from=&to=     -- serie temporal de conteo
GET /api/stores/:id/heatmap?date=&period= -- heatmap para fecha
GET /api/stores/:id/conversion?from=&to= -- tasa de conversión
GET /api/devices?store_id=               -- devices de una tienda
POST /api/transactions                   -- cargar transacción manual
```

---

## 6. Pipeline de Computer Vision (Edge)

### Flujo principal
```
Cámara (RTSP/USB)
    │
    ▼
Captura de frame (OpenCV VideoCapture)
    │
    ▼
YOLO v8 detección (clase 'person' solamente)
    │
    ├──► ByteTrack asigna IDs únicos
    │       │
    │       ├──► Línea de conteo virtual (entra/sale)
    │       │       → Incrementa entries/exits
    │       │
    │       └──► Posición del centroide
    │               → Acumula en heatmap matrix
    │
    ▼
Cada 5 min: pushear datos agregados al backend
Cada 1 hora: pushear heatmap normalizado
```

### Estructura de archivos del edge
```
edge/
├── main.py              # Entry point, orquesta todo
├── detector.py          # YOLO + ByteTrack wrapper
├── counter.py           # Lógica de línea de conteo
├── heatmap.py           # Acumulador de heatmap
├── uploader.py          # HTTP client para pushear al backend
├── config.py            # Configuración (URL backend, API key, etc.)
├── requirements.txt
└── README.md
```

---

## 7. Estructura del Proyecto Next.js

```
retailvision/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Landing / redirect
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # Sidebar + header
│   │   │   ├── page.tsx                # Overview (todas las tiendas)
│   │   │   ├── stores/
│   │   │   │   ├── page.tsx            # Lista de tiendas
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx        # Dashboard de una tienda
│   │   │   │       ├── heatmap/page.tsx
│   │   │   │       ├── conversion/page.tsx
│   │   │   │       └── settings/page.tsx
│   │   │   ├── devices/page.tsx        # Gestión de devices
│   │   │   └── settings/page.tsx       # Config de la organización
│   │   └── api/
│   │       ├── ingest/
│   │       │   ├── counts/route.ts
│   │       │   └── heatmap/route.ts
│   │       ├── stores/
│   │       │   └── [id]/
│   │       │       ├── stats/route.ts
│   │       │       ├── counts/route.ts
│   │       │       ├── heatmap/route.ts
│   │       │       └── conversion/route.ts
│   │       ├── devices/route.ts
│   │       └── transactions/route.ts
│   ├── components/
│   │   ├── ui/                         # Shadcn components
│   │   ├── dashboard/
│   │   │   ├── StoreCard.tsx
│   │   │   ├── CountChart.tsx          # Gráfico de tráfico
│   │   │   ├── HeatmapViewer.tsx       # Visualización de heatmap
│   │   │   ├── ConversionFunnel.tsx
│   │   │   ├── LiveCounter.tsx         # Ocupación actual
│   │   │   ├── DateRangePicker.tsx
│   │   │   ├── DeviceStatus.tsx
│   │   │   └── Sidebar.tsx
│   │   └── shared/
│   │       ├── Logo.tsx
│   │       └── LoadingState.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser client
│   │   │   ├── server.ts               # Server client
│   │   │   └── middleware.ts
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── stores/                         # Zustand stores
│   │   ├── useStoreStore.ts
│   │   └── useDateRange.ts
│   └── types/
│       └── index.ts                    # TypeScript types
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      # Todo el SQL de arriba
├── edge/                               # Pipeline Python (separado)
│   └── ...
├── .env.local
├── package.json
├── tailwind.config.ts
└── next.config.js
```

---

## 8. Páginas del Dashboard — Detalle

### Overview (Home)
- Cards resumen: total visitantes hoy, tasa conversión global, tienda con más tráfico
- Gráfico de barras: tráfico por tienda (hoy)
- Lista de tiendas con status del device (online/offline)

### Store Detail
- **Hero metrics**: Visitantes hoy, dentro ahora, tasa conversión
- **Gráfico principal**: Línea de tráfico por hora (entries vs exits)
- **Comparador**: Hoy vs mismo día semana pasada
- **Selector de rango**: Hoy, 7 días, 30 días, custom

### Heatmap
- Grilla visual de calor sobre plano de la tienda
- Selector de período (hora específica, día completo, semana)
- Escala de color de frío (azul) a caliente (rojo)

### Conversión
- Funnel: Visitantes → Transacciones
- Gráfico de conversión por día/semana
- Tabla de transacciones recientes
- Botón para cargar transacción manual (o importar CSV)

---

## 9. Plan de Desarrollo por Fases

### Fase 1: Fundación (3-4 días)
- [ ] Setup proyecto Next.js con Tailwind + Shadcn
- [ ] Configurar Supabase (crear proyecto, ejecutar migrations)
- [ ] Auth básico (login/register con Supabase Auth)
- [ ] Layout del dashboard (sidebar, header, routing)
- [ ] CRUD básico de stores y devices

### Fase 2: Pipeline de Visión MVP (5-7 días)
- [ ] Setup Python con YOLO v8
- [ ] Detección de personas en video/webcam
- [ ] Integrar ByteTrack para tracking
- [ ] Línea de conteo virtual (entries/exits)
- [ ] Acumulador de heatmap
- [ ] Uploader HTTP al backend
- [ ] Testar con video de YouTube de tienda

### Fase 3: Dashboard Funcional (4-5 días)
- [ ] API routes de ingesta (recibir data del device)
- [ ] API routes de consulta (stats, counts, heatmap, conversión)
- [ ] Overview page con métricas reales
- [ ] Store detail con gráfico de tráfico
- [ ] Heatmap viewer básico
- [ ] Página de conversión + carga manual de transacciones

### Fase 4: Integración End-to-End (3-4 días)
- [ ] Conectar edge device al backend real
- [ ] Polling en el dashboard (actualización cada 60s)
- [ ] Device status (online/offline, last seen)
- [ ] Manejo de errores y reconexión en el edge
- [ ] Deploy: Vercel (frontend) + VPS (edge script)

### Fase 5: Piloto (1 semana)
- [ ] Instalar en tienda real con cámara
- [ ] Ajustar línea de conteo y zonas
- [ ] Pulir UI según feedback del dueño
- [ ] Landing page para ventas
- [ ] Preparar demo grabada

---

## 10. Variables de Entorno

### Next.js (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Edge Device (.env)
```
BACKEND_URL=https://tu-app.vercel.app
DEVICE_API_KEY=rv_dev_xxxxxxxx
CAMERA_SOURCE=0                    # 0=webcam, rtsp://... para IP cam
DETECTION_CONFIDENCE=0.5
PUSH_INTERVAL_SECONDS=300
HEATMAP_INTERVAL_SECONDS=3600
```

---

## 11. Nombre del Proyecto

**RetailVision** (nombre de trabajo, cambiar si hay algo mejor para branding)

Dominio sugerido: retailvision.app / retailvision.io
