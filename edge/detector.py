from ultralytics import YOLO
import numpy as np
import config

class PersonDetector:
    """
    Detector de personas usando YOLOv8 con tracking (ByteTrack).
    Tambien detecta objetos relevantes para retail.
    """

    def __init__(self):
        print(f"Cargando modelo YOLO: {config.YOLO_MODEL}")
        self.model = YOLO(config.YOLO_MODEL)
        self.person_class_id = config.PERSON_CLASS_ID
        self.confidence_threshold = config.CONFIDENCE_THRESHOLD
        self.retail_classes = config.RETAIL_CLASSES
        print(f"[OK] Modelo YOLO cargado correctamente")
        print(f"[OK] Detectando {len(self.retail_classes)} clases de objetos")

    def detect_and_track(self, frame):
        """
        Detecta y trackea personas en el frame.
        Retorna solo detecciones de personas (para conteo).
        """
        results = self.model.track(
            frame,
            persist=True,
            classes=[self.person_class_id],
            conf=self.confidence_threshold,
            verbose=False
        )

        detections = []

        if results[0].boxes is not None and len(results[0].boxes) > 0:
            boxes = results[0].boxes

            for i in range(len(boxes)):
                bbox = boxes.xyxy[i].cpu().numpy()
                x1, y1, x2, y2 = map(int, bbox)

                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)

                confidence = float(boxes.conf[i].cpu().numpy())

                track_id = None
                if boxes.id is not None:
                    track_id = int(boxes.id[i].cpu().numpy())

                detections.append({
                    'id': track_id,
                    'bbox': [x1, y1, x2, y2],
                    'centroid': (cx, cy),
                    'confidence': confidence
                })

        return detections

    def detect_all_objects(self, frame):
        """
        Detecta TODOS los objetos relevantes para retail (sin tracking).
        Para visualizacion en el display.
        """
        retail_class_ids = list(self.retail_classes.keys())

        results = self.model(
            frame,
            classes=retail_class_ids,
            conf=self.confidence_threshold,
            verbose=False
        )

        objects = []

        if results[0].boxes is not None and len(results[0].boxes) > 0:
            boxes = results[0].boxes

            for i in range(len(boxes)):
                bbox = boxes.xyxy[i].cpu().numpy()
                x1, y1, x2, y2 = map(int, bbox)

                confidence = float(boxes.conf[i].cpu().numpy())
                class_id = int(boxes.cls[i].cpu().numpy())
                class_name = self.retail_classes.get(class_id, f"Clase {class_id}")

                objects.append({
                    'bbox': [x1, y1, x2, y2],
                    'confidence': confidence,
                    'class_id': class_id,
                    'class_name': class_name,
                })

        return objects
