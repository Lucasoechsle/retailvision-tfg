import asyncio
import threading
import time
import cv2
import config

try:
    import websockets
    WS_AVAILABLE = True
except ImportError:
    WS_AVAILABLE = False
    print("[!] websockets not installed - frame server disabled")

STREAM_FPS = int(config.__dict__.get("FRAME_SERVER_FPS", 5))
JPEG_QUALITY = int(config.__dict__.get("FRAME_SERVER_QUALITY", 50))
PORT = int(config.__dict__.get("FRAME_SERVER_PORT", 8765))


class FrameServer:
    """
    Serves JPEG-compressed video frames over WebSocket so the dashboard
    can display a live camera preview for calibration.
    """

    def __init__(self, port=PORT):
        self.port = port
        self._frame = None
        self._lock = threading.Lock()
        self._thread = None
        self._running = False
        self._clients = set()

    def update_frame(self, frame):
        with self._lock:
            self._frame = frame

    def _get_jpeg(self):
        with self._lock:
            if self._frame is None:
                return None
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
            _, buf = cv2.imencode(".jpg", self._frame, encode_param)
            return buf.tobytes()

    async def _handler(self, websocket):
        self._clients.add(websocket)
        try:
            delay = 1.0 / STREAM_FPS
            while True:
                jpeg = self._get_jpeg()
                if jpeg:
                    await websocket.send(jpeg)
                await asyncio.sleep(delay)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self._clients.discard(websocket)

    async def _serve(self):
        async with websockets.serve(self._handler, "0.0.0.0", self.port):
            print(f"[OK] Frame server on ws://0.0.0.0:{self.port}")
            while self._running:
                await asyncio.sleep(1)

    def _run_loop(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self._serve())

    def start(self):
        if not WS_AVAILABLE:
            print("[!] Frame server disabled (pip install websockets)")
            return
        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    @property
    def client_count(self):
        return len(self._clients)
