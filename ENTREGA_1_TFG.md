# Plataforma de Retail Intelligence basada en Computer Vision y Edge Computing para la Optimización Comercial de Grandes Superficies

---

## Introducción

El presente Trabajo Final de Graduación aborda el diseño e implementación de una plataforma de software denominada RetailVision, orientada al análisis del comportamiento del consumidor dentro de grandes superficies comerciales mediante técnicas de visión por computadora y procesamiento en el borde (edge computing). El proyecto se desarrolla como una solución genérica aplicable a cualquier organización del sector retail que opere locales de gran superficie, tales como supermercados, hipermercados y tiendas departamentales.

La plataforma propuesta transforma cámaras de video convencionales en sensores inteligentes capaces de detectar, rastrear y analizar el flujo de personas dentro de un establecimiento comercial. A diferencia de las soluciones existentes en el mercado, que operan como sistemas propietarios cerrados y de alto costo, RetailVision plantea una arquitectura modular, escalable y accesible que procesa el video localmente en el dispositivo —sin enviar imágenes a la nube— garantizando así la privacidad de los consumidores.

El sistema se compone de tres capas: un dispositivo de borde (edge device) que ejecuta modelos de detección de objetos en tiempo real, un backend en la nube que almacena y procesa las métricas agregadas, y un dashboard web que permite a los tomadores de decisión visualizar indicadores, recibir alertas y obtener recomendaciones accionables. El objetivo final es dotar a las grandes superficies de información equivalente a la que el comercio electrónico obtiene de forma nativa: cuántas personas ingresan, qué recorren, dónde se detienen, con qué interactúan y qué compran.

### Antecedentes

La industria del retail ha experimentado una transformación significativa en la última década impulsada por la digitalización del comercio. Mientras que las plataformas de comercio electrónico disponen de herramientas avanzadas de analítica —como tasas de conversión por página, mapas de calor de clics, análisis de carrito abandonado y segmentación de usuarios—, las tiendas físicas tradicionalmente han dependido de datos limitados provenientes de los sistemas de punto de venta (POS), que solo registran lo que el cliente efectivamente compró, sin visibilidad alguna sobre el comportamiento previo a la compra (Verhoef et al., 2015).

Los primeros intentos por cerrar esta brecha informativa surgieron con los contadores de personas basados en sensores infrarrojos y alfombras de presión en la década de 1990. Estos dispositivos ofrecían un conteo básico de entradas y salidas pero carecían de capacidad para rastrear el movimiento dentro del local. Posteriormente, la introducción de balizas Bluetooth (beacons) y el análisis de señales Wi-Fi permitieron una aproximación al rastreo de dispositivos móviles, aunque con limitaciones significativas de precisión y una tasa de captura que solo abarcaba a clientes con dispositivos encendidos y conectables, típicamente entre el 30% y 50% del total de visitantes (Mautz, 2012).

El avance más significativo se produjo con la maduración de los modelos de aprendizaje profundo para detección de objetos. La familia de modelos YOLO (You Only Look Once), introducida por Redmon et al. (2016) y sucesivamente mejorada hasta su versión 8 (Ultralytics, 2023), logró velocidades de inferencia compatibles con el procesamiento en tiempo real manteniendo alta precisión. Paralelamente, el desarrollo de algoritmos de seguimiento multi-objeto (Multi-Object Tracking, MOT) como SORT (Bewley et al., 2016), DeepSORT (Wojke et al., 2017) y ByteTrack (Zhang et al., 2022) permitió asignar identidades consistentes a cada persona detectada a lo largo de múltiples cuadros de video, posibilitando el análisis de trayectorias y tiempos de permanencia.

En el ámbito comercial, empresas como RetailNext, Sensormatic Solutions (Johnson Controls) y V-Count ofrecen soluciones propietarias de analítica para retail basadas en visión por computadora. Sin embargo, estas soluciones presentan características que limitan su adopción: costos de licenciamiento elevados que oscilan entre 500 y 2.000 dólares mensuales por tienda, dependencia de hardware propietario, arquitecturas cerradas que dificultan la personalización, y procesamiento centralizado en la nube que implica el envío continuo de video a servidores externos con las consecuentes implicancias de privacidad y consumo de ancho de banda (Grand View Research, 2023).

El paradigma de edge computing, que propone realizar el procesamiento de datos en el punto de generación en lugar de transmitirlos a un centro de datos remoto, ha ganado relevancia como alternativa para aplicaciones de visión por computadora en tiempo real (Shi et al., 2016). Los avances en hardware de bajo consumo con capacidad de procesamiento de redes neuronales —como las plataformas NVIDIA Jetson, Intel NUC y mini PCs con GPUs integradas— han hecho viable la ejecución de modelos de detección de objetos directamente en el punto de captura de video.

En Argentina, el mercado de retail analytics se encuentra en una etapa incipiente. Las grandes cadenas de supermercados (Coto, Jumbo, Disco, Carrefour) operan con sistemas de conteo básicos o carecen de ellos por completo, dependiendo exclusivamente de datos transaccionales para la toma de decisiones comerciales. Esta situación representa una oportunidad para la introducción de soluciones tecnológicas accesibles que permitan a estas organizaciones competir con mayor información y eficiencia.

### Descripción del área problemática

Las grandes superficies comerciales enfrentan un problema estructural de asimetría informativa: conocen con precisión lo que el cliente compró (a través del POS) pero desconocen casi por completo lo que sucede antes y durante el proceso de compra dentro del local. Esta falta de visibilidad afecta múltiples áreas operativas y estratégicas:

**Gestión de tráfico y ocupación.** Los gerentes de tienda no disponen de información en tiempo real sobre la cantidad de personas dentro del local, lo que dificulta la gestión de la dotación de personal, la apertura de cajas y el cumplimiento de normativas de aforo.

**Distribución espacial y layout.** Las decisiones sobre la disposición de góndolas, la ubicación de productos y el diseño de recorridos se toman basándose en la intuición del gerente de categoría o en estudios de layout costosos y poco frecuentes, en lugar de en datos objetivos sobre el comportamiento real del consumidor.

**Efectividad promocional.** Las inversiones en exhibiciones especiales, islas promocionales y cabeceras de góndola carecen de una métrica confiable de impacto. No se mide cuántas personas se detuvieron frente a la promoción ni si eso se tradujo en un incremento real de ventas del producto promovido.

**Gestión de colas.** La decisión de abrir o cerrar cajas se toma de forma reactiva cuando las filas ya son visiblemente largas, lo que genera tiempos de espera excesivos y potencial pérdida de clientes que abandonan el local sin comprar.

**Reposición de productos.** La detección de estantes vacíos depende de la revisión visual periódica del repositor, lo que genera ventanas de tiempo donde los productos están agotados sin que nadie lo registre, ocasionando ventas perdidas.

