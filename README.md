# TechKraft Recruitment Dashboard

An internal candidate scoring and review tool built with Next.js and FastAPI.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **Auth**: JWT (python-jose + bcrypt)
- **Containerization**: Docker Compose

---

## Setup & Run

### Prerequisites
- Docker Desktop installed and running

### Run everything with one command:

```bash
docker compose up --build
```

Then open:
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

### Create a test admin user:

```bash
# 1. Register a user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "admin123"}'

# 2. Promote to admin
docker exec -it techkraft-dashboard-db-1 psql -U postgres -d techkraft_db \
  -c "UPDATE users SET role='admin' WHERE email='admin@test.com';"
```

---

## Example API Calls

### Register
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "reviewer@test.com", "password": "test123"}'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'username=reviewer@test.com&password=test123'
```

### List candidates
```bash
curl http://localhost:8000/api/candidates/ \
  -H "Authorization: Bearer <your_token>"
```

### Submit a score
```bash
curl -X POST http://localhost:8000/api/candidates/1/scores \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"category": "Technical", "score": 4, "note": "Strong fundamentals"}'
```

### Generate AI summary
```bash
curl -X POST http://localhost:8000/api/candidates/1/summary \
  -H "Authorization: Bearer <your_token>"
```

---

## Architecture Decision Records (ADR)

### ADR 1 — FastAPI over Flask
**Context**: Needed a Python backend framework.  
**Decision**: FastAPI — native async support, automatic OpenAPI docs at /docs, Pydantic validation built in.  
**Trade-off**: Smaller ecosystem than Flask/Django. Async patterns need careful handling.

### ADR 2 — PostgreSQL over SQLite
**Context**: Need a production-ready database that handles concurrent connections.  
**Decision**: PostgreSQL via Docker — reliable, supports JSON columns for skills, handles concurrent writes.  
**Trade-off**: Requires Docker to run locally. More setup than SQLite.

### ADR 3 — SQLAlchemy ORM over raw SQL
**Context**: Need safe, readable database queries with filtering and pagination.  
**Decision**: SQLAlchemy ORM for all queries — prevents SQL injection, readable filter chains, easy to swap DB later.  
**Trade-off**: Slight learning curve. Raw SQL is sometimes faster for very complex queries.

---

## Debugging Bug Identification

The following code has a critical bug:

```python
def search_candidates(status, keyword, page, page_size):
    all_candidates = db.execute("SELECT * FROM candidates").fetchall()
    filtered = [c for c in all_candidates if c["status"] == status]
    offset = (page - 1) * page_size
    return filtered[offset : offset + page_size]
```

**The bug**: It fetches ALL rows into memory first, then filters in Python.

**Why it matters at scale**:
- With 10,000+ candidates, every request loads the entire table into RAM
- Pagination is broken — slicing the Python list gives wrong results
- Performance gets worse as the table grows (linear scan every time)

**The correct approach** — push filtering and pagination into SQL:

```python
db.query(Candidate)
  .filter(Candidate.status == status)
  .filter(Candidate.name.ilike(f"%{keyword}%"))
  .offset((page - 1) * page_size)
  .limit(page_size)
  .all()
```

This is exactly what `candidate_service.py` does in this project.

---

## Learning Reflection

This project was my first time building a FastAPI backend from scratch. The biggest 
learning was understanding how JWT authentication flows work end-to-end — from 
hashing passwords with bcrypt, to signing tokens, to validating them on every request 
via FastAPI dependencies. Given more time, I would explore adding SSE (Server-Sent 
Events) for the stretch goal of real-time score streaming, and replace localStorage 
token storage with httpOnly cookies for better security.

---

## Running Tests

```bash
docker exec -it techkraft-dashboard-backend-1 pytest tests/ -v
```

## Port Reference

| Service  | Port |
|----------|------|
| Frontend | 3000 |
| Backend  | 8000 |
| Postgres | 5433 (host) / 5432 (internal) |
