import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
DEVICE_API_KEY = os.getenv("DEVICE_API_KEY", "test_device_key_123")
CAMERA_SOURCE = os.getenv("CAMERA_SOURCE", "0")
if CAMERA_SOURCE.isdigit():
    CAMERA_SOURCE = int(CAMERA_SOURCE)

YOLO_MODEL = os.getenv("YOLO_MODEL", "yolov8n.pt")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
PERSON_CLASS_ID = 0

SHOW_DISPLAY = os.getenv("SHOW_DISPLAY", "true").lower() == "true"
DISPLAY_WIDTH = int(os.getenv("DISPLAY_WIDTH", "960"))
DISPLAY_HEIGHT = int(os.getenv("DISPLAY_HEIGHT", "720"))

HEATMAP_GRID_WIDTH = int(os.getenv("HEATMAP_GRID_WIDTH", "20"))
HEATMAP_GRID_HEIGHT = int(os.getenv("HEATMAP_GRID_HEIGHT", "15"))

COUNT_INTERVAL = int(os.getenv("COUNT_INTERVAL", "300"))
HEATMAP_INTERVAL = int(os.getenv("HEATMAP_INTERVAL", "3600"))
ZONE_INTERVAL = int(os.getenv("ZONE_INTERVAL", "300"))
HEARTBEAT_INTERVAL = int(os.getenv("HEARTBEAT_INTERVAL", "60"))

TARGET_FPS = int(os.getenv("TARGET_FPS", "15"))
MIN_FPS = int(os.getenv("MIN_FPS", "5"))

CAMERAS = os.getenv("CAMERAS", "").split(",") if os.getenv("CAMERAS") else []

DWELL_PASS_THRESHOLD = float(os.getenv("DWELL_PASS_THRESHOLD", "5"))
DWELL_BROWSE_THRESHOLD = float(os.getenv("DWELL_BROWSE_THRESHOLD", "30"))

LOCAL_BUFFER_DB = os.getenv("LOCAL_BUFFER_DB", "edge_buffer.db")

FRAME_SERVER_PORT = int(os.getenv("FRAME_SERVER_PORT", "8765"))
FRAME_SERVER_FPS = int(os.getenv("FRAME_SERVER_FPS", "5"))
FRAME_SERVER_QUALITY = int(os.getenv("FRAME_SERVER_QUALITY", "50"))

CONFIG_RELOAD_INTERVAL = int(os.getenv("CONFIG_RELOAD_INTERVAL", "60"))

JOURNEY_INTERVAL = int(os.getenv("JOURNEY_INTERVAL", "300"))
JOURNEY_LOST_TIMEOUT = float(os.getenv("JOURNEY_LOST_TIMEOUT", "10"))

QUEUE_INTERVAL = int(os.getenv("QUEUE_INTERVAL", "60"))
AVG_SERVICE_TIME = float(os.getenv("AVG_SERVICE_TIME", "120"))

SHELF_HEATMAP_INTERVAL = int(os.getenv("SHELF_HEATMAP_INTERVAL", "300"))
SHELF_DEFAULT_ROWS = int(os.getenv("SHELF_DEFAULT_ROWS", "4"))
SHELF_DEFAULT_COLS = int(os.getenv("SHELF_DEFAULT_COLS", "6"))

RETAIL_CLASSES = {
    0: "Persona",
    24: "Mochila",
    25: "Paraguas",
    26: "Bolso",
    27: "Corbata",
    28: "Maleta",
    39: "Botella",
    41: "Taza",
    56: "Silla",
    57: "Sofa",
    58: "Maceta",
    60: "Mesa",
    62: "TV/Monitor",
    63: "Laptop",
    67: "Celular",
    73: "Libro",
    74: "Reloj",
}
