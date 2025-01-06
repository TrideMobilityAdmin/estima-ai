from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_task_probability():
    response = client.get("/api/v1/analytics/task_probability/some_task")
    assert response.status_code == 200

def test_task_man_hours():
    response = client.get("/api/v1/estimation/task_man_hours/some_task")
    assert response.status_code == 200

def test_spare_parts():
    response = client.get("/api/v1/estimation/spare_parts/some_task")
    assert response.status_code == 200
    
def test_register():
    response = client.post("/api/v1/register", json={"username": "testuser", "email": "test@example.com", "password": "password"})
    assert response.status_code == 200
    assert response.json() == {"username": "testuser", "email": "test@example.com"}

def test_login():
    response = client.post("/api/v1/login", json={"username": "testuser", "password": "password"})
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_protected_route():
    login_response = client.post("/api/v1/login", json={"username": "testuser", "password": "password"})
    token = login_response.json()["access_token"]
    response = client.get("/api/v1/protected", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert "message" in response.json()