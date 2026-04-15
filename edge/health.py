import time
import psutil


class HealthMonitor:
    """Monitors edge device health and provides heartbeat data."""

    def __init__(self):
        self.start_time = time.time()
        self.cameras_active = 0
        self.cameras_total = 0
        self.errors = []
        self.fps_samples = []

    def update_cameras(self, active, total):
        self.cameras_active = active
        self.cameras_total = total

    def record_fps(self, fps):
        self.fps_samples.append(fps)
        if len(self.fps_samples) > 60:
            self.fps_samples = self.fps_samples[-60:]

    def record_error(self, error_msg):
        self.errors.append(error_msg)
        if len(self.errors) > 100:
            self.errors = self.errors[-100:]

    def get_heartbeat(self):
        avg_fps = sum(self.fps_samples) / len(self.fps_samples) if self.fps_samples else 0

        try:
            cpu = psutil.cpu_percent()
            mem = psutil.virtual_memory().percent
        except Exception:
            cpu = 0
            mem = 0

        return {
            "uptime_seconds": round(time.time() - self.start_time, 1),
            "cameras_active": self.cameras_active,
            "cameras_total": self.cameras_total,
            "cpu_usage": cpu,
            "memory_usage": mem,
            "fps": round(avg_fps, 1),
            "errors": self.errors[-10:],
        }

    def clear_errors(self):
        self.errors = []
