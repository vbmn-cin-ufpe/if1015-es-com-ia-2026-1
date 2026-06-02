import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.auth_controller import router as auth_router
from app.controllers.chat_controller import router as chat_router
from app.controllers.dependency_graph_controller import router as graph_router
from app.controllers.health_controller import router as health_router
from app.controllers.history_controller import router as history_router
from app.controllers.metrics_controller import router as metrics_router
from app.controllers.ops_controller import router as ops_router
from app.controllers.repo_controller import router as repo_router
from app.controllers.tour_controller import router as tour_router
from app.services.observability_service import (
    get_metrics_collector,
    set_correlation_id,
)

app = FastAPI(title="CodeCompass API", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def observability_middleware(request: Request, call_next):
    """Add correlation ID and record request metrics."""
    cid = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    set_correlation_id(cid)

    start = time.time()
    response = await call_next(request)
    duration = time.time() - start

    collector = get_metrics_collector()
    operation = f"{request.method}:{request.url.path}"
    status = "success" if response.status_code < 400 else "error"
    collector.record_latency(operation, duration, status=status)
    if response.status_code >= 400:
        collector.record_error(operation, error_code=str(response.status_code))

    response.headers["X-Correlation-ID"] = cid
    return response


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(repo_router)
app.include_router(chat_router)
app.include_router(tour_router)
app.include_router(graph_router)
app.include_router(history_router)
app.include_router(metrics_router)
app.include_router(ops_router)


@app.on_event("startup")
def seed_admin_user():
    """Seed a default admin user on startup."""
    from app.controllers.auth_controller import get_auth_service

    auth = get_auth_service()
    try:
        auth.signup("admin", "a1b2c3d4")
    except ValueError:
        pass  # Already exists