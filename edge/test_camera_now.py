# -*- coding: utf-8 -*-
import asyncio
import time
import random
from datetime import datetime
import httpx
import sys

# Config
BACKEND_URL = "http://localhost:3001"
DEVICE_API_KEY = "test_device_key_123"
COUNT_INTERVAL = 30
HEATMAP_INTERVAL = 60

class SimpleCounter:
    def __init__(self):
        self.entries = 0
        self.exits = 0
        self.current_inside = 0

    def simulate_detection(self):
        if random.random() < 0.3:
            self.entries += 1
            self.current_inside += 1
            print(f"[+] Entrada - Dentro: {self.current_inside}")

        if random.random() < 0.2 and self.current_inside > 0:
            self.exits += 1
            self.current_inside -= 1
            print(f"[-] Salida - Dentro: {self.current_inside}")

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
    def __init__(self):
        self.grid = [[0 for _ in range(20)] for _ in range(15)]

    def update(self):
        for _ in range(random.randint(1, 5)):
            x = random.randint(0, 19)
            y = random.randint(0, 14)
            self.grid[y][x] += random.randint(1, 5)

    def get_normalized_data(self):
        max_val = max(max(row) for row in self.grid) or 1
        return [[val / max_val for val in row] for row in self.grid]

    def reset(self):
        self.grid = [[0 for _ in range(20)] for _ in range(15)]

async def upload_counts(counts):
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
                print(f"[ERROR] {response.status_code}")
                return False
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

async def upload_heatmap(heatmap_data):
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
                print(f"[OK] Heatmap enviado")
                return True
            else:
                print(f"[ERROR] {response.status_code}")
                return False
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

async def main():
    print("=" * 60)
    print("RetailVision - Edge Simulator")
    print("=" * 60)
    print(f"Backend: {BACKEND_URL}")
    print(f"Device: {DEVICE_API_KEY}")
    print("=" * 60)

    counter = SimpleCounter()
    heatmap = SimpleHeatmap()

    last_count_upload = time.time()
    last_heatmap_upload = time.time()

    print("\nSistema iniciado - Presiona Ctrl+C para salir\n")

    try:
        while True:
            current_time = time.time()

            # Simular detecciones cada 3 segundos
            counter.simulate_detection()
            heatmap.update()
            await asyncio.sleep(3)

            # Subir conteos
            if current_time - last_count_upload >= COUNT_INTERVAL:
                counts = counter.get_counts()
                success = await upload_counts(counts)
                if success:
                    counter.reset()
                last_count_upload = current_time

            # Subir heatmap
            if current_time - last_heatmap_upload >= HEATMAP_INTERVAL:
                heatmap_data = heatmap.get_normalized_data()
                success = await upload_heatmap(heatmap_data)
                if success:
                    heatmap.reset()
                last_heatmap_upload = current_time

    except KeyboardInterrupt:
        print("\n\nDetenido por usuario")

if __name__ == "__main__":
    asyncio.run(main())
