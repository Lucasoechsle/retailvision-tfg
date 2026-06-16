import time
from collections import defaultdict


class QueueDetector:
    """
    Detects and measures queues in checkout-type zones.
    Counts people standing in checkout zones and estimates wait times
    based on a configurable average service time.
    """

    def __init__(self, zones, avg_service_time=120.0):
        self.checkout_zones = [
            z for z in zones
            if z.get("zone_type", z.get("type", "")).lower() in ("checkout", "caja", "queue")
        ]
        self.avg_service_time = avg_service_time

        # zone_id -> set of current track_ids
        self.zone_occupants = defaultdict(set)
        # zone_id -> peak count in current interval
        self.peak_counts = defaultdict(int)
        # zone_id -> list of recorded queue lengths for averaging
        self.sample_counts = defaultdict(list)

    def update(self, zone_tracker):
        """
        Read current occupancy of checkout zones from ZoneTracker.
        """
        for zone in self.checkout_zones:
            zid = zone["id"]
            counters = zone_tracker.zone_counters.get(zid, {"occupants": set()})
            current_occupants = counters["occupants"]
            self.zone_occupants[zid] = set(current_occupants)

            count = len(current_occupants)
            self.sample_counts[zid].append(count)
            if count > self.peak_counts[zid]:
                self.peak_counts[zid] = count

    def get_queue_snapshots(self):
        """
        Return a snapshot of each checkout zone's queue status.
        """
        snapshots = []
        for zone in self.checkout_zones:
            zid = zone["id"]
            people_in_queue = len(self.zone_occupants.get(zid, set()))
            samples = self.sample_counts.get(zid, [])
            avg_queue = sum(samples) / len(samples) if samples else 0

            estimated_wait = people_in_queue * self.avg_service_time

            snapshots.append({
                "zone_id": zid,
                "people_in_queue": people_in_queue,
                "estimated_wait_seconds": round(estimated_wait, 1),
                "peak_in_period": self.peak_counts.get(zid, 0),
                "avg_in_period": round(avg_queue, 1),
                "is_open": True,
            })
        return snapshots

    def reset(self):
        self.peak_counts = defaultdict(int)
        self.sample_counts = defaultdict(list)

    @property
    def has_checkout_zones(self):
        return len(self.checkout_zones) > 0
