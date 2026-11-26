"""Hórus analysis pipeline built on roboflow/supervision (MIT).
Supervision is model-agnostic: detections come from RF-DETR (Apache-2.0, Roboflow, COCO weights
downloaded automatically) and every analysis step — confidence filter, class filter, NMS, zone
occupancy (PolygonZone) and counts — uses the supervision API. Set HORUS_RFDETR_WEIGHTS to a
fine-tuned checkpoint to replace the COCO weights."""
import os
from typing import Optional

import numpy as np
import supervision as sv

from .schemas import Detection

FOOD = {"banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake"}
TABLEWARE = {"cup", "fork", "knife", "spoon", "bowl", "bottle", "wine glass"}
OBJECTS = TABLEWARE | {"person", "dining table", "chair"}


class ModelUnavailable(Exception):
    pass


class SupervisionEngine:
    version = sv.__version__ if hasattr(sv, "__version__") else "unknown"

    def __init__(self) -> None:
        self._model = None
        self.error: Optional[str] = None

    def load(self) -> None:
        try:
            from rfdetr import RFDETRBase  # lazy: heavy dependency
            from rfdetr.util.coco_classes import COCO_CLASSES
            w = os.environ.get("HORUS_RFDETR_WEIGHTS")
            self._model = RFDETRBase(pretrain_weights=w) if w else RFDETRBase()
            self._names = COCO_CLASSES
            self.error = None
        except Exception as e:  # noqa: BLE001
            self.error = f"Falha ao carregar o detector: {e}"

    @property
    def loaded(self) -> bool:
        return self._model is not None

    def analyze(self, task: str, image, min_conf: float, zones: Optional[list[list[tuple[float, float]]]] = None):
        if not self.loaded:
            raise ModelUnavailable(self.error or "Detector não carregado.")
        if task == "waste":
            raise ModelUnavailable("Desperdício exige um checkpoint segmentado treinado (HORUS_RFDETR_WEIGHTS).")
        w, h = image.size
        det: sv.Detections = self._model.predict(image, threshold=min_conf)
        det = det.with_nms(threshold=0.5)
        names = np.array([self._names.get(int(c), str(c)) for c in det.class_id]) if len(det) else np.array([])
        keep = FOOD if task == "food" else OBJECTS
        mask = np.array([n in keep for n in names], dtype=bool) if len(det) else np.array([], dtype=bool)
        det, names = det[mask], names[mask]

        out = [Detection(class_name=str(n), class_id=int(c), confidence=float(s),
                         bbox=(float(b[0]) / w, float(b[1]) / h, float(b[2]) / w, float(b[3]) / h),
                         area_px=float(det.area[i]))
               for i, (b, c, s, n) in enumerate(zip(det.xyxy, det.class_id, det.confidence, names))]

        est: dict = {"counts": {str(k): int((names == k).sum()) for k in set(names.tolist())}}
        if task != "food":
            est["people_count"] = int((names == "person").sum())
            est["tableware_count"] = int(sum(n in TABLEWARE for n in names))
            if zones:
                people = det[names == "person"]
                occ = []
                for z in zones:
                    poly = (np.array(z) * [w, h]).astype(int)
                    zone = sv.PolygonZone(polygon=poly, triggering_anchors=(sv.Position.BOTTOM_CENTER,))
                    occ.append(int(zone.trigger(people).sum()))
                est["zone_occupancy"] = occ
        return out, est