**Tasa de conversión.** Si bien el concepto de tasa de conversión (visitantes que efectivamente compran) es un indicador fundamental en el comercio electrónico, las tiendas físicas rara vez lo calculan porque no miden con precisión la cantidad de visitantes.

Estas problemáticas afectan de manera directa la rentabilidad del negocio. Estudios del sector estiman que las grandes superficies pierden entre un 3% y un 5% de sus ventas potenciales por problemas de stockout (Gruen et al., 2002), y que una reducción de un minuto en el tiempo promedio de espera en caja puede incrementar la satisfacción del cliente en un 15% y reducir la tasa de abandono en un 8% (Katz et al., 1991). La disponibilidad de datos sobre el comportamiento in-store permitiría abordar estas problemáticas de forma proactiva y basada en evidencia.

---

## Justificación

El desarrollo de RetailVision se justifica desde múltiples perspectivas que abarcan la necesidad del mercado, el impacto tecnológico, la relevancia empresarial y la innovación en tecnologías de la información y la comunicación.

**Necesidades que satisface.** El proyecto responde a la necesidad concreta de las grandes superficies comerciales de contar con información objetiva y en tiempo real sobre el comportamiento del consumidor dentro de sus establecimientos. Los resultados del sistema permiten responder preguntas operativas inmediatas —como cuántas cajas abrir en un momento dado— y preguntas estratégicas de mediano plazo —como dónde ubicar una nueva categoría de productos para maximizar su visibilidad.

**Impacto tecnológico.** La plataforma integra y articula múltiples tecnologías de frontera en una solución cohesiva: modelos de aprendizaje profundo para detección y seguimiento de personas (YOLOv8, ByteTrack), procesamiento en el borde para garantizar privacidad y baja latencia, arquitectura multi-tenant para escalabilidad empresarial, y un motor de insights prescriptivos que no solo describe lo que ocurrió sino que recomienda acciones. Esta integración tecnológica constituye una contribución significativa al estado del arte en la aplicación de visión por computadora al dominio del retail.

**Relevancia empresarial.** Para las organizaciones del sector retail, el sistema ofrece beneficios tangibles y cuantificables: optimización de la dotación de personal basada en predicciones de tráfico, reducción de tiempos de espera en caja mediante alertas proactivas, incremento de la efectividad promocional a través de medición objetiva, reducción de ventas perdidas por stockout mediante monitoreo de estantes, y mejora continua del layout basada en datos reales de recorridos de clientes. El retorno de inversión se manifiesta tanto en reducción de costos operativos como en incremento de ventas.

**Innovación a nivel TIC y procesos.** La innovación central del proyecto radica en dos aspectos. Primero, la arquitectura de edge computing que permite procesar video localmente sin enviar imágenes a la nube, resolviendo simultáneamente los problemas de privacidad, latencia y ancho de banda que presentan las soluciones centralizadas existentes. Segundo, la traducción de métricas nativas del comercio electrónico al mundo físico: el dwell time equivale al tiempo en página, el ratio de pickup/putback equivale al carrito abandonado, y el recorrido por zonas equivale al embudo de navegación web. Esta analogía conceptual, implementada mediante visión por computadora, representa una innovación tanto a nivel de proceso como de tecnología.

**Factibilidad.** El proyecto es técnicamente factible gracias a la disponibilidad de modelos de detección de objetos de código abierto con rendimiento suficiente para tiempo real (YOLOv8 ejecutando a más de 30 FPS en hardware de consumo), frameworks web maduros para el desarrollo del dashboard (Next.js, React), y servicios de backend gestionados que reducen la complejidad operativa (Supabase). Económicamente, el hardware requerido por tienda —un mini PC con GPU integrada y cámaras IP estándar— representa un costo significativamente inferior al de las soluciones propietarias del mercado.

---

## Objetivo General

Diseñar, desarrollar e implementar una plataforma de software de retail intelligence basada en visión por computadora y edge computing que permita a grandes superficies comerciales capturar, analizar y visualizar el comportamiento del consumidor dentro del establecimiento —incluyendo conteo de personas, mapas de calor, recorridos de clientes, análisis por zonas, efectividad de promociones y gestión de colas— proporcionando indicadores clave de rendimiento e insights prescriptivos para la toma de decisiones orientadas a incrementar las ventas y la eficiencia operativa.

---

## Objetivos Específicos

1. Desarrollar un pipeline de visión por computadora capaz de detectar y rastrear personas en tiempo real utilizando el modelo YOLOv8 y el algoritmo de seguimiento ByteTrack, ejecutándose localmente en un dispositivo de borde (edge device).

2. Implementar un sistema de conteo de personas basado en líneas virtuales configurables que permita medir entradas, salidas y ocupación actual del establecimiento con una precisión superior al 90%.

3. Diseñar e implementar un módulo de generación de mapas de calor (heatmaps) que represente la distribución espacial del tráfico de clientes dentro de la tienda, segmentado por franjas horarias y días.

4. Construir un sistema de definición y seguimiento de zonas que permita segmentar el local comercial en áreas lógicas (góndolas, cajas, entradas, zonas promocionales) y medir el tráfico, tiempo de permanencia (dwell time) y nivel de engagement en cada zona.

5. Implementar un módulo de mapeo de recorridos (customer journey) que reconstruya la trayectoria completa de cada cliente a través de las zonas del local, identificando patrones de navegación dominantes y flujos entre zonas.

6. Desarrollar un módulo de análisis de colas que detecte la cantidad de personas esperando en las zonas de caja, estime tiempos de espera y genere alertas automáticas cuando se superen umbrales configurables.

7. Diseñar un módulo de medición de efectividad promocional que compare métricas de tráfico y engagement en zonas promocionales durante los períodos previo, activo y posterior a una campaña.

8. Implementar un backend multi-tenant con base de datos relacional, seguridad a nivel de fila (Row Level Security) y API RESTful para la ingesta de datos desde los dispositivos de borde y la consulta desde el dashboard.

9. Desarrollar un dashboard web responsivo que presente los indicadores clave mediante gráficos interactivos, mapas de calor visuales, diagramas de flujo de recorridos y tablas comparativas, adaptado a los roles de gerente de tienda, gerente de categoría y director comercial.

10. Implementar un motor de insights y predicciones que genere recomendaciones accionables automáticas basadas en el análisis de tendencias, anomalías y correlaciones en los datos recopilados.

11. Validar el sistema mediante la instalación en un local modelo, evaluando la precisión del conteo contra medición manual (ground truth), la latencia del sistema y la usabilidad del dashboard con usuarios representativos.

---

## Marco Teórico Referencial

### Visión por Computadora y Detección de Objetos

