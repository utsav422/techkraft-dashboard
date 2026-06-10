import asyncio
import random
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, get_admin_user
from app.services import candidate_service

router = APIRouter(prefix="/api/candidates", tags=["candidates"])

# A few fake AI summaries to return randomly
MOCK_SUMMARIES = [
    "This candidate demonstrates strong technical skills and clear communication. They showed solid problem-solving ability and would likely be a good team fit.",
    "The candidate has relevant experience and performed well in assessments. Some gaps in advanced topics but shows strong learning potential.",
    "Strong cultural fit with good fundamentals. The candidate communicated ideas clearly and showed enthusiasm. Recommended for next round.",
    "Candidate has hands-on experience with the required stack. Scores suggest consistent performance across categories. Worth considering.",
]


@router.get("/", response_model=schemas.PaginatedCandidates)
def list_candidates(
    status: str = Query(None),
    role_applied: str = Query(None),
    skill: str = Query(None),
    keyword: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return candidate_service.get_candidates(
        db, status, role_applied, skill, keyword, page, page_size
    )


@router.get("/{candidate_id}")
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    candidate = candidate_service.get_candidate_by_id(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if current_user.role == "admin":
        # Admin sees all scores + internal notes
        return schemas.CandidateAdminOut.model_validate(candidate)
    else:
        # Reviewer sees only their own scores
        candidate.scores = [
            s for s in candidate.scores if s.reviewer_id == current_user.id
        ]
        return schemas.CandidateOut.model_validate(candidate)


@router.post("/{candidate_id}/scores", status_code=status.HTTP_201_CREATED)
def submit_score(
    candidate_id: int,
    data: schemas.ScoreIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Make sure candidate exists
    candidate = candidate_service.get_candidate_by_id(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Validate score range
    if not 1 <= data.score <= 5:
        raise HTTPException(status_code=422, detail="Score must be between 1 and 5")

    score = candidate_service.create_score(
        db=db,
        candidate_id=candidate_id,
        category=data.category,
        score=data.score,
        reviewer_id=current_user.id,  # always from JWT, never from request body
        note=data.note
    )
    return schemas.ScoreOut.model_validate(score)


@router.post("/{candidate_id}/summary", response_model=schemas.SummaryOut)
async def generate_summary(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    candidate = candidate_service.get_candidate_by_id(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Simulate async AI call with a 2 second delay
    await asyncio.sleep(2)

    summary = random.choice(MOCK_SUMMARIES)
    return {"summary": summary}


@router.patch("/{candidate_id}/notes", response_model=schemas.CandidateAdminOut)
def update_notes(
    candidate_id: int,
    data: schemas.NotesIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)  # admin only
):
    candidate = candidate_service.update_notes(db, candidate_id, data.internal_notes)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return schemas.CandidateAdminOut.model_validate(candidate)


@router.delete("/{candidate_id}", status_code=status.HTTP_200_OK)
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)  # admin only
):
    # Soft delete only — never hard delete
    candidate = candidate_service.soft_delete_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Candidate archived successfully"}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_candidate(
    data: schemas.CandidateIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)  # admin only
):
    # Check if email already exists
    existing = db.query(models.Candidate).filter(
        models.Candidate.email == data.email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    candidate = models.Candidate(
        name=data.name,
        email=data.email,
        role_applied=data.role_applied,
        status="new",
        skills=data.skills or [],
        internal_notes=data.internal_notes or ""
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return schemas.CandidateListItem.model_validate(candidate)
@router.put("/{candidate_id}", response_model=schemas.CandidateAdminOut)
def update_candidate(
    candidate_id: int,
    data: schemas.CandidateIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)  # admin only
):
    candidate = candidate_service.get_candidate_by_id(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate.name = data.name
    candidate.email = data.email
    candidate.role_applied = data.role_applied
    candidate.skills = data.skills or []
    candidate.internal_notes = data.internal_notes or ""

    db.commit()
    db.refresh(candidate)
    return schemas.CandidateAdminOut.model_validate(candidate)


@router.patch("/{candidate_id}/status", response_model=schemas.CandidateAdminOut)
def update_status(
    candidate_id: int,
    status: str = Query(..., enum=["new", "reviewing", "accepted", "rejected"]),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user)  # admin only
):
    candidate = candidate_service.get_candidate_by_id(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate.status = status
    db.commit()
    db.refresh(candidate)
    return schemas.CandidateAdminOut.model_validate(candidate)