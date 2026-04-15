import time
from collections import defaultdict
from datetime import datetime


class ZoneTracker:
    """
    Tracks which zone each person is in and calculates dwell time.
    Zones are defined as polygons with normalized coordinates (0-1).
    """

    def __init__(self, zones, frame_width, frame_height, pass_threshold=5, browse_threshold=30):
        self.zones = zones
        self.frame_width = frame_width
        self.frame_height = frame_height
        self.pass_threshold = pass_threshold
        self.browse_threshold = browse_threshold

        # track_id -> {zone_id: enter_time}
        self.active_visits = defaultdict(dict)
        # Completed dwell events buffer
        self.completed_events = []
        # Zone traffic counters: zone_id -> {entries, exits, occupants}
        self.zone_counters = defaultdict(lambda: {"entries": 0, "exits": 0, "occupants": set()})

    def point_in_polygon(self, px, py, polygon):
        """Ray casting algorithm for point-in-polygon."""
        n = len(polygon)
        inside = False
        j = n - 1
        for i in range(n):
            xi, yi = polygon[i]["x"], polygon[i]["y"]
            xj, yj = polygon[j]["x"], polygon[j]["y"]
            if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
                inside = not inside
            j = i
        return inside

    def get_zone_for_point(self, nx, ny):
        """Return the zone_id for a normalized point, or None."""
        for zone in self.zones:
            if self.point_in_polygon(nx, ny, zone["polygon"]):
                return zone["id"]
        return None

    def update(self, detections):
        """
        Update zone tracking with current frame detections.
        Each detection has: id, centroid (px, py), bbox, confidence
        """
        now = time.time()
        current_tracks = set()

        for det in detections:
            track_id = det.get("id")
            if track_id is None:
                continue

            current_tracks.add(track_id)
            cx, cy = det["centroid"]
            nx = cx / self.frame_width
            ny = cy / self.frame_height

            current_zone = self.get_zone_for_point(nx, ny)

            # Check exits from zones
            for zone_id in list(self.active_visits[track_id].keys()):
                if zone_id != current_zone:
                    enter_time = self.active_visits[track_id].pop(zone_id)
                    dwell = now - enter_time
                    self._record_exit(track_id, zone_id, enter_time, dwell)

            # Check entry to zone
            if current_zone and current_zone not in self.active_visits[track_id]:
                self.active_visits[track_id][current_zone] = now
                self.zone_counters[current_zone]["entries"] += 1
                self.zone_counters[current_zone]["occupants"].add(track_id)

            # Update occupancy
            if current_zone:
                self.zone_counters[current_zone]["occupants"].add(track_id)

        # Handle lost tracks
        lost_tracks = set(self.active_visits.keys()) - current_tracks
        for track_id in lost_tracks:
            for zone_id, enter_time in self.active_visits[track_id].items():
                dwell = now - enter_time
                self._record_exit(track_id, zone_id, enter_time, dwell)
            del self.active_visits[track_id]

        # Clean occupants
        for zone_id in self.zone_counters:
            self.zone_counters[zone_id]["occupants"] &= current_tracks

    def _record_exit(self, track_id, zone_id, enter_time, dwell_seconds):
        self.zone_counters[zone_id]["exits"] += 1
        self.zone_counters[zone_id]["occupants"].discard(track_id)

        if dwell_seconds < self.pass_threshold:
            engagement = "pass"
        elif dwell_seconds < self.browse_threshold:
            engagement = "browse"
        else:
            engagement = "engaged"

        self.completed_events.append({
            "zone_id": zone_id,
            "track_id": track_id,
            "entered_at": datetime.fromtimestamp(enter_time).isoformat(),
            "exited_at": datetime.fromtimestamp(enter_time + dwell_seconds).isoformat(),
            "dwell_seconds": round(dwell_seconds, 2),
            "engagement_type": engagement,
        })

    def get_zone_data(self):
        """Return zone traffic data for upload."""
        data = []
        for zone in self.zones:
            zid = zone["id"]
            counters = self.zone_counters.get(zid, {"entries": 0, "exits": 0, "occupants": set()})
            events = [e for e in self.completed_events if e["zone_id"] == zid]

            data.append({
                "zone_id": zid,
                "entries": counters["entries"],
                "exits": counters["exits"],
                "avg_occupancy": len(counters["occupants"]),
                "peak_occupancy": max(len(counters["occupants"]), counters["entries"]),
                "dwell_events": events,
            })
        return data

    def reset(self):
        """Reset counters after upload (keep active visits)."""
        self.zone_counters = defaultdict(lambda: {"entries": 0, "exits": 0, "occupants": set()})
        # Re-add current occupants
        for track_id, zones in self.active_visits.items():
            for zone_id in zones:
                self.zone_counters[zone_id]["occupants"].add(track_id)
        self.completed_events = []