La visión por computadora es una disciplina de la inteligencia artificial que busca dotar a las máquinas de la capacidad de interpretar y comprender información visual del mundo real. En el contexto de la detección de objetos, el objetivo es localizar e identificar objetos específicos dentro de una imagen o secuencia de video (Szeliski, 2022).

Los modelos de detección de objetos basados en redes neuronales convolucionales (CNN) han evolucionado significativamente en la última década. Los enfoques de dos etapas, como R-CNN y sus variantes (Girshick et al., 2014), alcanzan alta precisión pero con velocidades de inferencia incompatibles con el tiempo real. Los modelos de una etapa, como SSD (Liu et al., 2016) y la familia YOLO (Redmon et al., 2016), sacrifican una fracción de precisión a cambio de velocidades de procesamiento que permiten aplicaciones en tiempo real.

YOLOv8, desarrollado por Ultralytics (2023), representa la iteración más reciente de la familia YOLO. Introduce mejoras en la arquitectura de red (backbone CSPDarknet con conexiones C2f), un head de detección desacoplado (decoupled head) y una función de pérdida basada en distribución (Distribution Focal Loss). El modelo ofrece variantes desde nano (3.2M parámetros, 8.7 GFLOPs) hasta extra-large (68.2M parámetros, 257.8 GFLOPs), permitiendo seleccionar el balance adecuado entre precisión y velocidad según el hardware disponible (Ultralytics, 2023). Para la detección de personas, que corresponde a la clase 0 del dataset COCO, YOLOv8n alcanza un mAP50 superior al 80% con velocidades de más de 30 FPS en GPUs de consumo.

### Seguimiento Multi-Objeto (Multi-Object Tracking)

El seguimiento multi-objeto consiste en mantener la identidad de cada objeto detectado a lo largo de una secuencia de cuadros de video. Este problema presenta desafíos como las oclusiones parciales o totales, los cambios de apariencia, y la entrada y salida de objetos de la escena (Luo et al., 2021).

El paradigma dominante en MOT es tracking-by-detection, donde primero se ejecuta un detector de objetos en cada cuadro y luego se asocian las detecciones entre cuadros consecutivos. El algoritmo SORT (Simple Online and Realtime Tracking), propuesto por Bewley et al. (2016), utiliza el filtro de Kalman para predecir la posición futura de cada objeto y el algoritmo húngaro para la asociación óptima de detecciones. DeepSORT extiende este enfoque incorporando características de apariencia extraídas por una red neuronal para mejorar la asociación (Wojke et al., 2017).

ByteTrack, propuesto por Zhang et al. (2022), introduce una mejora significativa al considerar tanto las detecciones de alta confianza como las de baja confianza en el proceso de asociación. Las detecciones de alta confianza se asocian primero utilizando similitud de movimiento (IoU), y las detecciones de baja confianza se asocian en una segunda pasada con los tracks no emparejados. Este enfoque reduce significativamente la cantidad de identidades perdidas (ID switches) y mejora las métricas MOTA e IDF1, métricas estándar para evaluar el rendimiento de MOT (Zhang et al., 2022). ByteTrack se encuentra integrado nativamente en la librería Ultralytics, lo que facilita su uso conjunto con YOLOv8.

### Edge Computing

El edge computing es un paradigma de computación distribuida que acerca el procesamiento de datos al punto donde estos se generan, en contraposición al modelo tradicional de computación en la nube que centraliza el procesamiento en centros de datos remotos (Shi et al., 2016). En aplicaciones de visión por computadora, el edge computing ofrece ventajas fundamentales:

Reducción de latencia, al eliminar el tiempo de transmisión de video a un servidor remoto; preservación de la privacidad, al procesar las imágenes localmente y enviar únicamente métricas agregadas; reducción del consumo de ancho de banda, al evitar la transmisión continua de streams de video; y funcionamiento offline, al mantener la operación incluso ante pérdidas de conectividad (Satyanarayanan, 2017).

Plataformas de hardware como NVIDIA Jetson, Intel NUC y mini PCs con GPUs integradas han democratizado el acceso a capacidad de procesamiento de redes neuronales en dispositivos compactos y de bajo consumo energético, haciendo viable la ejecución de modelos como YOLOv8 en el punto de captura de video.

### Retail Analytics

El retail analytics abarca el conjunto de técnicas y herramientas utilizadas para analizar datos del comercio minorista con el objetivo de optimizar operaciones y maximizar ventas. Tradicionalmente, el análisis se ha centrado en datos transaccionales provenientes de sistemas POS, complementados con encuestas de satisfacción y estudios de mercado periódicos (Grewal et al., 2017).

La evolución hacia el in-store analytics busca capturar el comportamiento del consumidor antes y durante el proceso de compra. Las métricas clave incluyen: tasa de conversión (porcentaje de visitantes que realizan una compra), dwell time (tiempo de permanencia en una zona), engagement rate (nivel de interacción con un área o producto), customer journey (recorrido dentro del establecimiento) y revenue per visitor (ingreso promedio por visitante) (Shankar et al., 2021).

Estas métricas, establecidas y ampliamente utilizadas en el comercio electrónico, tienen equivalentes directos en el retail físico cuando se dispone de la tecnología de captura adecuada. La tasa de rebote web equivale al pass-through rate de una zona, el tiempo en página equivale al dwell time, y el embudo de conversión web equivale al recorrido zona por zona del cliente dentro de la tienda.

### Arquitectura de Software Multi-Tenant

La arquitectura multi-tenant permite que múltiples organizaciones (tenants) compartan una misma instancia de la aplicación manteniendo sus datos completamente aislados. Este modelo es fundamental en aplicaciones SaaS (Software as a Service) donde se busca eficiencia operativa sin comprometer la seguridad ni la privacidad de cada organización (Bezemer & Zaidman, 2010).

En el contexto de bases de datos relacionales, la seguridad a nivel de fila (Row Level Security, RLS) implementa el aislamiento de datos mediante políticas que filtran automáticamente las filas visibles para cada usuario en función de su organización. PostgreSQL ofrece soporte nativo para RLS, permitiendo definir políticas declarativas que se aplican de forma transparente a todas las consultas (PostgreSQL Global Development Group, 2024).

### Metodologías Ágiles: Scrum

Scrum es un marco de trabajo ágil para el desarrollo de productos complejos, definido por Schwaber y Sutherland (2020) en la Guía de Scrum. Se estructura en ciclos iterativos denominados sprints, típicamente de dos a cuatro semanas de duración, al final de los cuales se produce un incremento de producto potencialmente entregable.

