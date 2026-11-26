"""Hórus AI Engine — reference FastAPI service implementing the platform contract."""
import base64
import binascii
import hmac
import io
import os
import time
import uuid
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException
from PIL import Image, UnidentifiedImageError

from .pipeline import ModelUnavailable, SupervisionEngine
from .schemas import DetectRequest, DetectResponse

VERSION = "0.1.0"
app = FastAPI(title="Hórus AI Engine", version=VERSION)
ENGINE = SupervisionEngine()
SOURCE = "https://github.com/roboflow/supervision"
CAMERAS: dict[str, dict] = {}  # filled by the stream workers (not included in this reference)
_IDEMPOTENCY: dict[str, DetectResponse] = {}


@app.on_event("startup")
def _load() -> None:
    ENGINE.load()


def auth(x_horus_key: str = Header(default="")) -> None:
    expected = os.environ.get("HORUS_AI_ENGINE_KEY", "")
    if not expected or not hmac.compare_digest(x_horus_key, expected):
        raise HTTPException(status_code=401, detail="unauthorized")


def _device() -> str:
    try:
        import torch
        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:  # noqa: BLE001
        return "cpu (torch ausente)"


@app.get("/health", dependencies=[Depends(auth)])
def health():
    return {"status": "ok", "version": VERSION, "device": _device(),
            "models": [{"id": f"supervision-{t}", "loaded": ENGINE.loaded, "task": t} for t in ("objects", "food", "count")]}


@app.get("/models", dependencies=[Depends(auth)])
def models():
    return [{"id": f"supervision-{t}", "task": t, "version": ENGINE.version, "loaded": ENGINE.loaded, "error": ENGINE.error,
             "source_repo": SOURCE, "license_note": "Supervision MIT; RF-DETR Apache-2.0"} for t in ("objects", "food", "count")]


@app.get("/cameras/status", dependencies=[Depends(auth)])
def cameras_status():
    return {"cameras": list(CAMERAS.values())}


def _run(task: str, req: DetectRequest, idem: str | None) -> DetectResponse:
    if idem and idem in _IDEMPOTENCY:
        return _IDEMPOTENCY[idem]
    try:
        image = Image.open(io.BytesIO(base64.b64decode(req.image_base64, validate=True))).convert("RGB")
    except (binascii.Error, UnidentifiedImageError):
        raise HTTPException(400, "invalid image") from None
    started = time.perf_counter()
    try:
        dets, est = ENGINE.analyze(task, image, req.min_confidence, req.zones)
    except ModelUnavailable as e:
        raise HTTPException(503, str(e)) from None
    res = DetectResponse(
        analysis_id=str(uuid.uuid4()), model=f"supervision-{task}", version=ENGINE.version,
        timestamp=datetime.now(timezone.utc).isoformat(), processing_ms=round((time.perf_counter() - started) * 1000, 1),
        image_width=image.width, image_height=image.height, detections=dets, estimates=est,
    )
    if idem:
        _IDEMPOTENCY[idem] = res
    return res


@app.post("/detect/food", response_model=DetectResponse, dependencies=[Depends(auth)])
def detect_food(req: DetectRequest, idempotency_key: str | None = Header(default=None)):
    return _run("food", req, idempotency_key)


@app.post("/detect/waste", response_model=DetectResponse, dependencies=[Depends(auth)])
def detect_waste(req: DetectRequest, idempotency_key: str | None = Header(default=None)):
    return _run("waste", req, idempotency_key)


@app.post("/segment/food", response_model=DetectResponse, dependencies=[Depends(auth)])
def segment_food(req: DetectRequest, idempotency_key: str | None = Header(default=None)):
    return _run("waste", req, idempotency_key)


@app.post("/detect/objects", response_model=DetectResponse, dependencies=[Depends(auth)])
def detect_objects(req: DetectRequest, idempotency_key: str | None = Header(default=None)):
    return _run("objects", req, idempotency_key)
