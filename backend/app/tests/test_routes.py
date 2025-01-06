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