Los roles principales en Scrum son: el Product Owner, responsable de maximizar el valor del producto y gestionar el backlog; el Scrum Master, encargado de facilitar el proceso y eliminar impedimentos; y el equipo de desarrollo, que ejecuta el trabajo técnico. Los artefactos incluyen el Product Backlog (lista priorizada de requerimientos), el Sprint Backlog (subconjunto seleccionado para el sprint actual) y el Incremento (resultado del sprint). Los eventos ceremoniales incluyen la planificación del sprint, el daily standup, la revisión del sprint y la retrospectiva (Schwaber & Sutherland, 2020).

Para el presente proyecto, Scrum se adopta como marco metodológico dado que permite la entrega incremental de funcionalidades —alineada con las fases de desarrollo definidas—, facilita la adaptación a cambios de requerimientos durante el proceso, y promueve la validación temprana del producto con usuarios finales.

---

## Diseño Metodológico

### Metodología de desarrollo

El desarrollo del proyecto se estructura bajo el marco de trabajo Scrum, organizando el trabajo en sprints de dos semanas de duración. Cada sprint produce un incremento funcional del sistema que es evaluado y validado antes de avanzar al siguiente.

El Product Backlog se organizó a partir de los módulos funcionales identificados en los objetivos específicos, priorizados según su valor para el negocio y sus dependencias técnicas. Las historias de usuario se formulan desde la perspectiva de los tres roles principales de usuario del sistema: el gerente de tienda (decisiones operativas), el gerente de categoría (decisiones comerciales) y el director comercial (decisiones estratégicas).

La planificación general del proyecto se divide en cuatro fases principales, alineadas con las cuatro entregas del Trabajo Final de Graduación:

- **Fase 1 (Entregas 1-2):** Fundación del sistema — arquitectura, modelos de datos, pipeline de visión base (detección, tracking, conteo, heatmap), dashboard base.
- **Fase 2 (Entrega 2-3):** Módulos de análisis avanzado — zonas y dwell time, customer journey, queue analytics, efectividad de promos.
- **Fase 3 (Entrega 3-4):** Inteligencia y prescripción — motor de insights, predicciones, correlaciones con factores externos, benchmarking.
- **Fase 4 (Entrega 4):** Integración, piloto en local modelo, validación y documentación final.

### Herramientas técnicas

**Pipeline de visión (Edge Device):**

- Lenguaje: Python 3.10+
- Detección de objetos: YOLOv8 (librería Ultralytics)
- Seguimiento multi-objeto: ByteTrack (integrado en Ultralytics)
- Procesamiento de video: OpenCV 4.x
- Comunicación HTTP asíncrona: httpx
- Buffer offline: SQLite3
- Streaming de video: WebSockets
- Monitoreo de hardware: psutil

**Backend:**

- Framework web: Next.js 14 (App Router, API Routes, Server-Side Rendering)
- Base de datos: Supabase (PostgreSQL con Auth, RLS y Realtime)
- Validación de datos: Zod
- Despliegue: Vercel (frontend y API serverless)

**Frontend (Dashboard):**

- Librería de UI: React 18
- Framework CSS: Tailwind CSS 3.4
- Componentes: Shadcn/ui (basado en Radix UI)
- Gráficos: Recharts
- Gestión de estado: Zustand
- Consulta de datos: TanStack React Query
- Manejo de fechas: date-fns

**Herramientas de desarrollo y gestión:**

- Control de versiones: Git / GitHub
- Gestión de proyecto: tablero Kanban en GitHub Projects
- Modelado de datos: dbdiagram.io
- Diagramas de arquitectura: draw.io / Excalidraw
- Documentación: Markdown

### Técnicas de recopilación de datos

Para el relevamiento de requerimientos y la validación del sistema se utilizan las siguientes técnicas:

**Observación de campo.** Visitas a establecimientos de grandes superficies para documentar la operatoria actual, los procesos de gestión de tráfico, reposición y colas, y las carencias informativas que los gerentes enfrentan en su operación diaria.

**Entrevistas semi-estructuradas.** Conversaciones guiadas con perfiles relevantes del sector retail (gerentes de tienda, jefes de sección, repositores, cajeros) para comprender los procesos de toma de decisión actuales y las necesidades de información insatisfechas.

**Análisis documental.** Revisión de reportes de la industria del retail analytics, papers académicos sobre detección y seguimiento de personas, y documentación técnica de las herramientas utilizadas.

**Benchmarking.** Análisis comparativo de soluciones existentes en el mercado (RetailNext, V-Count, Sensormatic) para identificar funcionalidades estándar, diferenciales y oportunidades de mejora.

**Pruebas con usuarios.** Durante la fase de validación, se realizarán pruebas de usabilidad del dashboard con usuarios representativos de los tres roles definidos, aplicando el cuestionario SUS (System Usability Scale) para cuantificar la usabilidad percibida.

### Diagrama de Gantt

El siguiente diagrama presenta la planificación temporal de las actividades distribuidas en los 6 meses del proyecto, alineadas con las 4 entregas del TFG.

```
MES 1          MES 2          MES 3          MES 4          MES 5          MES 6
|──────────────|──────────────|──────────────|──────────────|──────────────|──────────────|
|                                                                                         |
|  ENTREGA 1   |              | ENTREGA 2    |              | ENTREGA 3    | ENTREGA 4    |
|  ▼           |              | ▼            |              | ▼            | ▼            |
|                                                                                         |
| ████████████ |              |              |              |              |              |
| Relevamiento y documentación|              |              |              |              |
| Marco teórico, metodología  |              |              |              |              |
|                                                                                         |
|    ████████████████████████ |              |              |              |              |
|    Diseño de arquitectura y modelo de datos|              |              |              |
|                                                                                         |
|              | █████████████████████████████|              |              |              |
|              | Pipeline de visión: detección + tracking + conteo + heatmap              |
|                                                                                         |
|              | ████████████ |              |              |              |              |
|              | Backend: DB + API ingesta + Auth                         |              |
|                                                                                         |
|              |    ██████████████████████████|              |              |              |
|              |    Dashboard base: layout, overview, tráfico, heatmap    |              |
|                                                                                         |
|              |              | █████████████████████████████|              |              |
|              |              | Zonas, dwell time, zone editor            |              |
|                                                                                         |
|              |              |    ██████████████████████████|              |              |
|              |              |    Customer journey + Sankey diagram       |              |
|                                                                                         |
|              |              |              | █████████████████████████████|              |
|              |              |              | Queue analytics + alertas    |              |
|                                                                                         |
|              |              |              | ████████████ |              |              |
|              |              |              | Efectividad de promos        |              |
|                                                                                         |
|              |              |              |    ██████████████████████████|              |
|              |              |              |    Motor de insights y predicciones         |
|                                                                                         |
|              |              |              |              | █████████████████████████████|
|              |              |              |              | Correlaciones externas       |
|                                                                                         |
|              |              |              |              | ████████████ |              |
|              |              |              |              | Benchmarking multi-sucursal  |
|                                                                                         |
|              |              |              |              |    ██████████████████████████|
|              |              |              |              |    Piloto en local modelo     |
|                                                                                         |
|              |              |              |              |              | ██████████████|
|              |              |              |              |              | Validación    |
|              |              |              |              |              | Documentación |
|              |              |              |              |              | Entrega final |
|──────────────|──────────────|──────────────|──────────────|──────────────|──────────────|
```

