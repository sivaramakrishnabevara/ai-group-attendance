import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from services.face_pipeline import pipeline
from routes.api import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load YuNet and SFace models into memory once
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, "models")
    pipeline.load_models(models_dir)
    yield
    # Shutdown logic if needed

app = FastAPI(
    title="AI Group Attendance Face Biometrics Service",
    description="High-performance face detection and recognition using YuNet, SFace and Cosine Similarity.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_SERVICE_PORT", 8000))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
