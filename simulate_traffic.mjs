// ============================================================
//  RetailVision - Simulador de tráfico en vivo
//  Inyecta entradas/salidas al backend como si la cámara
//  estuviera detectando gente. Ideal para demo/screenshots
//  sin necesidad de la webcam.
//
//  Uso:   DEVICE_KEY=<clave del dispositivo> node simulate_traffic.mjs
//         (la clave se ve al dar de alta o regenerar el dispositivo)
//  Frená: Ctrl+C
// ============================================================

const BACKEND = process.env.BACKEND_URL || "http://localhost:3000";
const DEVICE_KEY = process.env.DEVICE_KEY;
if (!DEVICE_KEY) {
  console.error("Falta DEVICE_KEY: la clave del dispositivo que simula la cámara.");
  process.exit(1);
}
const INTERVAL_MS = 3500; // cada cuánto pushea

let inside = 3; // ocupación inicial

// Curva de actividad según la hora del día (más gente al mediodía y a la tarde)
function activityFactor() {
  const h = new Date().getHours();
  if (h >= 12 && h <= 13) return 1.0;   // pico mediodía
  if (h >= 18 && h <= 20) return 1.0;   // pico tarde-noche
  if (h >= 10 && h <= 21) return 0.6;   // horario comercial normal
  return 0.2;                            // fuera de horario
}

async function tick() {
  const f = activityFactor();
  const entries = Math.random() < 0.7 * f ? Math.floor(Math.random() * 4) : 0;
  const exits = Math.random() < 0.5 ? Math.floor(Math.random() * Math.min(3, inside + 1)) : 0;
  inside = Math.max(0, inside + entries - exits);

  try {
    const res = await fetch(`${BACKEND}/api/ingest/counts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Key": DEVICE_KEY },
      body: JSON.stringify({
        entries,
        exits,
        current_inside: inside,
        period_seconds: Math.round(INTERVAL_MS / 1000),
        timestamp: new Date().toISOString(),
      }),
    });
    const hora = new Date().toLocaleTimeString("es");
    const estado = res.status === 200 ? "OK" : `HTTP ${res.status}`;
    console.log(`[${hora}]  +${entries} entran  -${exits} salen  |  dentro: ${inside}  (${estado})`);
  } catch (e) {
    console.log("  [!] No se pudo conectar al backend. ¿Está levantado en " + BACKEND + "?  ", e.message);
  }
}

console.log("============================================================");
console.log("  RetailVision - Simulador de tráfico en vivo");
console.log("  Backend: " + BACKEND);
console.log("  Pusheando cada " + (INTERVAL_MS / 1000) + "s. Ctrl+C para frenar.");
console.log("============================================================");
tick();
setInterval(tick, INTERVAL_MS);
