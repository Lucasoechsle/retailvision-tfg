import numpy as np
import config

class HeatmapAccumulator:
    """
    Acumula posiciones de centroides de personas en una grilla
    y genera un heatmap normalizado.
    """

    def __init__(self, frame_width, frame_height):
        """
        Args:
            frame_width: Ancho del frame en píxeles
            frame_height: Alto del frame en píxeles
        """
        self.frame_width = frame_width
        self.frame_height = frame_height
        self.grid_width = config.HEATMAP_GRID_WIDTH
        self.grid_height = config.HEATMAP_GRID_HEIGHT

        # Inicializar grilla de acumulación
        self.heatmap = np.zeros((self.grid_height, self.grid_width), dtype=np.int32)

        # Calcular tamaño de cada celda
        self.cell_width = frame_width / self.grid_width
        self.cell_height = frame_height / self.grid_height

    def update(self, detections):
        """
        Acumula las posiciones de los centroides en la grilla.

        Args:
            detections: Lista de detecciones del detector
        """
        for detection in detections:
            cx, cy = detection['centroid']

            # Convertir coordenadas de píxeles a índices de grilla
            grid_x = int(cx / self.cell_width)
            grid_y = int(cy / self.cell_height)

            # Asegurar que está dentro de los límites
            grid_x = max(0, min(grid_x, self.grid_width - 1))
            grid_y = max(0, min(grid_y, self.grid_height - 1))

            # Incrementar contador en esa celda
            self.heatmap[grid_y, grid_x] += 1

    def get_normalized_heatmap(self):
        """
        Retorna el heatmap normalizado entre 0 y 1.

        Returns:
            numpy.ndarray: Array 2D normalizado (grid_height x grid_width)
        """
        if self.heatmap.max() == 0:
            return np.zeros_like(self.heatmap, dtype=np.float32)

        normalized = self.heatmap.astype(np.float32) / self.heatmap.max()
        return normalized

    def get_heatmap_data(self):
        """
        Retorna el heatmap como lista de listas para JSON.

        Returns:
            list: Lista 2D con valores normalizados
        """
        normalized = self.get_normalized_heatmap()
        return normalized.tolist()

    def reset(self):
        """
        Resetea el heatmap a ceros.
        """
        self.heatmap.fill(0)

    def get_resolution_string(self):
        """
        Retorna la resolución del heatmap como string.

        Returns:
            str: "WIDTHxHEIGHT"
        """
        return f"{self.grid_width}x{self.grid_height}"
