"""
Script simple para probar la ingesta de datos sin cámara ni YOLO.
Solo envía datos simulados al backend.
"""
import httpx
import asyncio
from datetime import datetime
import random

BACKEND_URL = "http://localhost:3001"
DEVICE_API_KEY = "test_device_key_123"

async def send_counts():
    """Enviar conteo simulado"""
    url = f"{BACKEND_URL}/api/ingest/counts"

    payload = {
        "entries": random.randint(5, 30),
        "exits": random.randint(3, 25),
        "current_inside": random.randint(0, 50),
        "period_seconds": 300,
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
                print(f"✓ Conteo enviado: {payload['entries']} entradas, {payload['exits']} salidas")
            else:
                print(f"✗ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Excepción: {e}")

async def send_heatmap():
    """Enviar heatmap simulado"""
    url = f"{BACKEND_URL}/api/ingest/heatmap"

    # Generar heatmap simulado 20x15
    heatmap_data = [[random.uniform(0, 1) for _ in range(20)] for _ in range(15)]

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
                print(f"✓ Heatmap enviado (20x15)")
            else:
                print(f"✗ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Excepción: {e}")

async def main():
    print("=" * 60)
    print("RetailVision - Test de ingesta de datos")
    print("=" * 60)
    print(f"Backend: {BACKEND_URL}")
    print(f"Device Key: {DEVICE_API_KEY}")
    print("=" * 60)

    # Enviar varios conteos
    print("\n📊 Enviando conteos simulados...")
    for i in range(5):
        await send_counts()
        await asyncio.sleep(2)

    # Enviar un heatmap
    print("\n🗺️  Enviando heatmap simulado...")
    await send_heatmap()

    print("\n✓ Test completado!")
    print("Ve al dashboard en http://localhost:3001 para ver los datos")

if __name__ == "__main__":
    asyncio.run(main())
