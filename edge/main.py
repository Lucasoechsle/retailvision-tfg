import cv2
import asyncio
import sys
import time
import socket
import httpx
from detector import PersonDetector
from counter import PeopleCounter
from heatmap import HeatmapAccumulator
from zone_tracker import ZoneTracker
from journey_tracker import JourneyTracker
from queue_detector import QueueDetector
from shelf_heatmap import ShelfHeatmap
from uploader import DataUploader
from health import HealthMonitor
from frame_server import FrameServer
import config

GUI_AVAILABLE = False
try:
    cv2.namedWindow("__test__", cv2.WINDOW_NORMAL)
    cv2.destroyWindow("__test__")
    GUI_AVAILABLE = True
except cv2.error:
    print("[!] OpenCV GUI not available - running headless")


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


async def fetch_device_config():
    """Fetch full device config (counting line + zones) from backend."""
    result = {"line_config": None, "zones": [], "device_id": None}
    try:
        async with httpx.AsyncClient() as client:
            headers = {"X-Device-Key": config.DEVICE_API_KEY}
            response = await client.get(
                f"{config.BACKEND_URL}/api/devices/config",
                headers=headers,
                timeout=10.0,
            )
            if response.status_code == 200:
                data = response.json()
                device_config = data.get("config", {})
                result["line_config"] = device_config.get("counting_line")
                result["zones"] = data.get("zones", [])
                result["device_id"] = data.get("device_id")
                return result
    except Exception as e:
        print(f"[!] Could not fetch device config: {e}")
    return result


async def upload_data(uploader, counter, heatmap, zone_tracker, health,
                      journey_tracker=None, queue_detector=None,
                      shelf_heatmap=None):
    """Upload all pending data."""
    if uploader.should_send_heartbeat():
        hb = health.get_heartbeat()
        hb["local_ip"] = get_local_ip()
        hb["frame_server_port"] = config.FRAME_SERVER_PORT
        await uploader.upload_heartbeat(hb)

    if uploader.should_upload_counts():
        counts = counter.get_counts()
        if counts["entries"] > 0 or counts["exits"] > 0:
            success = await uploader.upload_counts(counts)
            if success:
                counter.reset()

    if uploader.should_upload_heatmap():
        heatmap_data = heatmap.get_heatmap_data()
        resolution = heatmap.get_resolution_string()
        success = await uploader.upload_heatmap(heatmap_data, resolution)
        if success:
            heatmap.reset()

    if zone_tracker and uploader.should_upload_zones():
        zone_data = zone_tracker.get_zone_data()
        if zone_data:
            success = await uploader.upload_zone_data(zone_data)
            if success:
                zone_tracker.reset()

    if journey_tracker and uploader.should_upload_journeys():
        journeys = journey_tracker.get_completed_journeys()
        if journeys:
            transitions = journey_tracker.get_transitions()
            success = await uploader.upload_journeys(journeys, transitions)
            if success:
                journey_tracker.reset()

    if queue_detector and queue_detector.has_checkout_zones and uploader.should_upload_queues():
        snapshots = queue_detector.get_queue_snapshots()
        if snapshots:
            success = await uploader.upload_queue_snapshot(snapshots)
            if success:
                queue_detector.reset()

    if shelf_heatmap and shelf_heatmap.has_gondola_zones and uploader.should_upload_shelf_heatmap():
        shelf_data = shelf_heatmap.get_shelf_data()
        if shelf_data:
            success = await uploader.upload_shelf_heatmap(shelf_data)
            if success:
                shelf_heatmap.reset()

    if uploader.online:
        await uploader.flush_buffer()


