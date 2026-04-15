# RetailVision — Documento Maestro de Tesis

## Plataforma de Retail Intelligence con Computer Vision para Grandes Superficies

---

## 1. Resumen Ejecutivo

RetailVision es una plataforma de inteligencia para retail que utiliza **visión por computadora** y **edge computing** para transformar las cámaras de seguridad existentes en sensores de comportamiento del consumidor. El sistema proporciona a grandes superficies (supermercados, hipermercados, tiendas departamentales) datos equivalentes a los que el e-commerce obtiene digitalmente: quién entra, qué recorre, dónde se detiene, qué toca, qué compra y qué abandona.

**Problema:** Las grandes superficies toman decisiones de layout, promociones, dotación de personal y reposición basándose en intuición o datos parciales (solo POS). Carecen de visibilidad sobre el comportamiento del cliente dentro de la tienda.

**Solución:** Sistema multi-cámara con procesamiento en el borde (edge computing) que detecta y trackea personas en tiempo real, generando métricas accionables para la toma de decisiones operativas y estratégicas.

**Propuesta de valor:**
- Darle al retail físico el mismo nivel de analytics que el e-commerce
- Procesamiento local (privacidad: no se envía video al cloud)
- Multi-tenant: una plataforma, múltiples sucursales
- Insights prescriptivos, no solo descriptivos

---

## 2. Objetivos

### 2.1 Objetivo General

Diseñar, desarrollar e implementar una plataforma de retail intelligence basada en visión por computadora que permita a grandes superficies comprender el comportamiento del consumidor dentro de la tienda y tomar decisiones basadas en datos para incrementar ventas y eficiencia operativa.

### 2.2 Objetivos Específicos

1. **Conteo y flujo de personas:** Medir entradas, salidas y ocupación en tiempo real con precisión superior al 90%.
2. **Mapeo de recorridos (Customer Journey):** Reconstruir el trayecto completo de cada cliente desde la entrada hasta la salida, identificando patrones de navegación dominantes.
3. **Análisis por zonas y góndolas:** Segmentar la tienda en zonas lógicas y medir tráfico, dwell time y engagement en cada una.
4. **Efectividad promocional:** Cuantificar el impacto de promociones, islas y exhibiciones midiendo antes/durante/después.
5. **Detección de interacción con producto:** Identificar eventos de pickup y putback para calcular tasas de conversión a nivel de góndola.
6. **Gestión de colas:** Detectar y medir filas en cajas, estimar tiempos de espera y generar alertas de apertura de cajas.
7. **Monitoreo de estantes:** Detectar vacíos en góndolas para alertar reposición en tiempo real.
8. **Predicción de demanda:** Generar predicciones de tráfico por hora, día y zona para optimizar la operación.
9. **Benchmarking multi-sucursal:** Comparar métricas entre sucursales para identificar best practices y oportunidades de mejora.
10. **Dashboard prescriptivo:** Presentar no solo datos sino recomendaciones accionables para gerentes de tienda, categoría y dirección comercial.

---

## 3. Alcance del Sistema

### 3.1 Dentro del alcance (MVP+)

| Módulo | Descripción | Prioridad |
|--------|-------------|-----------|
| Conteo de personas | Entradas/salidas con línea virtual | P0 (hecho) |
| Heatmaps de tráfico | Grilla de calor por densidad de tránsito | P0 (hecho) |
| Zonas y dwell time | Polígonos configurables con permanencia | P0 (hecho) |
| Tasa de conversión | Visitantes vs transacciones POS | P0 (hecho) |
| Customer Journey | Recorrido completo por cliente entre zonas | P1 |
| Efectividad de promos | Comparación antes/durante/después en zona promo | P1 |
| Queue Analytics | Detección de colas en cajas, tiempo de espera | P1 |
| Detección de interacción | Pickup/putback en góndola | P2 |
| Shelf Monitoring | Detección de huecos en estantes | P2 |
| Análisis demográfico | Estimación anónima de rango etario y género | P2 |
| Staff Analytics | Correlación presencia personal vs ventas | P3 |
| Correlación externa | Clima, feriados, día de cobro vs tráfico | P1 |
| Predicciones avanzadas | ML sobre series temporales | P1 |
| Benchmarking multi-sucursal | Comparativa entre locales | P1 |
| Alertas inteligentes | Reglas configurables con notificación | P1 |

### 3.2 Fuera del alcance (futuro)

- Reconocimiento facial (implicaciones legales)
- Integración directa con sistemas ERP (SAP, Oracle)
- App mobile nativa (se usa responsive web)
- Procesamiento de audio (análisis de ambiente sonoro)

---

## 4. Arquitectura del Sistema

### 4.1 Diagrama General

