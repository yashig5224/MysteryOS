from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.investigations import router as investigations_router
from app.api.routes.datasets import router as datasets_router
from app.api.routes.analysis import router as analysis_router
from app.api.routes.patterns import router as patterns_router
from app.api.routes.evidence import router as evidence_router
from app.api.routes.graph import router as graph_router
from app.api.routes.copilot import router as copilot_router
from app.api.routes.hypotheses import router as hypotheses_router
from app.api.routes.reports import router as reports_router

from app.config import settings

app = FastAPI(title="MysteryOS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(investigations_router, prefix="/api")
app.include_router(datasets_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(patterns_router, prefix="/api")
app.include_router(evidence_router, prefix="/api")
app.include_router(graph_router, prefix="/api")
app.include_router(copilot_router, prefix="/api")
app.include_router(hypotheses_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