**Resumen de actividades por entrega:**

| Entrega | Mes | Actividades principales |
|---------|-----|------------------------|
| Entrega 1 | Mes 1 | Relevamiento, marco teórico, diseño metodológico, análisis de procesos, documento de especificación |
| Entrega 2 | Mes 2-3 | Pipeline de visión (detección + tracking + conteo + heatmap), backend (DB + API), dashboard base, zonas y dwell time |
| Entrega 3 | Mes 3-5 | Customer journey, queue analytics, promos, insights, predicciones, correlaciones externas |
| Entrega 4 | Mes 5-6 | Benchmarking, piloto, validación, documentación final |

---

## Relevamiento

### Relevamiento Estructural

El presente proyecto se desarrolla como una solución genérica aplicable a organizaciones del tipo gran superficie comercial (supermercados, hipermercados, tiendas departamentales). Para el relevamiento se toma como modelo una organización tipo con las siguientes características:

**Tipo de organización:** Cadena de supermercados con múltiples sucursales.

**Estructura física:** Cada sucursal opera en un local de entre 2.000 y 10.000 metros cuadrados, con áreas diferenciadas: acceso principal, zona de cajas, pasillos con góndolas organizadas por categoría (almacén, bebidas, lácteos, frescos, limpieza, perfumería, electrónica, etc.), zonas de productos frescos (carnicería, panadería, verdulería), islas promocionales, y depósito trasero.

**Sucursales:** La organización modelo cuenta con entre 5 y 50 sucursales distribuidas geográficamente, cada una con su propia dotación de personal y autonomía operativa parcial, pero con dirección comercial y estratégica centralizada.

**Infraestructura tecnológica existente:**
- Sistema de punto de venta (POS) que registra transacciones, productos vendidos y montos.
- Sistema de gestión de inventario (ERP) para control de stock y reposición.
- Red de cámaras de seguridad (CCTV) con entre 8 y 30 cámaras por sucursal, conectadas a un DVR/NVR local.
- Conectividad a internet en cada sucursal (fibra óptica o enlace dedicado).
- Red local (LAN) cableada y Wi-Fi.

**Relevancia para el proyecto:** El sistema RetailVision se instala como una capa adicional sobre la infraestructura existente. Utiliza las cámaras de seguridad ya instaladas (o agrega cámaras IP dedicadas donde se requiera mayor resolución), conectándolas a un edge device (mini PC) que se instala en el rack de comunicaciones de la sucursal. Este dispositivo se conecta a la red local existente y requiere acceso a internet para comunicarse con el backend en la nube. No interfiere con los sistemas existentes (POS, ERP, CCTV) y puede integrarse con el POS para cruzar datos de tráfico con datos transaccionales.

**Local modelo para validación:** Se dispondrá de un local comercial donde se instalará el sistema completo para validación. Este local contará con al menos 2 cámaras conectadas al edge device, cubriendo la entrada principal y una sección de góndolas, lo que permitirá validar los módulos de conteo, heatmap, zonas, dwell time y recorridos.

### Relevamiento Funcional

#### Organigrama de la Organización Modelo

```
                    ┌─────────────────────┐
                    │   Director General   │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
┌──────────▼──────────┐ ┌─────▼──────────┐ ┌──────▼─────────┐
│ Director Comercial  │ │ Director de    │ │ Director de    │
│                     │ │ Operaciones    │ │ Tecnología     │
└──────────┬──────────┘ └─────┬──────────┘ └──────┬─────────┘
           │                  │                    │
    ┌──────▼──────┐    ┌──────▼──────┐      ┌─────▼──────┐
    │ Gerente de  │    │ Gerente de  │      │ Equipo de  │
    │ Categoría   │    │ Tienda      │      │ Sistemas   │
    │ (por área)  │    │ (por sucursal)│    │            │
    └─────────────┘    └──────┬──────┘      └────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
             ┌──────▼───┐ ┌──▼─────┐ ┌─▼──────────┐
             │ Jefe de  │ │ Jefe de│ │ Jefe de    │
             │ Sección  │ │ Cajas  │ │ Depósito   │
             └──────┬───┘ └──┬─────┘ └─┬──────────┘
                    │        │         │
             ┌──────▼───┐ ┌──▼─────┐ ┌─▼──────────┐
             │Repositores│ │Cajeros │ │Repositores │
             │Vendedores │ │        │ │de depósito │
             └──────────┘  └────────┘ └────────────┘
```

#### Roles y Funciones Involucrados en el Proyecto

**Director Comercial.** Responsable de la estrategia comercial de toda la cadena. Define políticas de pricing, promociones, layout de referencia y mix de categorías. Necesita información comparativa entre sucursales para identificar oportunidades y replicar prácticas exitosas. En el contexto de RetailVision, es el usuario del módulo de benchmarking multi-sucursal y de las predicciones estratégicas.

**Gerente de Categoría.** Responsable del rendimiento comercial de una o más categorías de producto en todas las sucursales. Decide la ubicación de productos en góndola, diseña las promociones y evalúa su efectividad. En el contexto de RetailVision, es el usuario principal de los módulos de efectividad promocional, análisis por zona, dwell time y recorridos de clientes.

**Gerente de Tienda.** Responsable de la operación diaria de una sucursal. Gestiona la dotación de personal, la apertura de cajas, la reposición de productos y la atención al cliente. En el contexto de RetailVision, es el usuario principal de los módulos de ocupación en tiempo real, gestión de colas, alertas de estantes vacíos y predicciones de tráfico para la planificación de turnos.

**Jefe de Sección.** Responsable de un área específica dentro de la sucursal (por ejemplo, lácteos, limpieza, electrónica). Supervisa la reposición, la presentación de productos y la atención al cliente en su sección. En el contexto de RetailVision, consume información de tráfico y engagement específica de su sección.

**Jefe de Cajas.** Responsable de coordinar la apertura y cierre de cajas y gestionar la dotación de cajeros. En el contexto de RetailVision, es el usuario principal del módulo de gestión de colas y alertas de tiempos de espera.

**Equipo de Sistemas / Tecnología.** Responsable de la infraestructura informática, redes y sistemas. En el contexto de RetailVision, es responsable de la instalación del edge device, la configuración de las cámaras, la conectividad y el mantenimiento técnico del sistema.

