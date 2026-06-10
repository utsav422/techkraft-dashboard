from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# --- Auth schemas ---

class RegisterIn(BaseModel):
    email: EmailStr
    password: str


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- User schema ---

class UserOut(BaseModel):
    id: int
    email: str
    role: str

    class Config:
        from_attributes = True


# --- Score schemas ---

class ScoreIn(BaseModel):
    category: str
    score: int
    note: Optional[str] = None


class ScoreOut(BaseModel):
    id: int
    category: str
    score: int
    note: Optional[str]
    created_at: datetime
    reviewer: UserOut

    class Config:
        from_attributes = True


# --- Candidate schemas ---

class CandidateIn(BaseModel):
    name: str
    email: EmailStr
    role_applied: Optional[str] = None
    skills: Optional[List[str]] = []
    internal_notes: Optional[str] = None


class CandidateOut(BaseModel):
    id: int
    name: str
    email: str
    role_applied: Optional[str]
    status: str
    skills: Optional[List[str]] = []
    created_at: datetime
    scores: List[ScoreOut] = []

    class Config:
        from_attributes = True


class CandidateAdminOut(CandidateOut):
    internal_notes: Optional[str] = None


class CandidateListItem(BaseModel):
    id: int
    name: str
    email: str
    role_applied: Optional[str]
    status: str
    skills: Optional[List[str]] = []
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedCandidates(BaseModel):
    total: int
    page: int
    page_size: int
    results: List[CandidateListItem]


class SummaryOut(BaseModel):
    summary: str


class NotesIn(BaseModel):
    internal_notes: str
