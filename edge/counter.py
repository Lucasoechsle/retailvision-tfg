import cv2
from collections import defaultdict


class PeopleCounter:
    """
    Counts people crossing a configurable line defined by two endpoints.
    Supports diagonal lines and configurable entry direction.

    The line is defined in normalized coordinates (0-1). A perpendicular
    vector determines which side is "entry" vs "exit". When a tracked
    centroid crosses from the entry side to the exit side, it counts as
    an entry (and vice-versa).
    """

    def __init__(self, frame_width, frame_height, line_config=None):
        self.frame_width = frame_width
        self.frame_height = frame_height

        self.entries = 0
        self.exits = 0
        self.current_inside = 0

        self.track_positions = defaultdict(lambda: None)
        self.crossed_tracks = set()

        self._set_line(line_config)

    def _set_line(self, line_config):
        """Configure the counting line from a config dict or use defaults."""
        if line_config and "start" in line_config and "end" in line_config:
            s = line_config["start"]
            e = line_config["end"]
            self.line_start = (s["x"], s["y"])
            self.line_end = (e["x"], e["y"])
            self.entry_direction = line_config.get("entry_direction", "top_to_bottom")
        else:
            self.line_start = (0.0, 0.5)
            self.line_end = (1.0, 0.5)
            self.entry_direction = "top_to_bottom"

        dx = self.line_end[0] - self.line_start[0]
        dy = self.line_end[1] - self.line_start[1]

        if self.entry_direction == "bottom_to_top":
            self.normal = (dy, -dx)
        else:
            self.normal = (-dy, dx)

    def update_line(self, line_config):
        """Hot-reload line configuration without losing state."""
        self._set_line(line_config)

    def _side_of_line(self, nx, ny):
        """
        Returns which side of the line a normalized point is on.
        Positive = entry side, negative = exit side.
        """
        vx = nx - self.line_start[0]
        vy = ny - self.line_start[1]
        return vx * self.normal[0] + vy * self.normal[1]

    def update(self, detections):
        current_track_ids = set()

        for detection in detections:
            track_id = detection["id"]
            if track_id is None:
                continue

            current_track_ids.add(track_id)
            cx, cy = detection["centroid"]

            nx = cx / self.frame_width
            ny = cy / self.frame_height

            current_side = self._side_of_line(nx, ny)
            prev_side = self.track_positions[track_id]
            self.track_positions[track_id] = current_side

            if prev_side is None:
                continue

            if track_id in self.crossed_tracks:
                continue

            if prev_side > 0 and current_side <= 0:
                self.entries += 1
                self.current_inside += 1
                self.crossed_tracks.add(track_id)

            elif prev_side < 0 and current_side >= 0:
                self.exits += 1
                self.current_inside = max(0, self.current_inside - 1)
                self.crossed_tracks.add(track_id)

        lost_tracks = set(self.track_positions.keys()) - current_track_ids
        for track_id in lost_tracks:
            del self.track_positions[track_id]
            self.crossed_tracks.discard(track_id)

    def draw(self, frame):
        height, width = frame.shape[:2]

        x1 = int(self.line_start[0] * width)
        y1 = int(self.line_start[1] * height)
        x2 = int(self.line_end[0] * width)
        y2 = int(self.line_end[1] * height)

        cv2.line(frame, (x1, y1), (x2, y2), (0, 255, 255), 3)

        mid_x = (x1 + x2) // 2
        mid_y = (y1 + y2) // 2
        arrow_len = 30
        norm_mag = (self.normal[0]**2 + self.normal[1]**2) ** 0.5
        if norm_mag > 0:
            anx = int(self.normal[0] / norm_mag * arrow_len)
            any_ = int(self.normal[1] / norm_mag * arrow_len)
            cv2.arrowedLine(
                frame,
                (mid_x, mid_y),
                (mid_x + anx * width // 1000, mid_y + any_ * height // 1000),
                (0, 200, 0), 2, tipLength=0.4,
            )
            label_x = mid_x - anx * width // 2000
            label_y = mid_y - any_ * height // 2000
            cv2.putText(frame, "IN", (mid_x + anx * width // 600, mid_y + any_ * height // 600),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        return frame

    def get_counts(self):
        return {
            "entries": self.entries,
            "exits": self.exits,
            "current_inside": self.current_inside,
        }

    def reset(self):
        self.entries = 0
        self.exits = 0
