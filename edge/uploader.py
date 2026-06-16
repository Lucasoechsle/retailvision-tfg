import httpx
import asyncio
from datetime import datetime, timezone
import config
from local_buffer import LocalBuffer


def _iso_utc():
    """Timestamp ISO 8601 en UTC con sufijo Z (formato que valida el backend con Zod)."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class DataUploader:
    """Uploads data to backend with retry and offline buffering."""

    def __init__(self):
        self.backend_url = config.BACKEND_URL
        self.api_key = config.DEVICE_API_KEY
        self.headers = {
            "X-Device-Key": self.api_key,
            "Content-Type": "application/json"
        }
        self.buffer = LocalBuffer()

        self.last_count_upload = datetime.now()
        self.last_heatmap_upload = datetime.now()
        self.last_zone_upload = datetime.now()
        self.last_heartbeat = datetime.now()
        self.last_journey_upload = datetime.now()
        self.last_queue_upload = datetime.now()
        self.last_shelf_heatmap_upload = datetime.now()

        self.online = True

    async def _post(self, endpoint, payload):
        url = f"{self.backend_url}{endpoint}"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=self.headers, timeout=10.0)
                if response.status_code == 200:
                    self.online = True
                    return True
                else:
                    print(f"[!] Error {endpoint}: {response.status_code}")
                    return False
        except Exception as e:
            self.online = False
            print(f"[!] Offline - buffering {endpoint}: {e}")
            self.buffer.add(endpoint, payload)
            return False

    async def upload_counts(self, counts):
        payload = {
            "entries": counts["entries"],
            "exits": counts["exits"],
            "current_inside": counts["current_inside"],
            "period_seconds": config.COUNT_INTERVAL,
            "timestamp": _iso_utc(),
        }
        success = await self._post("/api/ingest/counts", payload)
        if success:
            self.last_count_upload = datetime.now()
            print(f"[OK] Conteo enviado: {counts['entries']}E/{counts['exits']}S")
        return success

    async def upload_heatmap(self, heatmap_data, resolution):
        payload = {
            "period": "hourly",
            "heatmap_data": heatmap_data,
            "resolution": resolution,
            "timestamp": _iso_utc(),
        }
        success = await self._post("/api/ingest/heatmap", payload)
        if success:
            self.last_heatmap_upload = datetime.now()
            print(f"[OK] Heatmap enviado ({resolution})")
        return success

    async def upload_zone_data(self, zone_data):
        payload = {
            "zones": zone_data,
            "period_seconds": config.ZONE_INTERVAL,
            "timestamp": _iso_utc(),
        }
        success = await self._post("/api/ingest/zones", payload)
        if success:
            self.last_zone_upload = datetime.now()
            print(f"[OK] Zone data enviado ({len(zone_data)} zonas)")
        return success

    async def upload_heartbeat(self, heartbeat_data):
        success = await self._post("/api/ingest/heartbeat", heartbeat_data)
        if success:
            self.last_heartbeat = datetime.now()
        return success

    async def upload_journeys(self, journeys, transitions):
        payload = {
            "journeys": journeys,
            "transitions": transitions,
            "timestamp": _iso_utc(),
        }
        success = await self._post("/api/ingest/journeys", payload)
        if success:
            self.last_journey_upload = datetime.now()
            print(f"[OK] Journeys enviados ({len(journeys)} recorridos, {len(transitions)} transiciones)")
        return success

    async def upload_queue_snapshot(self, queue_data):
        payload = {
            "queues": queue_data,
            "timestamp": _iso_utc(),
        }
        success = await self._post("/api/ingest/queues", payload)
        if success:
            self.last_queue_upload = datetime.now()
            print(f"[OK] Queue snapshot enviado ({len(queue_data)} colas)")
        return success

    async def flush_buffer(self):
        pending = self.buffer.get_pending(20)
        if not pending:
            return

        print(f"[BUFFER] Reenviando {len(pending)} items...")
        for record_id, endpoint, payload in pending:
            success = await self._post(endpoint, payload)
            if success:
                self.buffer.remove(record_id)
            else:
                self.buffer.increment_attempts(record_id)
                break

    def should_upload_counts(self):
        return (datetime.now() - self.last_count_upload).total_seconds() >= config.COUNT_INTERVAL

    def should_upload_heatmap(self):
        return (datetime.now() - self.last_heatmap_upload).total_seconds() >= config.HEATMAP_INTERVAL

    def should_upload_zones(self):
        return (datetime.now() - self.last_zone_upload).total_seconds() >= config.ZONE_INTERVAL

    def should_send_heartbeat(self):
        return (datetime.now() - self.last_heartbeat).total_seconds() >= config.HEARTBEAT_INTERVAL

    def should_upload_journeys(self):
        return (datetime.now() - self.last_journey_upload).total_seconds() >= config.JOURNEY_INTERVAL

    def should_upload_queues(self):
        return (datetime.now() - self.last_queue_upload).total_seconds() >= config.QUEUE_INTERVAL

    async def upload_shelf_heatmap(self, shelf_data):
        payload = {
            "shelves": shelf_data,
            "timestamp": _iso_utc(),
        }
        success = await self._post("/api/ingest/shelf-heatmap", payload)
        if success:
            self.last_shelf_heatmap_upload = datetime.now()
            print(f"[OK] Shelf heatmap enviado ({len(shelf_data)} gondolas)")
        return success

    def should_upload_shelf_heatmap(self):
        return (datetime.now() - self.last_shelf_heatmap_upload).total_seconds() >= config.SHELF_HEATMAP_INTERVAL
