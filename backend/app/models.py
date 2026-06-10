from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime,
    ForeignKey, JSON, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="reviewer")
    created_at = Column(DateTime, default=datetime.utcnow)

    scores = relationship("Score", back_populates="reviewer")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role_applied = Column(String, index=True)
    status = Column(String, default="new", index=True)
    skills = Column(JSON, default=list)
    internal_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    scores = relationship("Score", back_populates="candidate")


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    category = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="scores")
    reviewer = relationship("User", back_populates="scores")
