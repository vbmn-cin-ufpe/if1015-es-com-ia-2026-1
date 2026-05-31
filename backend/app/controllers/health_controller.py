from fastapi import APIRouter

from app.services.health_service import get_health_payload

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return get_health_payload()