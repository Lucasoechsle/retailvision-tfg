import time
from collections import defaultdict
from datetime import datetime


class JourneyTracker:
    """
    Reconstructs the full zone-to-zone journey for each tracked person.
    Consumes zone transition data from ZoneTracker and accumulates
    the ordered sequence of zones visited per track_id.
    When a track is lost, the journey is finalized and buffered for upload.
    """

    def __init__(self, zones, lost_timeout=10.0):
        self.zones = {z["id"]: z.get("name", z["id"]) for z in zones}
        self.lost_timeout = lost_timeout

        # track_id -> list of {"zone_id", "entered_at", "exited_at"}
        self.active_journeys = defaultdict(list)
        # track_id -> current zone_id (or None)
        self.current_zone = {}
        # track_id -> timestamp of last seen
        self.last_seen = {}
        # track_id -> timestamp first seen
        self.first_seen = {}
        # Completed journeys ready for upload
        self.completed_journeys = []

    def update(self, zone_tracker):
        """
        Pull state from ZoneTracker each frame:
        - active_visits tells us who is currently in which zone
        - completed_events gives us finalized zone exits
        """
        now = time.time()

        for event in zone_tracker.completed_events:
            track_id = event["track_id"]
            self.last_seen[track_id] = now
            if track_id not in self.first_seen:
                self.first_seen[track_id] = now

            self.active_journeys[track_id].append({
                "zone_id": event["zone_id"],
                "entered_at": event["entered_at"],
                "exited_at": event["exited_at"],
                "dwell_seconds": event["dwell_seconds"],
            })

        for track_id, zone_visits in zone_tracker.active_visits.items():
            self.last_seen[track_id] = now
            if track_id not in self.first_seen:
                self.first_seen[track_id] = now
            for zone_id in zone_visits:
                self.current_zone[track_id] = zone_id

        lost_tracks = []
        for track_id, ts in list(self.last_seen.items()):
            if track_id not in zone_tracker.active_visits and (now - ts) > self.lost_timeout:
                lost_tracks.append(track_id)

        for track_id in lost_tracks:
            self._finalize_journey(track_id)

    def _finalize_journey(self, track_id):
        steps = self.active_journeys.pop(track_id, [])
        if not steps:
            self.last_seen.pop(track_id, None)
            self.first_seen.pop(track_id, None)
            self.current_zone.pop(track_id, None)
            return

        started = self.first_seen.pop(track_id, None)
        self.last_seen.pop(track_id, None)
        self.current_zone.pop(track_id, None)

        unique_zones = []
        seen = set()
        for s in steps:
            if s["zone_id"] not in seen:
                unique_zones.append(s["zone_id"])
                seen.add(s["zone_id"])

        total_dwell = sum(s["dwell_seconds"] for s in steps)

        self.completed_journeys.append({
            "track_id": str(track_id),
            "started_at": steps[0]["entered_at"],
            "ended_at": steps[-1]["exited_at"],
            "total_zones_visited": len(unique_zones),
            "total_dwell_seconds": round(total_dwell, 2),
            "journey_data": steps,
        })

    def get_transitions(self):
        """
        Aggregate zone-to-zone transitions from completed journeys.
        Returns a list of {from_zone_id, to_zone_id, count}.
        """
        transition_counts = defaultdict(int)
        for journey in self.completed_journeys:
            steps = journey["journey_data"]
            for i in range(len(steps) - 1):
                key = (steps[i]["zone_id"], steps[i + 1]["zone_id"])
                transition_counts[key] += 1

        return [
            {"from_zone_id": k[0], "to_zone_id": k[1], "count": v}
            for k, v in transition_counts.items()
        ]

    def get_completed_journeys(self):
        return list(self.completed_journeys)

    def reset(self):
        self.completed_journeys = []

    def force_flush(self):
        """Finalize all active journeys (e.g. on shutdown)."""
        for track_id in list(self.active_journeys.keys()):
            self._finalize_journey(track_id)
