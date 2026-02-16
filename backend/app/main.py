import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.routers import auth, players, tournaments, users, public

# Check if DB file exists before creating tables
_db_path = settings.DATABASE_URL.replace("sqlite:///", "")
_is_fresh = not os.path.exists(_db_path)

# Create tables
Base.metadata.create_all(bind=engine)

# Seed admin + sample players on first run
if _is_fresh:
    from app.seed import seed
    seed()

app = FastAPI(
    title="Tournament Manager",
    description="Full-stack tournament management system",
    version="1.0.0",
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(players.router)
app.include_router(tournaments.router)
app.include_router(users.router)
app.include_router(public.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
