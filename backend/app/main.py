import time
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base
from app import models  # noqa: F401
from app.routers import auth as auth_router
from app.routers import candidates as candidates_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def wait_for_db(retries=10, delay=3):
    for attempt in range(retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database is ready!")
            return
        except Exception:
            logger.info(f"Waiting for database... attempt {attempt + 1}/{retries}")
            time.sleep(delay)
    raise Exception("Could not connect to database after several retries")


wait_for_db()
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TechKraft API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(candidates_router.router)


@app.get("/")
def root():
    return {"message": "TechKraft API is running"}
