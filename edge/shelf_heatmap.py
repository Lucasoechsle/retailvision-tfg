import numpy as np
from collections import defaultdict


class ShelfHeatmap:
    """
    Generates high-resolution localized heatmaps for gondola-type zones.
    When a person is detected inside a gondola zone, their position is
    mapped to a grid cell within that zone's bounding box.
    """

    def __init__(self, zones, frame_width, frame_height, default_rows=4, default_cols=6):
        self.frame_width = frame_width
        self.frame_height = frame_height
        self.default_rows = default_rows
        self.default_cols = default_cols

        self.gondola_zones = [
            z for z in zones
            if z.get("type", "").lower() in ("gondola", "endcap")
        ]

        self.grids = {}
        self.zone_bounds = {}

        for zone in self.gondola_zones:
            zid = zone["id"]
            rows = zone.get("shelf_rows", default_rows)
            cols = zone.get("shelf_cols", default_cols)
            self.grids[zid] = np.zeros((rows, cols), dtype=np.int32)

            polygon = zone["polygon"]
            xs = [p["x"] for p in polygon]
            ys = [p["y"] for p in polygon]
            self.zone_bounds[zid] = {
                "min_x": min(xs), "max_x": max(xs),
                "min_y": min(ys), "max_y": max(ys),
                "rows": rows, "cols": cols,
            }

    def point_in_polygon(self, px, py, polygon):
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

    def update(self, detections):
        """Map person positions to shelf grid cells."""
        for det in detections:
            if det.get("id") is None:
                continue

            cx, cy = det["centroid"]
            nx = cx / self.frame_width
            ny = cy / self.frame_height

            for zone in self.gondola_zones:
                zid = zone["id"]
                if not self.point_in_polygon(nx, ny, zone["polygon"]):
                    continue

                bounds = self.zone_bounds[zid]
                rel_x = (nx - bounds["min_x"]) / max(bounds["max_x"] - bounds["min_x"], 0.001)
                rel_y = (ny - bounds["min_y"]) / max(bounds["max_y"] - bounds["min_y"], 0.001)

                col = int(min(rel_x * bounds["cols"], bounds["cols"] - 1))
                row = int(min(rel_y * bounds["rows"], bounds["rows"] - 1))
                col = max(0, col)
                row = max(0, row)

                self.grids[zid][row, col] += 1

    def get_shelf_data(self):
        """Return shelf heatmap data for all gondola zones."""
        results = []
        for zone in self.gondola_zones:
            zid = zone["id"]
            grid = self.grids[zid]
            max_val = grid.max()
            if max_val > 0:
                normalized = (grid.astype(np.float32) / max_val).tolist()
            else:
                normalized = grid.astype(np.float32).tolist()

            bounds = self.zone_bounds[zid]
            results.append({
                "zone_id": zid,
                "grid_data": normalized,
                "resolution": f"{bounds['cols']}x{bounds['rows']}",
            })
        return results

    def reset(self):
        for zid in self.grids:
            self.grids[zid].fill(0)

    @property
    def has_gondola_zones(self):
        return len(self.gondola_zones) > 0
