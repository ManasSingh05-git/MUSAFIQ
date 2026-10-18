"""FastAPI entry point. Run from backend/:  uvicorn app.main:app --reload --port 8000"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routers import auth, catalog, chat, trips
from .seed import init_db

log = logging.getLogger("tourplan")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="MUSAFIQ AI API",
    version="1.0.0",
    description="Intelligent travel, tour planning and flight booking companion.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware, allow_origins=get_settings().cors_list, allow_credentials=False,
    allow_methods=["*"], allow_headers=["*"],
)

for r in (auth.router, catalog.router, chat.router, trips.router):
    app.include_router(r)


@app.exception_handler(Exception)
async def unhandled(_req: Request, exc: Exception):
    log.exception("Unhandled error", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
