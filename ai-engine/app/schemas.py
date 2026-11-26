from typing import Literal, Optional
from pydantic import BaseModel, Field


class DetectRequest(BaseModel):
    image_base64: str = Field(min_length=100)
    mime: Literal["image/jpeg", "image/png", "image/webp"] = "image/jpeg"
    min_confidence: float = Field(0.5, ge=0, le=1)
    model: Optional[str] = None
    version: Optional[str] = None
    unit_id: Optional[str] = None
    camera_id: Optional[str] = None
    zones: Optional[list[list[tuple[float, float]]]] = None  # normalized polygons for PolygonZone


class Detection(BaseModel):
    class_name: str
    class_id: Optional[int] = None
    confidence: float = Field(ge=0, le=1)
    bbox: tuple[float, float, float, float]  # normalized x1, y1, x2, y2
    area_px: Optional[float] = None
    mask_polygon: Optional[list[tuple[float, float]]] = None


class DetectResponse(BaseModel):
    analysis_id: str
    model: str
    version: str
    timestamp: str
    processing_ms: float
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    detections: list[Detection]
    estimates: Optional[dict] = None
    status: Literal["ok", "error"] = "ok"
    error: Optional[str] = None