#### Procesos Funcionales Relevados

**Proceso 1: Gestión de tráfico y ocupación**

- Proceso: Monitoreo de ocupación del local
- Roles: Gerente de Tienda, Personal de seguridad
- Pasos actuales:
  1. El personal de seguridad o el gerente realizan estimaciones visuales del nivel de ocupación del local.
  2. En caso de percibir alta ocupación, se comunica verbalmente al equipo para estar atentos.
  3. No existe registro histórico ni medición objetiva del tráfico.
- Problemática: La estimación es subjetiva, no se registra, y no permite planificación.

**Proceso 2: Apertura y cierre de cajas**

- Proceso: Gestión de líneas de cajas
- Roles: Jefe de Cajas, Gerente de Tienda, Cajeros
- Pasos actuales:
  1. El jefe de cajas observa la longitud de las filas de forma visual.
  2. Cuando las filas se perciben largas, solicita la apertura de cajas adicionales.
  3. La decisión se toma de forma reactiva, cuando el problema ya es visible.
  4. Al disminuir el flujo, se cierran cajas según la percepción del jefe de cajas.
- Problemática: Decisión reactiva que genera tiempos de espera excesivos antes de la intervención.

**Proceso 3: Reposición de productos en góndola**

- Proceso: Reposición y control de estantes
- Roles: Jefe de Sección, Repositores, Jefe de Depósito
- Pasos actuales:
  1. Los repositores recorren las góndolas de su sección de forma periódica (cada 1-2 horas).
  2. Identifican visualmente los huecos en los estantes.
  3. Consultan el stock disponible en depósito (sistema ERP o revisión física).
  4. Reponen los productos faltantes.
  5. Si no hay stock en depósito, informan al jefe de sección.
- Problemática: El tiempo entre que un producto se agota y se detecta el vacío puede ser de varias horas, generando ventas perdidas.

**Proceso 4: Evaluación de efectividad promocional**

- Proceso: Medición de impacto de promociones
- Roles: Gerente de Categoría, Gerente de Tienda
- Pasos actuales:
  1. El gerente de categoría diseña una promoción y define su ubicación en la tienda.
  2. Se implementa la exhibición promocional (isla, cabecera de góndola, etc.).
  3. Al finalizar el período promocional, se analizan las ventas del producto promovido comparando con el período anterior.
  4. No se mide el tráfico en la zona de la promoción ni la cantidad de personas que interactuaron con ella.
- Problemática: La medición se limita a ventas, sin visibilidad sobre cuántas personas vieron la promoción pero no compraron.

**Proceso 5: Planificación de dotación de personal**

- Proceso: Asignación de turnos y personal
- Roles: Gerente de Tienda, Jefes de Sección
- Pasos actuales:
  1. El gerente de tienda define los turnos basándose en la experiencia y patrones históricos informales.
  2. Se asigna más personal los días que se perciben como de mayor afluencia (fines de semana, feriados).
  3. No se utiliza data cuantitativa para la planificación.
- Problemática: La dotación puede resultar excesiva en horarios de baja afluencia o insuficiente en picos no anticipados.

**Proceso 6: Análisis de layout y distribución**

- Proceso: Evaluación y modificación del layout de la tienda
- Roles: Director Comercial, Gerente de Categoría, Gerente de Tienda
- Pasos actuales:
  1. El director comercial establece lineamientos generales de layout para la cadena.
  2. El gerente de categoría propone cambios de ubicación de productos o secciones.
  3. Se implementa el cambio y se evalúan las ventas semanas después.
  4. No se mide el impacto del cambio en el recorrido de los clientes ni en el tráfico por zona.
- Problemática: Sin datos de recorridos, no se puede medir objetivamente si un cambio de layout mejoró o empeoró la navegación.

### Relevamiento de Documentación

Los documentos que intervienen en los procesos relevados se detallan en el Anexo A. A continuación se mencionan los principales:

1. **Reporte de ventas diario (POS):** Generado automáticamente por el sistema de punto de venta. Contiene: fecha, sucursal, total de transacciones, monto total, desglose por categoría, ticket promedio.

2. **Planilla de turnos:** Documento (generalmente planilla de cálculo) donde el gerente de tienda asigna los turnos del personal. Contiene: fecha, nombre del empleado, rol, horario de entrada, horario de salida, sector asignado.

3. **Orden de reposición:** Documento generado cuando se detecta faltante en góndola. Contiene: fecha, producto, código SKU, cantidad faltante, ubicación en góndola, prioridad, estado (pendiente/completado).

4. **Brief de promoción:** Documento que describe una campaña promocional. Contiene: nombre de la campaña, producto/categoría, tipo de exhibición, fecha de inicio, fecha de fin, ubicación en la tienda, descuento/oferta, objetivo de ventas.

5. **Reporte de evaluación promocional:** Documento posterior a una campaña. Contiene: nombre de la campaña, ventas durante la campaña, ventas en período equivalente anterior, variación porcentual, ROI estimado, observaciones del gerente.

6. **Informe de incidencias de caja:** Registro de eventos en la línea de cajas. Contiene: fecha, hora, cantidad de cajas abiertas, longitud máxima de cola observada, cajeros disponibles, observaciones.

Los formatos detallados de cada documento, incluyendo los campos de datos que se esperan capturar, se incluyen en el Anexo A al final del documento.

---

## Proceso de Negocio

El siguiente diagrama BPM (Business Process Model) representa el proceso genérico integrado denominado **"Análisis de Comportamiento del Consumidor y Optimización Operativa en Gran Superficie"**, que articula todos los procesos funcionales relevados en un flujo unificado.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│            PROCESO: Análisis de Comportamiento del Consumidor              │
│                    y Optimización Operativa en Gran Superficie              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────┐
│  INICIO │
└────┬────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 1. INSTALACIÓN Y CONFIGURACIÓN     │  Rol: Equipo de Sistemas
│                                     │
│ • Instalar edge device y cámaras   │
│ • Configurar conexión al backend   │
│ • Definir zonas en el editor       │
│ • Calibrar líneas de conteo        │
│ • Configurar reglas de alertas     │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 2. CAPTURA Y PROCESAMIENTO (EDGE)  │  Rol: Sistema automático
│                                     │
│ • Capturar frames de video         │
│ • Detectar personas (YOLOv8)       │
│ • Rastrear personas (ByteTrack)    │
│ • Contar entradas/salidas          │
│ • Acumular heatmap                 │
│ • Registrar zonas y dwell time     │
│ • Mapear recorridos (journeys)     │
│ • Detectar colas en cajas          │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 3. INGESTA DE DATOS AL BACKEND     │  Rol: Sistema automático
│                                     │
│ • Enviar conteos (cada 5 min)      │
│ • Enviar heatmaps (cada 1 hora)    │
│ • Enviar datos de zonas (5 min)    │
│ • Enviar journeys completados      │
│ • Enviar snapshots de colas        │
│ • Enviar heartbeat del device      │
│ • Bufferear si está offline        │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 4. ANÁLISIS Y GENERACIÓN DE        │  Rol: Sistema automático
│    INSIGHTS                         │
│                                     │
│ • Calcular resúmenes diarios       │
│ • Generar rankings de zonas        │
│ • Detectar tendencias y anomalías  │
│ • Comparar con períodos anteriores │
│ • Cruzar con datos POS             │
│ • Correlacionar con factores ext.  │
│ • Generar predicciones de tráfico  │
│ • Evaluar efectividad de promos    │
│ • Producir insights prescriptivos  │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 5. VISUALIZACIÓN Y ALERTAS         │  Rol: Dashboard (automático)
│                                     │
│ • Actualizar dashboard en tiempo   │
│   real (polling cada 60 seg.)      │
│ • Mostrar KPIs por rol             │
│ • Disparar alertas configuradas    │
│   (cola larga, estante vacío,      │
│    dispositivo offline, aforo)     │
│ • Notificar al rol correspondiente │
└────────────────┬────────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │  ¿Se requiere  │
        │    acción?     │
        └───┬────────┬───┘
         Sí │        │ No
            ▼        ▼