```
┌──────────────────────────────────────────────────────────────────┐
│                        GRAN SUPERFICIE                           │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Cámara 1 │  │ Cámara 2 │  │ Cámara 3 │  │ Cámara N │        │
│  │ Entrada  │  │ Pasillo A│  │ Cajas    │  │ Góndola X│        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │              │              │              │              │
│  ┌────▼──────────────▼──────────────▼──────────────▼─────┐      │
│  │              EDGE DEVICE (Mini PC / GPU Box)           │      │
│  │                                                        │      │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐             │      │
│  │  │ YOLOv8  │  │ByteTrack │  │ Módulos  │             │      │
│  │  │Detección│─►│ Tracking │─►│Analytics │             │      │
│  │  └─────────┘  └──────────┘  └──────────┘             │      │
│  │                                                        │      │
│  │  Módulos Analytics:                                    │      │
│  │  • Conteo (línea virtual)                             │      │
│  │  • Heatmap (acumulador)                               │      │
│  │  • Zone Tracker (ray casting)                         │      │
│  │  • Journey Tracker (secuencia de zonas)               │      │
│  │  • Queue Detector (clustering en zona caja)           │      │
│  │  • Interaction Detector (pose + proximity)            │      │
│  │  • Shelf Monitor (empty space detection)              │      │
│  │                                                        │      │
│  │  ┌──────────┐  ┌──────────┐                           │      │
│  │  │  Buffer  │  │  Frame   │                           │      │
│  │  │  SQLite  │  │  Server  │                           │      │
│  │  └──────────┘  │   (WS)   │                           │      │
│  │                 └──────────┘                           │      │
│  └────────────────────────┬──────────────────────────────┘      │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │ REST API (cada 1-5 min)
                            │ HTTPS
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                     BACKEND (Cloud)                               │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │   Next.js 14    │  │    Supabase     │  │  APIs Externas   │ │
│  │   API Routes    │  │   PostgreSQL    │  │                  │ │
│  │                 │  │   + Auth        │  │  • Clima (API)   │ │
│  │  • Ingesta      │  │   + RLS         │  │  • Feriados      │ │
│  │  • Analytics    │  │   + Realtime    │  │  • POS System    │ │
│  │  • Predictions  │  │                 │  │                  │ │
│  │  • Insights     │  └────────┬────────┘  └──────────────────┘ │
│  │  • Alerts       │           │                                 │
│  └────────┬────────┘           │                                 │
│           │                    │                                  │
│  ┌────────▼────────────────────▼────────────────────────────────┐│
│  │              MOTOR DE ANALYTICS & ML                         ││
│  │                                                              ││
│  │  • Insights Engine (comparación semanal)                     ││
│  │  • Prediction Engine (weighted moving avg + exp. smoothing)  ││
│  │  • Journey Analyzer (patrones de recorrido, Sankey)          ││
│  │  • Promo Effectiveness Calculator                            ││
│  │  • Queue Time Estimator                                      ││
│  │  • Correlation Engine (clima, feriados, cobros)              ││
│  │  • Anomaly Detector                                          ││
│  │  • Benchmarking Engine (multi-sucursal)                      ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────┬────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│                     DASHBOARD (Web App)                           │
│                                                                   │
│  Roles y Vistas:                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │  Gerente de  │  │  Gerente de  │  │    Director      │       │
│  │   Tienda     │  │  Categoría   │  │   Comercial      │       │
│  │              │  │              │  │                   │       │
│  │ • Ocupación  │  │ • Efectividad│  │ • Benchmarking   │       │
│  │ • Colas      │  │   de promos  │  │ • KPIs globales  │       │
│  │ • Personal   │  │ • Dwell time │  │ • Predicciones   │       │
│  │ • Alertas    │  │ • Interacción│  │ • ROI por m²     │       │
│  │ • Reposición │  │ • Journey    │  │ • Tendencias     │       │
│  └──────────────┘  └──────────────┘  └──────────────────┘       │
└───────────────────────────────────────────────────────────────────┘
```

### 4.2 Principios de Arquitectura

1. **Edge-first processing:** Todo el procesamiento de video ocurre en el dispositivo local. Al cloud solo se envían métricas agregadas (números, no video). Esto garantiza privacidad y reduce ancho de banda.

2. **Multi-tenant by design:** Cada organización (cadena de retail) tiene sus datos completamente aislados mediante Row Level Security a nivel de base de datos.

3. **Offline-resilient:** Si el edge pierde conexión, buferea los datos localmente en SQLite y los reenvía cuando reconecta. No se pierde data.

4. **Hot-configurable:** Las zonas, líneas de conteo y parámetros se pueden modificar remotamente desde el dashboard sin reiniciar el edge device.

5. **Horizontally scalable:** Cada tienda tiene su propio edge device. Agregar una tienda nueva = conectar un nuevo device. El backend escala automáticamente (Vercel + Supabase).

---

## 5. Módulos del Sistema — Detalle

### 5.1 Módulo: Conteo de Personas (IMPLEMENTADO)

**Objetivo:** Contar entradas y salidas de personas en tiempo real.

**Algoritmo:**
- Se define una línea virtual en coordenadas normalizadas (0-1) con dos endpoints.
- Se calcula un vector normal a la línea para determinar el lado "entrada" y el lado "salida".
- Para cada persona trackeada, se evalúa el producto escalar de su posición con el vector normal.
- Cuando el signo cambia de positivo a negativo → entrada. De negativo a positivo → salida.
- Se usa un set de `crossed_tracks` para evitar contar doble.

