import pytest
from fastapi.testclient import TestClient
from app.main import app

# Create a TestClient instance
@pytest.fixture(scope="module")
def test_client():
    """Create a TestClient instance to be used for all tests."""
    client = TestClient(app)
    return client

@pytest.fixture
def auth_headers(test_client):
    """Fixture to get authentication headers."""
    login_data = {
        "username": "testuser",
        "password": "password123"
    }
    response = test_client.post("/api/v1/auth/login", json=login_data)
    token = response.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def valid_estimate_request():
    """Fixture for valid estimate request data."""
    return {
        "tasks": ["255000-16-1", "256241-05-1"],
        "probability": 0.8,
        "operator": "operator1",
        "aircraftAge": 5,
        "aircraftFlightHours": 1000,
        "aircraftFlightCycles": 200
    }

@pytest.fixture
def invalid_estimate_request():
    """Fixture for invalid estimate request data."""
    return {
        "tasks": [],  # Invalid: No tasks provided
        "probability": 0.8,
        "operator": "operator1",
        "aircraftAge": 5,
        "aircraftFlightHours": 1000,
        "aircraftFlightCycles": 200
    }

def test_create_estimate(test_client, auth_headers, valid_estimate_request):
    """Test creating an estimate with valid data."""
    response = test_client.post("/api/v1/estimates/", json=valid_estimate_request, headers=auth_headers)
    assert response.status_code == 201
    response_data = response.json()
    assert response_data == {**valid_estimate_request, "tasks": valid_estimate_request["tasks"]}

def test_create_estimate_failure(test_client, auth_headers, invalid_estimate_request):
    """Test creating an estimate with invalid data."""
    response = test_client.post("/api/v1/estimates/", json=invalid_estimate_request, headers=auth_headers)
    assert response.status_code == 400
    assert "tasks must contain at least one item" in response.json()["detail"]

def test_register_success(test_client):
    """Test successful user registration."""
    user_data = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "securepass123"
    }
    response = test_client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 201
    response_data = response.json()
    assert response.json()["username"] == user_data["username"]
    assert response.json()["email"] == user_data["email"]
    assert "password" not in response.json()

def test_register_duplicate_user(test_client):
    """Test registering a duplicate user."""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    }
    response = test_client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 400
    assert "User already exists" in response.json()["detail"]

def test_login_success(test_client):
    """Test successful login."""
    login_data = {
        "username": "testuser",
        "password": "password123"
    }
    response = test_client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    assert "accessToken" in response.json()
    assert response.json()["tokenType"] == "bearer"

def test_login_invalid_credentials(test_client):
    """Test login with invalid credentials."""
    login_data = {
        "username": "testuser",
        "password": "wrongpassword"
    }
    response = test_client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]

def test_get_all_task_estimates(test_client, auth_headers):
    """Test getting all task estimates."""
    response = test_client.get("/api/v1/estimates/", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_task_estimate_by_id(test_client, auth_headers):
    """Test getting a specific task estimate by ID."""
    task_id = "EST-123"  # Replace with a valid task ID
    response = test_client.get(f"/api/v1/estimates/{task_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["task_id"] == task_id

def test_get_task_estimate_by_id_not_found(test_client, auth_headers):
    """Test getting a non-existent task estimate."""
    estimate_id = "non_existent_id"
    response = test_client.get(f"/api/v1/estimates/{estimate_id}", headers=auth_headers)
    assert response.status_code == 404
    assert "Estimate not found" in response.json()["detail"]

def test_task_man_hours(test_client, auth_headers):
    """Test getting task man hours."""
    task_id = "255000-16-1"
    response = test_client.get(f"/api/v1/estimation/man_hours/{task_id}", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_task_man_hours_not_found(test_client, auth_headers):
    """Test getting man hours for a non-existent task."""
    task_id = "non_existent_task"
    response = test_client.get(f"/api/v1/estimation/man_hours/{task_id}", headers=auth_headers)
    assert response.status_code == 404
    assert "Source task not found" in response.json()["detail"]

def test_get_spare_parts(test_client, auth_headers):
    """Test getting spare parts."""
    task_id = "255000-16-1"
    response = test_client.get(f"/api/v1/estimation/spare_parts/{task_id}", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_spare_parts_not_found(test_client, auth_headers):
    """Test getting spare parts for a non-existent task."""
    task_id = "non_existent_task"
    response = test_client.get(f"/api/v1/estimation/spare_parts/{task_id}", headers=auth_headers)
    assert response.status_code == 404
    assert "Source task not found" in response.json()["detail"]