┌────────────────┐  ┌──────────────────────┐
│ 6. TOMA DE     │  │ Continuar monitoreo  │──────┐
│ DECISIÓN       │  │ (volver al paso 2)   │      │
│                │  └──────────────────────┘      │
│ Rol: Gerente   │                                │
│ (según tipo)   │                                │
│                │                                │
│ • Abrir cajas  │                                │
│ • Reasignar    │                                │
│   personal     │                                │
│ • Reponer      │                                │
│   producto     │                                │
│ • Modificar    │                                │
│   layout       │                                │
│ • Ajustar      │                                │
│   promoción    │                                │
└───────┬────────┘                                │
        │                                         │
        ▼                                         │
┌─────────────────────────────────────┐           │
│ 7. EJECUCIÓN DE LA ACCIÓN          │           │
│                                     │           │
│ Rol: Personal operativo             │           │
│ (cajeros, repositores, vendedores)  │           │
│                                     │           │
│ • Ejecutar la decisión tomada      │           │
│ • Registrar la acción en el sistema│           │
└────────────────┬────────────────────┘           │
                 │                                 │
                 ▼                                 │
┌─────────────────────────────────────┐           │
│ 8. MEDICIÓN DE IMPACTO             │           │
│                                     │           │
│ Rol: Sistema + Gerente              │           │
│                                     │           │
│ • El sistema mide automáticamente  │           │
│   las métricas post-acción         │           │
│ • Compara antes vs después         │           │
│ • Genera insight sobre efectividad │           │
│ • Alimenta el modelo predictivo    │           │
│   para futuras recomendaciones     │           │
└────────────────┬────────────────────┘           │
                 │                                 │
                 ▼                                 │
        ┌────────────────┐                        │
        │  Volver al     │◄───────────────────────┘
        │  monitoreo     │
        │  continuo      │
        │  (paso 2)      │
        └────────────────┘

          ▼ (El proceso es continuo, opera 24/7 durante el horario
             comercial del establecimiento)