**Métricas generadas:**
- Entradas por período (5 min)
- Salidas por período
- Ocupación actual (current_inside)
- Tráfico por hora (agregado)
- Pico de ocupación diario

**Datos almacenados:** Tabla `people_counts` (device_id, store_id, timestamp, entries, exits, current_inside, period_seconds)

---

### 5.2 Módulo: Heatmap de Tráfico (IMPLEMENTADO)

**Objetivo:** Visualizar la distribución espacial del tráfico dentro de la tienda.

**Algoritmo:**
- Se divide el frame en una grilla de NxM celdas (default: 20x15).
- En cada frame, se acumula +1 en la celda correspondiente al centroide de cada persona detectada.
- Cada hora se normaliza la grilla (0-1) dividiendo por el valor máximo y se envía al backend.

**Métricas generadas:**
- Mapa de calor por hora
- Mapa de calor diario (agregado)
- Zonas frías (baja actividad) vs zonas calientes (alta actividad)

**Datos almacenados:** Tabla `zone_heatmaps` (heatmap_data JSONB como array 2D, resolution, period)

---

### 5.3 Módulo: Zonas y Dwell Time (IMPLEMENTADO)

**Objetivo:** Segmentar la tienda en zonas lógicas (góndolas, cajas, entrada, promos) y medir el tiempo que cada persona pasa en cada zona.

**Algoritmo:**
- Las zonas se definen como polígonos con coordenadas normalizadas desde el dashboard (editor visual con canvas).
- En cada frame, se usa **ray casting** (point-in-polygon) para determinar en qué zona está cada persona.
- Se registra el momento de entrada y salida de cada zona por track_id.
- Se clasifica el engagement:
  - **Pass** (< 5 segundos): la persona solo pasó de largo
  - **Browse** (5-30 segundos): miró pero no interactuó significativamente
  - **Engaged** (> 30 segundos): interacción significativa con la zona

**Métricas generadas:**
- Tráfico por zona (entries/exits)
- Ocupación actual por zona
- Dwell time promedio por zona
- Tasa de engagement por zona
- Ranking de zonas por visitas

**Datos almacenados:**
- Tabla `zone_traffic` (zone_id, entries, exits, avg_occupancy, peak_occupancy)
- Tabla `dwell_events` (zone_id, track_id, entered_at, exited_at, dwell_seconds, engagement_type)

---

### 5.4 Módulo: Customer Journey Mapping (A IMPLEMENTAR)

**Objetivo:** Reconstruir el recorrido completo de cada cliente a través de las zonas de la tienda, desde la entrada hasta la salida.

**Algoritmo propuesto:**
- Para cada track_id, registrar la secuencia temporal de zonas visitadas: `[(zona_id, enter_time, exit_time), ...]`
- Al finalizar el tracking de una persona (sale de la tienda o se pierde el track), enviar el journey completo al backend.
- En el backend, agrupar journeys similares usando **sequence clustering** (Levenshtein distance sobre secuencias de zonas).
- Identificar los N patrones de recorrido más frecuentes.

**Métricas generadas:**
- Top 10 recorridos más frecuentes
- Recorrido promedio (cantidad de zonas visitadas, tiempo total)
- Flujo entre zonas (zona A → zona B: X personas) para **Sankey diagram**
- Tasa de rebote por zona (personas que entran a una zona y vuelven atrás)
- Zonas "ancla" (las que siempre están en el recorrido) vs zonas "destino" (las que atraen desvíos)

**Nuevas tablas:**
```sql
CREATE TABLE customer_journeys (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  track_id INT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  total_zones_visited INT DEFAULT 0,
  total_dwell_seconds FLOAT DEFAULT 0,
  journey_data JSONB NOT NULL, -- [{zone_id, enter, exit, dwell_s}, ...]
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journeys_store_time
  ON customer_journeys (store_id, started_at DESC);

CREATE TABLE zone_transitions (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  from_zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  to_zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  transition_count INT DEFAULT 1,
  period_seconds INT DEFAULT 3600,
  UNIQUE(store_id, from_zone_id, to_zone_id, timestamp)
);

CREATE INDEX idx_zone_transitions_store
  ON zone_transitions (store_id, timestamp DESC);
```

**Nuevos archivos edge:**
- `edge/journey_tracker.py` — Acumula la secuencia de zonas por track_id y genera el journey al perder el track.

**Nuevas páginas dashboard:**
- `/stores/[id]/journeys` — Visualización de recorridos con Sankey diagram, top patrones, filtros por fecha.

---

### 5.5 Módulo: Efectividad de Promociones (A IMPLEMENTAR)

**Objetivo:** Medir el impacto real de promociones, islas promocionales y exhibiciones especiales.

**Funcionamiento:**
- El usuario define en el dashboard una "campaña promo" vinculada a una zona y un rango de fechas (antes/durante/después).
- El sistema compara automáticamente las métricas de esa zona en los tres períodos.
- Se cruza con datos POS para medir impacto en ventas.

**Métricas generadas:**
- Tráfico en zona promo: antes vs durante vs después
- Dwell time en zona promo durante la campaña
- Tasa de engagement (pass/browse/engaged) durante la campaña
- Incremento de ventas del producto promovido (cruzando con POS)
- ROI de la promo: costo de la exhibición vs incremento de revenue
- Lift de tráfico: % de aumento respecto al baseline

