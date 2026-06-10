from app.database import SessionLocal, engine
from app import models
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Check if admin already exists
existing = db.query(models.User).filter(models.User.email == "admin@techkraft.com").first()

if existing:
    existing.role = "admin"
    db.commit()
    print("✅ Existing user updated to admin!")
else:
    admin = models.User(
        email="admin@techkraft.com",
        hashed_password=pwd_context.hash("admin123"),
        role="admin"
    )
    db.add(admin)
    db.commit()
    print("✅ Admin user created!")

db.close()