```

**Descripción del proceso:**

El proceso opera de manera continua durante el horario comercial del establecimiento. Una vez completada la instalación y configuración inicial (paso 1), el sistema entra en un ciclo permanente de captura, análisis, visualización y acción.

Los pasos 2 y 3 operan de forma automática y continua, sin intervención humana. El edge device captura y procesa video en tiempo real, enviando métricas agregadas al backend de forma periódica. El paso 4 también es automático: el backend analiza los datos recibidos, los cruza con datos históricos y factores externos, y genera insights y predicciones.

El paso 5 constituye la interfaz entre el sistema y los usuarios humanos. El dashboard se actualiza automáticamente y las alertas se disparan cuando se cumplen las condiciones configuradas. Aquí es donde los roles humanos interactúan con el sistema.

Los pasos 6, 7 y 8 involucran intervención humana: el gerente correspondiente evalúa la información, toma una decisión, el personal operativo la ejecuta, y el sistema mide automáticamente el impacto de la acción, cerrando el ciclo de mejora continua.

Este proceso integra los seis procesos funcionales relevados:
- La gestión de tráfico y ocupación se aborda en los pasos 2, 3 y 5.
- La apertura y cierre de cajas se aborda en los pasos 5, 6 y 7.
- La reposición de productos se aborda en los pasos 5, 6 y 7.
- La evaluación de efectividad promocional se aborda en los pasos 4 y 8.
- La planificación de dotación de personal se aborda en los pasos 4 y 6.
- El análisis de layout y distribución se aborda en los pasos 4, 6 y 8.

---

## Referencias

Bewley, A., Ge, Z., Ott, L., Ramos, F., & Upcroft, B. (2016). Simple online and realtime tracking. *Proceedings of the IEEE International Conference on Image Processing (ICIP)*, 3464-3468. https://doi.org/10.1109/ICIP.2016.7533003

Bezemer, C. P., & Zaidman, A. (2010). Multi-tenant SaaS applications: Maintenance dream or nightmare? *Proceedings of the Joint ERCIM Workshop on Software Evolution and International Workshop on Principles of Software Evolution*, 88-92. https://doi.org/10.1145/1862372.1862393

Girshick, R., Donahue, J., Darrell, T., & Malik, J. (2014). Rich feature hierarchies for accurate object detection and semantic segmentation. *Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR)*, 580-587. https://doi.org/10.1109/CVPR.2014.81

Grand View Research. (2023). *Retail analytics market size, share & trends analysis report*. Grand View Research, Inc.

Grewal, D., Roggeveen, A. L., & Nordfält, J. (2017). The future of retailing. *Journal of Retailing*, 93(1), 1-6. https://doi.org/10.1016/j.jretai.2016.12.008

Gruen, T. W., Corsten, D. S., & Bharadwaj, S. (2002). *Retail out-of-stocks: A worldwide examination of extent, causes and consumer responses*. Grocery Manufacturers of America.

Katz, K. L., Larson, B. M., & Larson, R. C. (1991). Prescription for the waiting-in-line blues: Entertain, enlighten, and engage. *MIT Sloan Management Review*, 32(2), 44-53.

Liu, W., Anguelov, D., Erhan, D., Szegedy, C., Reed, S., Fu, C. Y., & Berg, A. C. (2016). SSD: Single shot multibox detector. *Proceedings of the European Conference on Computer Vision (ECCV)*, 21-37. https://doi.org/10.1007/978-3-319-46448-0_2

Luo, W., Xing, J., Milan, A., Zhang, X., Liu, W., & Kim, T. K. (2021). Multiple object tracking: A literature review. *Artificial Intelligence*, 293, 103448. https://doi.org/10.1016/j.artint.2020.103448

Mautz, R. (2012). *Indoor positioning technologies* [Doctoral dissertation, ETH Zurich]. ETH Zurich Research Collection. https://doi.org/10.3929/ethz-a-007313554

PostgreSQL Global Development Group. (2024). *PostgreSQL 16 documentation: Row security policies*. https://www.postgresql.org/docs/16/ddl-rowsecurity.html

Redmon, J., Divvala, S., Girshick, R., & Farhadi, A. (2016). You only look once: Unified, real-time object detection. *Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR)*, 779-788. https://doi.org/10.1109/CVPR.2016.91

Satyanarayanan, M. (2017). The emergence of edge computing. *Computer*, 50(1), 30-39. https://doi.org/10.1109/MC.2017.9

Schwaber, K., & Sutherland, J. (2020). *The Scrum Guide: The definitive guide to Scrum: The rules of the game*. Scrum.org.

Shankar, V., Kalyanam, K., Setia, P., Golber, A., Mehta, S., Aella, J., & Vandenbosch, M. (2021). How technology is changing retail. *Journal of Retailing*, 97(1), 13-27. https://doi.org/10.1016/j.jretai.2020.10.006

Shi, W., Cao, J., Zhang, Q., Li, Y., & Xu, L. (2016). Edge computing: Vision and challenges. *IEEE Internet of Things Journal*, 3(5), 637-646. https://doi.org/10.1109/JIOT.2016.2579198

Szeliski, R. (2022). *Computer vision: Algorithms and applications* (2nd ed.). Springer. https://doi.org/10.1007/978-3-030-34372-9

Ultralytics. (2023). *YOLOv8 documentation*. Ultralytics. https://docs.ultralytics.com/

Verhoef, P. C., Kannan, P. K., & Inman, J. J. (2015). From multi-channel retailing to omni-channel retailing: Introduction to the special issue on multi-channel retailing. *Journal of Retailing*, 91(2), 174-181. https://doi.org/10.1016/j.jretai.2015.02.005

Wojke, N., Bewley, A., & Paulus, D. (2017). Simple online and realtime tracking with a deep association metric. *Proceedings of the IEEE International Conference on Image Processing (ICIP)*, 3645-3649. https://doi.org/10.1109/ICIP.2017.8296962

Zhang, Y., Sun, P., Jiang, Y., Yu, D., Weng, F., Yuan, Z., Luo, P., Liu, W., & Wang, X. (2022). ByteTrack: Multi-object tracking by associating every detection box. *Proceedings of the European Conference on Computer Vision (ECCV)*, 1-21. https://doi.org/10.1007/978-3-031-20047-2_1

---

## Anexo A: Documentación Relevada

### A.1 Reporte de Ventas Diario (POS)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Fecha | Fecha | Fecha del reporte |
| Sucursal | Texto | Nombre/código de la sucursal |
| Total transacciones | Entero | Cantidad de tickets emitidos |
| Monto total | Decimal | Suma total de ventas en pesos |
| Ticket promedio | Decimal | Monto total / Total transacciones |
| Desglose por categoría | Tabla | Categoría, cantidad de items, monto subtotal |
| Formas de pago | Tabla | Efectivo, débito, crédito, otros: monto y porcentaje |
| Horario pico | Hora | Franja horaria con mayor cantidad de transacciones |

### A.2 Planilla de Turnos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Fecha | Fecha | Fecha del turno |
| Empleado | Texto | Nombre del empleado |
| Legajo | Texto | Número de legajo |
| Rol | Texto | Cajero, repositor, vendedor, jefe, etc. |
| Sector asignado | Texto | Sección o área de trabajo |
| Hora entrada | Hora | Inicio del turno |
| Hora salida | Hora | Fin del turno |
| Observaciones | Texto | Notas adicionales |

### A.3 Orden de Reposición

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Fecha/hora | Fecha y hora | Momento de detección del faltante |
| Producto | Texto | Nombre del producto |
| Código SKU | Texto | Código interno del producto |
| Categoría | Texto | Categoría del producto |
| Ubicación góndola | Texto | Pasillo, estante, posición |
| Cantidad faltante | Entero | Unidades faltantes estimadas |
| Stock en depósito | Entero | Unidades disponibles en depósito |
| Prioridad | Texto | Alta, media, baja |
| Estado | Texto | Pendiente, en proceso, completado |
| Repositor asignado | Texto | Nombre del repositor |
| Hora de reposición | Hora | Momento en que se completó |

### A.4 Brief de Promoción

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Nombre de campaña | Texto | Identificador de la promoción |
| Producto/categoría | Texto | Producto o categoría promovida |
| Tipo de exhibición | Texto | Isla, cabecera, banner, puntero, etc. |
| Ubicación en tienda | Texto | Zona/pasillo donde se instala |
| Fecha inicio | Fecha | Inicio de la campaña |
| Fecha fin | Fecha | Fin de la campaña |
| Descuento/oferta | Texto | Descripción de la oferta (2x1, 30% off, etc.) |
| Costo de exhibición | Decimal | Costo de instalación y materiales |
| Objetivo de ventas | Decimal | Meta de ventas esperada |
| Responsable | Texto | Gerente de categoría asignado |

### A.5 Reporte de Evaluación Promocional

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Nombre de campaña | Texto | Identificador de la promoción |
| Ventas durante campaña | Decimal | Monto vendido del producto promovido |
| Ventas período anterior | Decimal | Monto vendido en período equivalente previo |
| Variación porcentual | Porcentaje | Incremento o decremento en ventas |
| Unidades vendidas | Entero | Cantidad de unidades del producto |
| ROI estimado | Porcentaje | (Incremento de ventas - costo) / costo × 100 |
| Tráfico en zona promo | Entero | Personas que pasaron por la zona (si disponible) |
| Interacciones | Entero | Personas que se detuvieron (si disponible) |
| Observaciones | Texto | Comentarios del gerente de categoría |

### A.6 Informe de Incidencias de Caja

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Fecha | Fecha | Fecha del informe |
| Franja horaria | Hora | Período analizado |
| Cajas habilitadas | Entero | Total de cajas disponibles |
| Cajas abiertas (promedio) | Entero | Cajas operativas en promedio |
| Cola máxima observada | Entero | Mayor longitud de fila registrada |
| Tiempo espera estimado | Minutos | Tiempo promedio estimado en cola |
| Incidencias | Texto | Descripción de eventos relevantes |
| Acciones tomadas | Texto | Medidas correctivas aplicadas |