**Nuevas tablas:**
```sql
CREATE TABLE promo_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  baseline_start DATE, -- período de comparación "antes"
  baseline_end DATE,
  product_category TEXT,
  promo_cost DECIMAL(12,2),
  status TEXT DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  results JSONB, -- métricas calculadas al finalizar
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_promo_campaigns_store
  ON promo_campaigns (store_id, start_date DESC);
```

**Nuevas páginas dashboard:**
- `/stores/[id]/promos` — Lista de campañas, crear nueva, ver resultados.
- `/stores/[id]/promos/[promoId]` — Detalle con gráficos comparativos antes/durante/después.

---

### 5.6 Módulo: Queue Analytics (A IMPLEMENTAR)

**Objetivo:** Detectar y medir colas en las cajas para optimizar la apertura de cajas y reducir tiempos de espera.

**Algoritmo propuesto:**
- Las zonas de caja se definen como zonas tipo "checkout" en el editor.
- Se cuenta la cantidad de personas en cada zona de caja en cada frame.
- Se estima el tiempo de espera basándose en: cantidad de personas × tiempo promedio de atención (configurable).
- Se detectan tendencias: cola creciendo, estable, decreciendo.
- Alertas automáticas cuando la cola supera un umbral configurable.

**Métricas generadas:**
- Personas en cola por caja (tiempo real)
- Tiempo de espera estimado por caja
- Pico de cola por hora
- Tiempo promedio de espera diario
- Eficiencia de caja (transacciones/hora)
- Tasa de abandono por cola larga (personas que se van sin comprar correlacionado con cola > N)

**Nuevas tablas:**
```sql
CREATE TABLE queue_snapshots (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  people_in_queue INT DEFAULT 0,
  estimated_wait_seconds INT DEFAULT 0,
  is_open BOOLEAN DEFAULT true
);

CREATE INDEX idx_queue_snapshots_store_time
  ON queue_snapshots (store_id, timestamp DESC);
```

**Nuevos archivos edge:**
- `edge/queue_detector.py` — Cuenta personas en zonas tipo "checkout" y estima tiempos.

**Nuevas páginas dashboard:**
- Widget en el overview de tienda: estado de colas en tiempo real.
- `/stores/[id]/queues` — Histórico de colas, análisis de tiempos de espera.

---

### 5.7 Módulo: Detección de Interacción con Producto (A IMPLEMENTAR)

**Objetivo:** Detectar cuando una persona toma o devuelve un producto de una góndola.

**Algoritmo propuesto (dos niveles de complejidad):**

**Nivel 1 — Proximity-based (más simple):**
- Definir "zonas de interacción" estrechas frente a las góndolas.
- Si una persona está en la zona de interacción + dwell time > 3 segundos → probable interacción.
- Alta cobertura, menor precisión.

**Nivel 2 — Pose + Movement-based (más avanzado):**
- Usar YOLOv8-pose para detectar la posición de las manos.
- Detectar gesture de "extender brazo hacia góndola" (mano por encima del hombro + cercana al borde de la góndola).
- Detectar cambio en la silueta (persona que sale de la zona con más volumen = tomó un producto).
- Requiere cámaras más cercanas y mayor resolución.

**Métricas generadas:**
- Interacciones por góndola/producto por hora
- Ratio pickup/putback (tasa de consideración vs compra)
- Correlación interacción-compra (cruzando con POS)
- "Tasa de abandono física" por categoría
- Productos más tocados pero no comprados

**Nuevas tablas:**
```sql
CREATE TABLE product_interactions (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  track_id INT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  interaction_type TEXT DEFAULT 'proximity'
    CHECK (interaction_type IN ('proximity', 'pickup', 'putback', 'browse')),
  duration_seconds FLOAT,
  confidence FLOAT DEFAULT 0.5
);

CREATE INDEX idx_product_interactions_zone_time
  ON product_interactions (zone_id, timestamp DESC);
```

---

### 5.8 Módulo: Shelf Monitoring (A IMPLEMENTAR)

**Objetivo:** Detectar huecos/vacíos en estantes de góndola para alertar reposición.

**Algoritmo propuesto:**
- Cámaras dedicadas apuntando a frentes de góndola.
- Modelo YOLO entrenado (o fine-tuned) para detectar "empty shelf space".
- Comparación con una imagen de referencia del estante lleno (planogram compliance).
- Generación de alertas cuando se detecta un hueco persistente (> 5 minutos para evitar falsos positivos por clientes tomando productos).

**Métricas generadas:**
- Porcentaje de llenado de góndola por hora
- Tiempo promedio hasta reposición
- Alertas de stockout
- Ventas perdidas estimadas (horas de estante vacío × ventas promedio/hora del producto)

**Nuevas tablas:**
```sql
CREATE TABLE shelf_events (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  event_type TEXT DEFAULT 'empty_detected'
    CHECK (event_type IN ('empty_detected', 'restocked', 'low_stock')),
  fill_percentage FLOAT,
  empty_slots INT DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  image_snapshot_url TEXT
);

CREATE INDEX idx_shelf_events_store_time
  ON shelf_events (store_id, timestamp DESC);
```

