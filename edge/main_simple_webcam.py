"""
Versión simplificada sin YOLO - solo captura de webcam y simulación de detecciones.
Para Windows ARM64 donde YOLO puede no estar disponible.
"""
import asyncio
import time
import random
from datetime import datetime
import httpx

# Intentar importar OpenCV, si falla usar modo simulación pura
try:
    import cv2
    OPENCV_AVAILABLE = True
    print("[OK] OpenCV disponible")
except ImportError:
    OPENCV_AVAILABLE = False
    print("[X] OpenCV no disponible - usando modo simulacion")

# Detectar si la GUI de OpenCV funciona (cv2.imshow)
GUI_AVAILABLE = False
if OPENCV_AVAILABLE:
    try:
        cv2.namedWindow("__test__", cv2.WINDOW_NORMAL)
        cv2.destroyWindow("__test__")
        GUI_AVAILABLE = True
    except cv2.error:
        print("[!] OpenCV GUI no disponible - corriendo en modo headless")
        print("    Para ver la camara, ejecuta: pip install opencv-contrib-python")

# Config
BACKEND_URL = "http://localhost:3000"
DEVICE_API_KEY = "test_device_key_123"
CAMERA_SOURCE = 0
COUNT_INTERVAL = 30  # 30 segundos para testing
HEATMAP_INTERVAL = 60  # 1 minuto para testing

class SimpleCounter:
    """Contador simulado de personas"""
    def __init__(self):
        self.entries = 0
        self.exits = 0
        self.current_inside = 0

    def simulate_detection(self):
        """Simula detección de personas"""
        # 30% chance de entrada
        if random.random() < 0.3:
            self.entries += 1
            self.current_inside += 1
            print(f"[+] Entrada simulada - Total dentro: {self.current_inside}")

        # 20% chance de salida (si hay alguien dentro)
        if random.random() < 0.2 and self.current_inside > 0:
            self.exits += 1
            self.current_inside -= 1
            print(f"[-] Salida simulada - Total dentro: {self.current_inside}")

    def get_counts(self):
        return {
            'entries': self.entries,
            'exits': self.exits,
            'current_inside': self.current_inside
        }

    def reset(self):
        self.entries = 0
        self.exits = 0

class SimpleHeatmap:
    """Generador de heatmap simulado"""
    def __init__(self):
        self.grid = [[0 for _ in range(20)] for _ in range(15)]

    def update(self):
        """Actualiza heatmap con actividad simulada"""
        # Simular actividad en zonas aleatorias
        for _ in range(random.randint(1, 5)):
            x = random.randint(0, 19)
            y = random.randint(0, 14)
            self.grid[y][x] += random.randint(1, 5)

    def get_normalized_data(self):
        """Retorna heatmap normalizado"""
        max_val = max(max(row) for row in self.grid) or 1
        return [[val / max_val for val in row] for row in self.grid]

    def reset(self):
        self.grid = [[0 for _ in range(20)] for _ in range(15)]

async def upload_counts(counts):
    """Sube conteos al backend"""
    url = f"{BACKEND_URL}/api/ingest/counts"

    payload = {
        "entries": counts['entries'],
        "exits": counts['exits'],
        "current_inside": counts['current_inside'],
        "period_seconds": COUNT_INTERVAL,
        "timestamp": datetime.now().isoformat()
    }

    headers = {
        "X-Device-Key": DEVICE_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=10.0)

            if response.status_code == 200:
                print(f"[OK] Conteo enviado: {counts['entries']} entradas, {counts['exits']} salidas")
                return True
            else:
                print(f"[ERROR] Error enviando conteo: {response.status_code}")
                return False
    except Exception as e:
        print(f"[ERROR] Excepcion enviando conteo: {e}")
        return False

async def upload_heatmap(heatmap_data):
    """Sube heatmap al backend"""
    url = f"{BACKEND_URL}/api/ingest/heatmap"

    payload = {
        "period": "hourly",
        "heatmap_data": heatmap_data,
        "resolution": "20x15",
        "timestamp": datetime.now().isoformat()
    }

    headers = {
        "X-Device-Key": DEVICE_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=10.0)

            if response.status_code == 200:
                print(f"[OK] Heatmap enviado (20x15)")
                return True
            else:
                print(f"[ERROR] Error enviando heatmap: {response.status_code}")
                return False
    except Exception as e:
        print(f"[ERROR] Excepcion enviando heatmap: {e}")
        return False

async def main():
    """Loop principal"""
    print("=" * 60)
    print("RetailVision - Edge Pipeline (Modo Simplificado)")
    print("=" * 60)
    print(f"Backend: {BACKEND_URL}")
    print(f"Device Key: {DEVICE_API_KEY}")
    print(f"OpenCV: {'Disponible' if OPENCV_AVAILABLE else 'No disponible'}")
    print(f"GUI (ventana): {'Si' if GUI_AVAILABLE else 'No (headless)'}")
    print("=" * 60)

    # Inicializar componentes
    counter = SimpleCounter()
    heatmap = SimpleHeatmap()

    # Intentar abrir cámara si OpenCV está disponible
    cap = None
    if OPENCV_AVAILABLE:
        print(f"\nIntentando abrir cámara {CAMERA_SOURCE}...")
        cap = cv2.VideoCapture(CAMERA_SOURCE)

        if not cap.isOpened():
            print("[X] No se pudo abrir la camara - usando modo simulacion pura")
            cap = None
        else:
            print("[OK] Camara abierta exitosamente")
            print("Presiona 'q' en la ventana de video para salir\n")

    last_count_upload = time.time()
    last_heatmap_upload = time.time()
    frame_count = 0

    print("Sistema iniciado - generando datos...")
    print(f"Enviando conteos cada {COUNT_INTERVAL}s, heatmaps cada {HEATMAP_INTERVAL}s\n")

    try:
        while True:
            frame_count += 1
            current_time = time.time()

            # Capturar frame si hay cámara
            if cap is not None:
                ret, frame = cap.read()
                if not ret:
                    print("[X] Error leyendo frame")
                    break

                if GUI_AVAILABLE:
                    cv2.putText(frame, "RetailVision - Webcam Activa", (10, 30),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    cv2.putText(frame, f"Dentro: {counter.current_inside}", (10, 60),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
                    cv2.putText(frame, f"Entradas: {counter.entries}", (10, 90),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    cv2.putText(frame, f"Salidas: {counter.exits}", (10, 120),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

                    cv2.imshow("RetailVision - People Counting", frame)

                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        print("\nSaliendo...")
                        break
                else:
                    await asyncio.sleep(0.033)
            else:
                await asyncio.sleep(1)

            # Simular detección cada 2 segundos
            if frame_count % 60 == 0:  # Asumiendo ~30 fps
                counter.simulate_detection()
                heatmap.update()

            # Subir conteos si es momento
            if current_time - last_count_upload >= COUNT_INTERVAL:
                counts = counter.get_counts()
                success = await upload_counts(counts)
                if success:
                    counter.reset()
                last_count_upload = current_time

            # Subir heatmap si es momento
            if current_time - last_heatmap_upload >= HEATMAP_INTERVAL:
                heatmap_data = heatmap.get_normalized_data()
                success = await upload_heatmap(heatmap_data)
                if success:
                    heatmap.reset()
                last_heatmap_upload = current_time

    except KeyboardInterrupt:
        print("\n\n[OK] Detenido por usuario")
    finally:
        if cap is not None:
            cap.release()
            if GUI_AVAILABLE:
                cv2.destroyAllWindows()
        print("[OK] Recursos liberados")

if __name__ == "__main__":
    asyncio.run(main())