async def main():
    print("=" * 60)
    print("  RetailVision Edge Pipeline v2")
    print("  Multi-camera | Zone Tracking | Dwell Time")
    print("=" * 60)
    print(f"  Backend:      {config.BACKEND_URL}")
    print(f"  Camera:       {config.CAMERA_SOURCE}")
    print(f"  Model:        {config.YOLO_MODEL}")
    print(f"  Target FPS:   {config.TARGET_FPS}")
    print(f"  Local IP:     {get_local_ip()}")
    print(f"  Frame Server: ws://0.0.0.0:{config.FRAME_SERVER_PORT}")
    print("=" * 60)

    print("\n[1/6] Initializing camera...")
    cap = cv2.VideoCapture(config.CAMERA_SOURCE)
    if not cap.isOpened():
        print("[X] Failed to open camera")
        sys.exit(1)

    ret, frame = cap.read()
    if not ret:
        print("[X] Failed to read from camera")
        cap.release()
        sys.exit(1)

    frame_h, frame_w = frame.shape[:2]
    print(f"[OK] Camera: {frame_w}x{frame_h}")

    print("[2/6] Loading YOLO model...")
    detector = PersonDetector()

    print("[3/6] Fetching device configuration...")
    device_cfg = await fetch_device_config()
    line_config = device_cfg["line_config"]
    zones_list = device_cfg["zones"]
    if line_config:
        print(f"[OK] Counting line loaded from server")
    else:
        print("[!] No counting line config - using default (horizontal 50%)")

    print("[4/6] Initializing tracking systems...")
    counter = PeopleCounter(frame_w, frame_h, line_config=line_config)
    heatmap = HeatmapAccumulator(frame_w, frame_h)
    uploader = DataUploader()
    health = HealthMonitor()
    health.update_cameras(1, 1)

    zone_tracker = None
    journey_tracker = None
    queue_detector = None
    shelf_heatmap_tracker = None
    if zones_list:
        zone_tracker = ZoneTracker(
            zones_list, frame_w, frame_h,
            pass_threshold=config.DWELL_PASS_THRESHOLD,
            browse_threshold=config.DWELL_BROWSE_THRESHOLD,
        )
        journey_tracker = JourneyTracker(
            zones_list, lost_timeout=config.JOURNEY_LOST_TIMEOUT,
        )
        queue_detector = QueueDetector(
            zones_list, avg_service_time=config.AVG_SERVICE_TIME,
        )
        shelf_heatmap_tracker = ShelfHeatmap(
            zones_list, frame_w, frame_h,
            default_rows=config.SHELF_DEFAULT_ROWS,
            default_cols=config.SHELF_DEFAULT_COLS,
        )
        checkout_count = len(queue_detector.checkout_zones)
        gondola_count = len(shelf_heatmap_tracker.gondola_zones)
        print(f"[OK] {len(zones_list)} zones loaded ({checkout_count} checkout, {gondola_count} gondola)")
    else:
        print("[!] No zones configured - zone/journey/queue tracking disabled")

    print("[5/6] Starting frame server...")
    frame_server = FrameServer(port=config.FRAME_SERVER_PORT)
    frame_server.start()

    print("[6/6] Starting pipeline...")
    print("=" * 60)

    frame_count = 0
    fps_timer = time.time()
    target_delay = 1.0 / config.TARGET_FPS
    last_config_check = time.time()

    try:
        while True:
            loop_start = time.time()

            ret, frame = cap.read()
            if not ret:
                print("[!] Frame read failed, attempting reconnect...")
                cap.release()
                await asyncio.sleep(2)
                cap = cv2.VideoCapture(config.CAMERA_SOURCE)
                health.record_error("Camera reconnect")
                continue

            frame_count += 1

            person_detections = detector.detect_and_track(frame)
            counter.update(person_detections)
            heatmap.update(person_detections)

            if zone_tracker:
                zone_tracker.update(person_detections)
                if journey_tracker:
                    journey_tracker.update(zone_tracker)
                if queue_detector and queue_detector.has_checkout_zones:
                    queue_detector.update(zone_tracker)
                if shelf_heatmap_tracker and shelf_heatmap_tracker.has_gondola_zones:
                    shelf_heatmap_tracker.update(person_detections)

            frame_server.update_frame(frame)

            # FPS tracking
            if frame_count % 30 == 0:
                elapsed = time.time() - fps_timer
                current_fps = 30 / elapsed if elapsed > 0 else 0
                health.record_fps(current_fps)
                fps_timer = time.time()

            # Upload data periodically
            if frame_count % 30 == 0:
                asyncio.create_task(upload_data(
                    uploader, counter, heatmap, zone_tracker, health,
                    journey_tracker, queue_detector, shelf_heatmap_tracker,
                ))

            # Hot-reload config
            if time.time() - last_config_check > config.CONFIG_RELOAD_INTERVAL:
                last_config_check = time.time()
                try:
                    new_cfg = await fetch_device_config()
                    new_line = new_cfg.get("line_config")
                    if new_line and new_line != line_config:
                        counter.update_line(new_line)
                        line_config = new_line
                        print("[OK] Counting line config reloaded")

                    new_zones = new_cfg.get("zones", [])
                    if new_zones and len(new_zones) != len(zones_list):
                        zone_tracker = ZoneTracker(
                            new_zones, frame_w, frame_h,
                            pass_threshold=config.DWELL_PASS_THRESHOLD,
                            browse_threshold=config.DWELL_BROWSE_THRESHOLD,
                        )
                        journey_tracker = JourneyTracker(
                            new_zones, lost_timeout=config.JOURNEY_LOST_TIMEOUT,
                        )
                        queue_detector = QueueDetector(
                            new_zones, avg_service_time=config.AVG_SERVICE_TIME,
                        )
                        shelf_heatmap_tracker = ShelfHeatmap(
                            new_zones, frame_w, frame_h,
                            default_rows=config.SHELF_DEFAULT_ROWS,
                            default_cols=config.SHELF_DEFAULT_COLS,
                        )
                        zones_list = new_zones
                        print(f"[OK] Zones reloaded: {len(zones_list)} zones")
                except Exception as e:
                    print(f"[!] Config reload failed: {e}")

            # Display
            if GUI_AVAILABLE and config.SHOW_DISPLAY:
                display = cv2.resize(frame, (config.DISPLAY_WIDTH, config.DISPLAY_HEIGHT))

                sx = config.DISPLAY_WIDTH / frame_w
                sy = config.DISPLAY_HEIGHT / frame_h

                for det in person_detections:
                    x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
                    x1, y1, x2, y2 = int(x1*sx), int(y1*sy), int(x2*sx), int(y2*sy)
                    cv2.rectangle(display, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    if det["id"] is not None:
                        label = f"#{det['id']}"
                        cv2.putText(display, label, (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

                overlay = display.copy()
                cv2.rectangle(overlay, (10, 10), (280, 150), (0, 0, 0), -1)
                cv2.addWeighted(overlay, 0.7, display, 0.3, 0, display)

                counts = counter.get_counts()
                y = 30
                cv2.putText(display, "RetailVision v2", (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                y += 25
                cv2.putText(display, f"Personas: {len(person_detections)}", (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                y += 22
                cv2.putText(display, f"Entradas: {counts['entries']} | Salidas: {counts['exits']}", (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                y += 22
                cv2.putText(display, f"Dentro: {counts['current_inside']}", (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
                if zone_tracker:
                    y += 22
                    cv2.putText(display, f"Zonas: {len(zones_list)}", (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 200, 0), 1)
                if frame_server.client_count > 0:
                    y += 22
                    cv2.putText(display, f"Streaming: {frame_server.client_count} client(s)", (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 200, 255), 1)

                cv2.imshow("RetailVision v2", display)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
            else:
                if frame_count % 150 == 0:
                    counts = counter.get_counts()
                    hb = health.get_heartbeat()
                    ws_clients = frame_server.client_count
                    print(
                        f"[{frame_count}] P:{len(person_detections)} "
                        f"E:{counts['entries']} S:{counts['exits']} "
                        f"I:{counts['current_inside']} "
                        f"FPS:{hb['fps']} CPU:{hb['cpu_usage']:.0f}% "
                        f"WS:{ws_clients}"
                    )

            # Frame rate control
            elapsed = time.time() - loop_start
            wait = target_delay - elapsed
            if wait > 0:
                await asyncio.sleep(wait)

    except KeyboardInterrupt:
        print("\n[OK] Stopped by user")
    finally:
        frame_server.stop()
        try:
            counts = counter.get_counts()
            if counts["entries"] > 0 or counts["exits"] > 0:
                await uploader.upload_counts(counts)
            if journey_tracker:
                journey_tracker.force_flush()
                journeys = journey_tracker.get_completed_journeys()
                if journeys:
                    transitions = journey_tracker.get_transitions()
                    await uploader.upload_journeys(journeys, transitions)
        except Exception:
            pass

        cap.release()
        if GUI_AVAILABLE:
            cv2.destroyAllWindows()
        print("[OK] Resources released")


if __name__ == "__main__":
    asyncio.run(main())