---

### 5.9 Módulo: Análisis Demográfico Anónimo (A IMPLEMENTAR)

**Objetivo:** Estimar distribución de edad y género del público para segmentar métricas.

**Consideraciones éticas y legales:**
- NO se realiza reconocimiento facial ni identificación de individuos.
- Se estiman rangos (18-30, 30-45, 45-60, 60+) y género, no identidades.
- Los datos se almacenan únicamente como distribución agregada, nunca vinculados a un individuo.
- Cumplimiento con regulaciones de privacidad (GDPR, ley argentina de datos personales).

**Algoritmo propuesto:**
- Modelo de estimación de edad/género (ej: InsightFace, DeepFace, o modelo custom liviano).
- Se ejecuta solo en la zona de entrada (una vez por persona).
- Se almacena como distribución porcentual, no como dato individual.

**Métricas generadas:**
- Distribución etaria del público por hora/día
- Distribución por género por hora/día
- Segmentación de todas las métricas por demografía (ej: "los jóvenes de 18-30 pasan 2x más tiempo en electrónica")
- Variación demográfica por día de semana / franja horaria

**Nuevas tablas:**
```sql
CREATE TABLE demographic_snapshots (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  period_seconds INT DEFAULT 3600,
  age_18_30 INT DEFAULT 0,
  age_30_45 INT DEFAULT 0,
  age_45_60 INT DEFAULT 0,
  age_60_plus INT DEFAULT 0,
  gender_male INT DEFAULT 0,
  gender_female INT DEFAULT 0,
  total_estimated INT DEFAULT 0
);

CREATE INDEX idx_demographic_snapshots_store_time
  ON demographic_snapshots (store_id, timestamp DESC);
```

---

### 5.10 Módulo: Correlación con Factores Externos (A IMPLEMENTAR)

**Objetivo:** Cruzar métricas de tráfico con variables externas para entender su impacto.

**Fuentes de datos:**
- **Clima:** API de OpenWeatherMap o similar (temperatura, lluvia, humedad)
- **Calendario:** Feriados nacionales, días de cobro de jubilaciones/sueldos, eventos locales
- **POS:** Transacciones, montos, categorías de producto

**Métricas generadas:**
- Impacto del clima en tráfico: "cuando llueve, el tráfico baja 25% pero el ticket promedio sube 18%"
- Efecto día de cobro: "el día posterior al cobro de jubilaciones, el tráfico 9-12h aumenta 45%"
- Estacionalidad: patrones por mes/semana
- Correlación multivariable para predicciones más precisas

**Nuevas tablas:**
```sql
CREATE TABLE external_factors (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  temperature_avg FLOAT,
  precipitation_mm FLOAT,
  weather_condition TEXT, -- sunny, cloudy, rainy, stormy
  is_holiday BOOLEAN DEFAULT false,
  holiday_name TEXT,
  is_payday BOOLEAN DEFAULT false,
  special_event TEXT,
  notes TEXT,
  UNIQUE(store_id, date)
);

CREATE INDEX idx_external_factors_store_date
  ON external_factors (store_id, date DESC);
```

---

### 5.11 Módulo: Staff Analytics (A IMPLEMENTAR)

**Objetivo:** Correlacionar la presencia de personal en zonas con métricas de ventas y engagement.

**Funcionamiento:**
- Los empleados se identifican por uniforme (color detection) o por exclusión (personas con dwell > 2 horas en la misma zona = probable empleado).
- Se mide presencia de personal por zona y por hora.
- Se correlaciona con ventas y engagement de clientes.

**Métricas generadas:**
- Cobertura de personal por zona y hora
- Correlación presencia de vendedor vs tasa de conversión en la zona
- Sugerencia de dotación óptima por zona y franja horaria

---

### 5.12 Módulo: Predicciones Avanzadas (A MEJORAR)

**Estado actual:** Media ponderada + exponential smoothing básico.

**Mejoras propuestas:**
- Incorporar variables externas (clima, feriados, día de cobro) al modelo
- Implementar modelos de series temporales más robustos:
  - **Prophet** (Facebook) — bueno para estacionalidad y feriados
  - **SARIMA** — modelo clásico para series temporales estacionales
  - **LSTM** (si hay suficientes datos) — redes neuronales para patrones complejos
- Predicciones a nivel de zona (no solo tienda)
- Predicción de conversión (no solo tráfico)
- Intervalo de confianza visual en los gráficos

---

### 5.13 Módulo: Benchmarking Multi-Sucursal (A IMPLEMENTAR)

**Objetivo:** Comparar métricas entre sucursales de una misma cadena.

**Métricas de benchmarking:**
- Revenue por visitante (RPV)
- Revenue por metro cuadrado
- Tasa de conversión
- Dwell time promedio
- Eficiencia de layout (% de tienda visitada por cliente promedio)
- Engagement rate por zona equivalent (ej: "lácteos en todas las sucursales")

**Nuevas páginas dashboard:**
- `/analytics/benchmarking` — Tabla comparativa, ranking por métrica, gráficos de dispersión.

