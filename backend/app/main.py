import time
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from passlib.context import CryptContext
from app.database import engine, Base, SessionLocal
from app import models  # noqa: F401
from app.routers import auth as auth_router
from app.routers import candidates as candidates_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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


def create_default_admin():
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.email == "admin@techkraft.com").first()
        if not existing:
            admin = models.User(
                email="admin@techkraft.com",
                hashed_password=pwd_context.hash("admin123"),
                role="admin"
            )
            db.add(admin)
            db.commit()
            logger.info("✅ Default admin created: admin@techkraft.com / admin123")
        else:
            logger.info("✅ Admin already exists")
    finally:
        db.close()


wait_for_db()
Base.metadata.create_all(bind=engine)
create_default_admin()

app = FastAPI(title="TechKraft API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://techkraft-dashboard-production.up.railway.app",
        "https://techkraft-dashboard.vercel.app",  # add your Vercel URL here after deploying
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(candidates_router.router)


@app.get("/")
def root():
    return {"message": "TechKraft API is running"}

@app.get("/users")
def get_users():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        return users
    finally:
        db.close()