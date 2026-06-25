# 🎓 Guion de Demo — Defensa TFG RetailVision

> Recorrido cronometrado para la presentación final. Duración objetivo: **8–10 minutos** de demo.
> Idea: contar la historia **Problema → Solución → Evidencia en vivo → Cierre**.

---

## ✅ Checklist ANTES de presentar (hacelo 30 min antes)

- [ ] **Supabase activo**: abrí el dashboard de Supabase y confirmá que el proyecto NO está pausado (si dice "Paused", restauralo — tarda ~2 min). Esto es lo que más falla.
- [ ] **Refrescar fechas**: corré `refresh_demo_dates.sql` en el SQL Editor (deja todos los datos como si fueran de hoy).
- [ ] **Levantar el server**: `npm run dev -- -p 3008` y abrí `http://localhost:3008` para confirmar que carga.
- [ ] **Probar el login**: `admin@retailvision.com` / `RetailVision2026!`.
- [ ] **Webcam lista**: `edge/.env` con `CAMERA_SOURCE=0` y `SHOW_DISPLAY=true`. Probá que abre la ventana.
- [ ] **Video de respaldo**: tené grabada una corrida de la webcam detectando, por si falla en vivo.
- [ ] **Pestañas abiertas**: dashboard en una, y la terminal del edge lista en otra.

---

## 🎬 PARTE 0 — Apertura: el problema (1 min)

> *"El comercio electrónico sabe todo de sus clientes: cuántos entran, qué miran, qué abandonan. El retail físico, en cambio, solo sabe lo que el cliente compró —por el ticket—, pero no qué hizo antes: por dónde caminó, dónde se frenó, cuánto esperó en la caja. Esa es la brecha que ataca RetailVision: darle al local físico la misma inteligencia que tiene el e-commerce, usando las cámaras que el local **ya tiene**, sin invadir la privacidad."*

**Clave a mencionar:** procesamiento local (edge), no se sube video a la nube → privacidad.

---

## 🎬 PARTE 1 — El dashboard (3 min)

**1. Login** → mostrás la pantalla, entrás.
> *"Plataforma multi-tenant: cada cadena ve solo sus datos, con seguridad a nivel de base de datos (RLS)."*

**2. Overview de la sucursal** → las métricas en vivo.
> *"Acá el gerente ve la ocupación actual, el tráfico del día, la conversión, el dwell time promedio. Todo en tiempo real."*

**3. Recorrido por los módulos** (mostrá 3–4, no todos, para no aburrir):
- **Mapa de Calor** → *"Dónde se concentra la gente. Sirve para decidir dónde ubicar una góndola o una promoción."*
- **Recorridos (Customer Journey)** → *"El camino que hace cada cliente, de la entrada a la caja. El diagrama de flujo muestra los recorridos más comunes."*
- **Zonas y Dwell Time** → *"Cuánto tiempo pasa la gente en cada sección, y si solo pasa, mira o interactúa."*
- **Conversión** → *"Visitantes vs ventas: la métrica que el e-commerce tiene nativa y el físico no."*
- **(opcional) Colas / Predicciones / Insights** → *"El sistema no solo describe: predice el tráfico y sugiere acciones."*

---

## 🎬 PARTE 2 — El pipeline de visión EN VIVO (2–3 min) ⭐ EL MOMENTO WOW

> *"Pero nada de esto es magia ni datos cargados a mano. Esto viene de un pipeline de visión por computadora corriendo de verdad. Se los muestro."*

**1. Abrí la terminal del edge** y corré el pipeline (webcam).
**2. Aparece la ventana** con tu cara y la **caja verde de detección**.
> *"Esto es YOLOv8 detectando personas y ByteTrack siguiéndolas, corriendo localmente en el dispositivo de borde —no en la nube. La caja verde y el ID son el tracking en tiempo real."*

**3. Cruzá la línea de conteo** (movete) → mostrás cómo sube "Entradas".
> *"Cuando cruzo la línea virtual de la entrada, el sistema cuenta. Eso es lo que alimenta la ocupación del local."*

**4. Volvé al dashboard y recargá** → los números nuevos aparecen.
> *"Y acá está el cierre del círculo: la cámara detectó, el edge procesó, y el dato ya está en el dashboard. Cámara → borde → backend → tablero, todo real."*

---

## 🎬 PARTE 3 — Cierre: objetivos cumplidos (1 min)

> *"En síntesis, RetailVision cumple los objetivos que planteé: un pipeline de visión con YOLOv8 y ByteTrack en el borde; conteo por línea virtual; mapas de calor; análisis por zonas con dwell time; y un dashboard multi-tenant con indicadores accionables. Todo con una arquitectura que preserva la privacidad —no sube video—, es escalable —una cámara por proceso— y es económicamente accesible frente a las soluciones propietarias que cuestan entre 500 y 2.000 dólares por mes."*

**Diferenciadores a remarcar:** privacidad (edge, sin video a la nube) · multi-tenant · costo accesible · insights prescriptivos (no solo describe, recomienda).

---

## 🆘 Si algo falla (plan B)

| Falla | Qué hacés |
|---|---|
| El dashboard no carga / Supabase caído | Mostrás el **video de respaldo** y explicás. NUNCA improvises con la BD en vivo. |
| La webcam no abre | Cambiás a `CAMERA_SOURCE=sample_plaza.mp4` (el video de gente caminando) — funciona igual. |
| Un módulo se ve vacío | Probablemente no corriste el refresh de fechas. Seguí con otro módulo. |
| Se cuelga algo | Respirá, recargá la página. Tenés el video de respaldo. |

---

## 🎤 Preguntas que te pueden hacer (preparate)

- **"¿Cómo evita contar a la misma persona dos veces con varias cámaras?"**
  → *"El conteo de ocupación se hace solo en la cámara de la entrada, con una línea virtual. Las cámaras internas miden zonas, no cuentan ingreso. Así nunca se duplica, sin necesidad de re-identificación entre cámaras."*

- **"¿Por qué no usa reconocimiento facial?"**
  → *"Por privacidad y por la ley 25.326. Solo detecta siluetas de personas y guarda métricas agregadas, nunca identidades ni imágenes."*

- **"¿Escala a muchas cámaras/sucursales?"**
  → *"Sí: una instancia del edge por cámara, y el backend serverless (Vercel + Supabase) escala automáticamente. Agregar una sucursal es conectar un dispositivo más."*

- **"¿Qué pasa si se cae internet en el local?"**
  → *"El edge buferea los datos localmente en SQLite y los reenvía cuando vuelve la conexión. No se pierde información."*

- **"¿Precisión del conteo?"**
  → *"El objetivo del prototipo es superior al 90% en condiciones controladas. Depende del ángulo de cámara y la calibración de la línea."*