---

## 6. Stack Tecnológico Completo

### 6.1 Edge Device

| Componente | Tecnología | Versión | Función |
|-----------|-----------|---------|---------|
| Lenguaje | Python | 3.10+ | Runtime principal |
| Detección | YOLOv8 (ultralytics) | Latest | Detección de personas y objetos |
| Tracking | ByteTrack | Built-in | Asignación de IDs únicos entre frames |
| Video | OpenCV | 4.x | Captura y procesamiento de frames |
| HTTP | httpx | Latest | Push async de datos al backend |
| Buffer | SQLite3 | Built-in | Almacenamiento offline |
| Streaming | websockets | Latest | Frame server para calibración |
| Health | psutil | Latest | Monitoreo de CPU/memoria |
| Config | python-dotenv | Latest | Variables de entorno |
| ML extra | InsightFace | Latest | Estimación demográfica (futuro) |
| Pose | YOLOv8-pose | Latest | Detección de poses para interacción (futuro) |

### 6.2 Backend

| Componente | Tecnología | Versión | Función |
|-----------|-----------|---------|---------|
| Framework | Next.js | 14 | App Router, API Routes, SSR |
| Base de datos | Supabase | Latest | PostgreSQL + Auth + RLS + Realtime |
| Validación | Zod | 4.x | Schema validation |
| Deploy | Vercel | - | Hosting y serverless |

### 6.3 Frontend

| Componente | Tecnología | Versión | Función |
|-----------|-----------|---------|---------|
| UI Framework | React | 18 | Componentes funcionales |
| Estilos | Tailwind CSS | 3.4 | Utility-first CSS |
| Componentes | Shadcn/ui (Radix) | Latest | Component library |
| Gráficos | Recharts | 3.x | Charts (área, barras, línea, Sankey) |
| State | Zustand | 5.x | Global state management |
| Data fetching | TanStack React Query | 5.x | Server state, polling |
| Fechas | date-fns | 4.x | Utilidades de fechas |
| Toasts | Sonner | 2.x | Notificaciones |
| Íconos | Lucide React | Latest | Iconografía |

---

## 7. Modelo de Datos Completo

### 7.1 Diagrama Entidad-Relación (simplificado)

```
organizations ──1:N──► stores ──1:N──► devices
      │                    │                │
      │                    │                └──► device_zones ◄── zones
      │                    │                                       │
      │                    ├──1:N──► people_counts                 │
      │                    ├──1:N──► zone_heatmaps                │
      │                    ├──1:N──► transactions                  │
      │                    ├──1:N──► zone_traffic ◄────────────────┘
      │                    ├──1:N──► dwell_events ◄────────────────┘
      │                    ├──1:N──► customer_journeys
      │                    ├──1:N──► queue_snapshots
      │                    ├──1:N──► product_interactions
      │                    ├──1:N──► shelf_events
      │                    ├──1:N──► demographic_snapshots
      │                    ├──1:N──► external_factors
      │                    ├──1:N──► promo_campaigns
      │                    ├──1:N──► daily_store_summaries
      │                    ├──1:N──► daily_zone_summaries
      │                    ├──1:N──► alert_rules ──1:N──► alert_events
      │                    └──1:N──► floor_plans
      │
      └──1:N──► user_profiles ◄── auth.users
```

### 7.2 Total de tablas: 22

**Existentes (16):** organizations, user_profiles, stores, devices, people_counts, zone_heatmaps, transactions, floor_plans, zones, device_zones, zone_traffic, dwell_events, daily_store_summaries, daily_zone_summaries, alert_rules, alert_events

**Nuevas (6):** customer_journeys, zone_transitions, promo_campaigns, queue_snapshots, product_interactions, shelf_events, demographic_snapshots, external_factors

---

## 8. Endpoints API — Mapa Completo

### 8.1 Ingesta (Edge → Backend)

| Endpoint | Método | Auth | Datos |
|----------|--------|------|-------|
| `/api/ingest/counts` | POST | X-Device-Key | entries, exits, current_inside |
| `/api/ingest/heatmap` | POST | X-Device-Key | heatmap_data[][], resolution |
| `/api/ingest/zones` | POST | X-Device-Key | zone traffic + dwell events |
| `/api/ingest/heartbeat` | POST | X-Device-Key | cpu, mem, fps, uptime |
| `/api/ingest/journeys` | POST | X-Device-Key | journey_data[] (NUEVO) |
| `/api/ingest/queues` | POST | X-Device-Key | queue snapshots (NUEVO) |
| `/api/ingest/interactions` | POST | X-Device-Key | product interactions (NUEVO) |
| `/api/ingest/shelves` | POST | X-Device-Key | shelf events (NUEVO) |
| `/api/ingest/demographics` | POST | X-Device-Key | demographic snapshot (NUEVO) |

