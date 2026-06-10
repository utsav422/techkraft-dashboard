from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: schemas.RegisterIn, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(models.User).filter(models.User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user — role is ALWAYS reviewer, never from client
    new_user = models.User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role="reviewer"   # hardcoded — client cannot change this
    )
    db.add(new_user)
    db.commit()
    return {"message": "Registered successfully"}


@router.post("/login", response_model=schemas.LoginOut)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Find user by email (OAuth2 form uses "username" field for email)
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    # Check user exists and password is correct
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Create and return the JWT token
    token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}
