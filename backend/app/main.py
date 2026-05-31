from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.chat_controller import router as chat_router
from app.controllers.health_controller import router as health_router
from app.controllers.repo_controller import router as repo_router

app = FastAPI(title="CodeCompass API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(repo_router)
app.include_router(chat_router)