### 8.2 Dashboard (Frontend → Backend)

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/stores` | GET/POST | CRUD tiendas |
| `/api/stores/[id]` | GET/PUT/DELETE | Tienda individual |
| `/api/stores/[id]/zones` | GET/POST/DELETE | Zonas |
| `/api/devices` | GET/POST | Devices |
| `/api/devices/config` | GET | Config del device |
| `/api/analytics/[id]/overview` | GET | Overview analítico |
| `/api/analytics/[id]/zones` | GET | Analytics por zona |
| `/api/analytics/[id]/journeys` | GET | Recorridos de clientes (NUEVO) |
| `/api/analytics/[id]/queues` | GET | Histórico de colas (NUEVO) |
| `/api/analytics/[id]/interactions` | GET | Interacciones con producto (NUEVO) |
| `/api/analytics/[id]/shelves` | GET | Estado de estantes (NUEVO) |
| `/api/analytics/[id]/demographics` | GET | Distribución demográfica (NUEVO) |
| `/api/analytics/compare` | GET | Comparación de períodos |
| `/api/analytics/benchmarking` | GET | Multi-sucursal (NUEVO) |
| `/api/predictions/[id]` | GET | Predicciones |
| `/api/insights/[id]` | GET | Insights IA |
| `/api/promos` | GET/POST | Campañas promo (NUEVO) |
| `/api/promos/[id]` | GET/PUT | Detalle/resultado promo (NUEVO) |
| `/api/external-factors` | GET/POST | Factores externos (NUEVO) |
| `/api/alerts` | GET/POST | Alertas |
| `/api/transactions` | POST | Transacciones POS |

---

## 9. Páginas del Dashboard — Mapa Completo

### 9.1 Navegación Principal

```
Dashboard
├── Overview (home)
├── Analytics Global
│   ├── Benchmarking Multi-Sucursal (NUEVO)
│   └── Predicciones Globales
├── Tiendas
│   ├── Lista de Tiendas
│   ├── Nueva Tienda
│   └── [Tienda Individual]
│       ├── Overview de Tienda
│       ├── Tráfico (gráficos temporales)
│       ├── Mapa de Calor
│       ├── Zonas y Dwell Time
│       ├── Customer Journey (NUEVO)
│       ├── Conversión
│       ├── Colas (NUEVO)
│       ├── Interacción con Producto (NUEVO)
│       ├── Estantes (NUEVO)
│       ├── Demografía (NUEVO)
│       ├── Promociones (NUEVO)
│       ├── Dispositivos
│       │   └── Calibración de Cámara
│       └── Configuración
├── Dispositivos
├── Alertas
└── Configuración (org, usuarios)
```

---

## 10. KPIs Clave del Sistema

### 10.1 KPIs Operativos (Gerente de Tienda)

| KPI | Fórmula | Frecuencia |
|-----|---------|------------|
| Ocupación actual | current_inside | Real-time |
| Tráfico diario | SUM(entries) del día | Diario |
| Tiempo de espera en caja | AVG(estimated_wait_seconds) | Real-time |
| Alertas activas | COUNT(alert_events WHERE status='active') | Real-time |
| Estantes vacíos | COUNT(shelf_events WHERE event_type='empty_detected' AND resolved_at IS NULL) | Real-time |
| Cobertura de personal | zonas con personal / zonas totales | Horario |

### 10.2 KPIs Comerciales (Gerente de Categoría)

| KPI | Fórmula | Frecuencia |
|-----|---------|------------|
| Tasa de conversión | transacciones / visitantes × 100 | Diario |
| Dwell time por zona | AVG(dwell_seconds) por zona | Diario |
| Engagement rate | (browse + engaged) / total_visits × 100 | Diario |
| Tasa de interacción | product_interactions / zone_visits | Diario |
| Pickup/putback ratio | pickups / (pickups + putbacks) | Diario |
| Efectividad promo | traffic_during / traffic_baseline × 100 | Por campaña |

### 10.3 KPIs Estratégicos (Director Comercial)

| KPI | Fórmula | Frecuencia |
|-----|---------|------------|
| Revenue por visitante (RPV) | total_revenue / total_visitors | Semanal |
| Revenue por m² | total_revenue / superficie_tienda | Mensual |
| Eficiencia de layout | zonas_visitadas_avg / zonas_totales × 100 | Semanal |
| Score de sucursal | índice compuesto ponderado | Mensual |
| Trend de conversión | comparación semana actual vs anterior | Semanal |
| ROI por acción | delta_revenue / costo_accion | Por acción |

---

## 11. Plan de Implementación

### Fase 1: Fundación (COMPLETADA)
- [x] Scaffold Next.js + Tailwind + Shadcn
- [x] Supabase Auth + RLS
- [x] Schema base de datos
- [x] CRUD tiendas y devices
- [x] Edge pipeline: YOLO + ByteTrack + Counter + Heatmap
- [x] API de ingesta
- [x] Dashboard básico

### Fase 2: Zonas y Dwell (COMPLETADA)
- [x] Zone Editor visual (canvas)
- [x] Zone Tracker en edge
- [x] Dwell events y engagement classification
- [x] Zone traffic API
- [x] Daily summaries (store + zone)
- [x] Insights Engine
- [x] Prediction Engine
- [x] Alert system

### Fase 3: Customer Journey + Queue Analytics
- [ ] Journey Tracker en edge
- [ ] Journey API + tablas
- [ ] Sankey diagram en dashboard
- [ ] Top patrones de recorrido
- [ ] Queue Detector en edge
- [ ] Queue API + dashboard
- [ ] Alertas de cola larga

### Fase 4: Efectividad Promo + Correlaciones
- [ ] CRUD de campañas promo
- [ ] Cálculo automático antes/durante/después
- [ ] Integración de factores externos (clima API)
- [ ] Calendario de feriados/eventos
- [ ] Dashboard de correlaciones
- [ ] Predicciones mejoradas con variables externas

### Fase 5: Interacción y Shelf Monitoring
- [ ] Interaction Detector (proximity-based)
- [ ] Shelf Monitor (fine-tuned YOLO o reference comparison)
- [ ] APIs y dashboard de interacciones
- [ ] Alertas de estante vacío
- [ ] Ratio pickup/putback

### Fase 6: Demografía + Staff + Benchmarking
- [ ] Modelo de estimación demográfica
- [ ] Staff detection
- [ ] Dashboard de benchmarking multi-sucursal
- [ ] Score compuesto por sucursal
- [ ] Dashboard prescriptivo (recomendaciones automáticas)

### Fase 7: Piloto y Validación
- [ ] Instalación en tienda real
- [ ] Calibración y ajuste de modelos
- [ ] Recolección de datos reales (mínimo 2 semanas)
- [ ] Validación de métricas contra ground truth
- [ ] Iteración basada en feedback

---

## 12. Consideraciones para la Tesis

### 12.1 Marco Teórico Sugerido

- **Computer Vision en Retail:** estado del arte de detección de personas y objetos (YOLO family, EfficientDet, DETR)
- **Object Tracking:** Multi-Object Tracking (MOT), ByteTrack, SORT, DeepSORT — métricas MOTA, MOTP, IDF1
- **Edge Computing:** procesamiento distribuido, latencia, privacidad, consumo energético
- **Retail Analytics:** métricas tradicionales de retail, gap entre digital y físico
- **Time Series Forecasting:** métodos estadísticos vs ML para predicción de demanda
- **Human-Computer Interaction:** diseño de dashboards, visualización de datos
- **Privacidad y Ética:** GDPR, ley argentina 25.326, anonimización, privacy by design

### 12.2 Contribuciones Originales

1. **Arquitectura edge-cloud** para retail analytics que preserva privacidad (no envía video).
2. **Sistema integrado** que combina conteo + zonas + journeys + predicciones en una plataforma unificada.
3. **Motor de insights prescriptivos** que genera recomendaciones accionables automáticamente.
4. **Métricas de engagement físico** equivalentes a las del e-commerce (dwell time = tiempo en página, pickup/putback = add to cart / abandoned cart).

### 12.3 Métricas de Validación

- **Precisión del conteo:** comparar con ground truth manual (contar personas en video). Target: >90% accuracy.
- **Precisión del tracking:** métricas MOT estándar (MOTA, IDF1).
- **Latencia del sistema:** tiempo desde captura de frame hasta dato disponible en dashboard.
- **Precisión de predicciones:** MAE, RMSE, MAPE contra datos reales.
- **Usabilidad del dashboard:** encuesta SUS (System Usability Scale) con usuarios reales.

### 12.4 Posibles Títulos de Tesis

1. "Plataforma de Retail Intelligence basada en Computer Vision y Edge Computing para la Optimización de Grandes Superficies Comerciales"
2. "Sistema de Análisis de Comportamiento del Consumidor en Retail Físico mediante Visión por Computadora"
3. "Diseño e Implementación de una Plataforma de Analytics para Retail utilizando YOLOv8, Edge Computing y Dashboards Prescriptivos"
4. "RetailVision: Transformando Cámaras de Seguridad en Sensores de Inteligencia Comercial mediante Computer Vision"

---

## 13. Glosario

| Término | Definición |
|---------|-----------|
| **Edge Device** | Dispositivo de procesamiento local (mini PC + GPU) ubicado en la tienda |
| **Dwell Time** | Tiempo que una persona permanece en una zona determinada |
| **Engagement** | Nivel de interacción de un visitante con una zona (pass/browse/engaged) |
| **Heatmap** | Representación visual de la densidad de tráfico en el espacio |
| **ByteTrack** | Algoritmo de multi-object tracking que asigna IDs únicos a personas entre frames |
| **RLS (Row Level Security)** | Política de seguridad a nivel de fila en PostgreSQL que filtra datos por organización |
| **RPV** | Revenue Per Visitor — ingreso promedio por visitante |
| **Conversion Rate** | Porcentaje de visitantes que realizan una compra |
| **Sankey Diagram** | Gráfico de flujo que muestra transiciones entre nodos (zonas) |
| **Customer Journey** | Secuencia completa de zonas visitadas por un cliente |
| **Planogram** | Disposición ideal de productos en una góndola |
| **Stockout** | Situación donde un producto se agota en el estante |
| **Multi-tenant** | Arquitectura donde múltiples organizaciones comparten la infraestructura pero tienen datos aislados |
| **Hot-reload** | Capacidad de actualizar configuración remotamente sin reiniciar el sistema |

---

*Documento generado como base para los entregables de tesis de RetailVision.*
*Última actualización: Abril 2026*
