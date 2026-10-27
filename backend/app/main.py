from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.core.config import get_settings
from app.api.image_library import router as image_library_router
from app.api.table_forms import router as table_forms_router
from app.api.ocr import router as ocr_router


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.0.100:5173",
        "http://192.168.0.117:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(image_library_router)
app.include_router(table_forms_router)
app.include_router(ocr_router)