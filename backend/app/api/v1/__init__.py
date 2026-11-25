from fastapi import APIRouter

from app.api.v1.contact import router as contact_router
from app.api.v1.meta import router as meta_router
from app.api.v1.projects import router as projects_router

router = APIRouter(prefix="/api/v1")
router.include_router(projects_router)
router.include_router(meta_router)
router.include_router(contact_router)
