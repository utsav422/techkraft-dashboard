import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

# Use a separate test database so we don't mess up real data
TEST_DATABASE_URL = "postgresql://postgres:cagtu@db:5432/techkraft_test"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Tell FastAPI to use the test DB instead of the real one
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_database():
    # Create all tables before each test, drop after
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def get_token(email: str, password: str) -> str:
    # Helper to log in and return a token
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": password}
    )
    return response.json()["access_token"]


# ---------------------------------------------------------------
# TEST 1: Register a user and verify response
# ---------------------------------------------------------------
def test_register_user():
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "password123"
    })
    assert response.status_code == 201
    assert response.json()["message"] == "Registered successfully"


# ---------------------------------------------------------------
# TEST 2: Reviewer cannot see another reviewer's scores
# ---------------------------------------------------------------
def test_reviewer_cannot_see_other_reviewer_scores():
    # Register two reviewers
    client.post("/api/auth/register", json={"email": "reviewer1@test.com", "password": "pass123"})
    client.post("/api/auth/register", json={"email": "reviewer2@test.com", "password": "pass123"})

    # Create a candidate directly in DB
    db = TestingSessionLocal()
    from app import models
    candidate = models.Candidate(
        name="Test Candidate",
        email="candidate@test.com",
        role_applied="Engineer",
        status="new",
        skills=["Python"]
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    candidate_id = candidate.id

    # Reviewer 1 submits a score
    token1 = get_token("reviewer1@test.com", "pass123")
    client.post(
        f"/api/candidates/{candidate_id}/scores",
        json={"category": "Technical", "score": 4},
        headers={"Authorization": f"Bearer {token1}"}
    )

    # Reviewer 2 fetches the candidate — should NOT see reviewer 1's score
    token2 = get_token("reviewer2@test.com", "pass123")
    response = client.get(
        f"/api/candidates/{candidate_id}",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert response.status_code == 200
    # Reviewer 2 has no scores so the list should be empty
    assert response.json()["scores"] == []

    db.close()


# ---------------------------------------------------------------
# TEST 3: Summary endpoint returns a summary string
# ---------------------------------------------------------------
def test_summary_endpoint_returns_summary():
    # Register and login
    client.post("/api/auth/register", json={"email": "user@test.com", "password": "pass123"})
    token = get_token("user@test.com", "pass123")

    # Create a candidate
    db = TestingSessionLocal()
    from app import models
    candidate = models.Candidate(
        name="Summary Candidate",
        email="summary@test.com",
        role_applied="Designer",
        status="new",
        skills=[]
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    candidate_id = candidate.id
    db.close()

    # Call summary endpoint
    response = client.post(
        f"/api/candidates/{candidate_id}/summary",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert "summary" in response.json()
    assert len(response.json()["summary"]) > 0
