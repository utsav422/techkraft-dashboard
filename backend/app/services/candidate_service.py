from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app import models


def get_candidates(
    db: Session,
    status: str = None,
    role_applied: str = None,
    skill: str = None,
    keyword: str = None,
    page: int = 1,
    page_size: int = 20
):
    # Start with base query — exclude soft-deleted candidates
    query = db.query(models.Candidate).filter(
        models.Candidate.deleted_at == None  # noqa: E711
    )

    # Apply filters using SQLAlchemy — NOT Python filtering
    if status:
        query = query.filter(models.Candidate.status == status)

    if role_applied:
        query = query.filter(models.Candidate.role_applied == role_applied)

    if keyword:
        # Search in both name and email
        query = query.filter(
            or_(
                models.Candidate.name.ilike(f"%{keyword}%"),
                models.Candidate.email.ilike(f"%{keyword}%")
            )
        )

    if skill:
        # JSON contains check — skill must be in the skills list
        query = query.filter(
            models.Candidate.skills.contains([skill])
        )

    # Get total count before pagination
    total = query.count()

    # Apply pagination — this is done in SQL, not Python
    page_size = min(page_size, 50)  # max 50 per page
    offset = (page - 1) * page_size
    results = query.offset(offset).limit(page_size).all()

    return {"total": total, "page": page, "page_size": page_size, "results": results}


def get_candidate_by_id(db: Session, candidate_id: int):
    return db.query(models.Candidate).filter(
        models.Candidate.id == candidate_id,
        models.Candidate.deleted_at == None  # noqa: E711
    ).first()


def create_score(
    db: Session,
    candidate_id: int,
    category: str,
    score: int,
    reviewer_id: int,
    note: str = None
):
    new_score = models.Score(
        candidate_id=candidate_id,
        category=category,
        score=score,
        reviewer_id=reviewer_id,
        note=note
    )
    db.add(new_score)
    db.commit()
    db.refresh(new_score)
    return new_score


def soft_delete_candidate(db: Session, candidate_id: int):
    candidate = get_candidate_by_id(db, candidate_id)
    if candidate:
        candidate.deleted_at = datetime.utcnow()
        candidate.status = "archived"
        db.commit()
    return candidate


def update_notes(db: Session, candidate_id: int, notes: str):
    candidate = get_candidate_by_id(db, candidate_id)
    if candidate:
        candidate.internal_notes = notes
        db.commit()
        db.refresh(candidate)
    return candidate
