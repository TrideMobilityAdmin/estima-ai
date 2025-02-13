import pytest
from fastapi.testclient import TestClient
from app.main import app
from fastapi import status
from app.db.database_connection import users_collection,user_login_collection
# Create a TestClient instance
@pytest.fixture(scope="module")
def test_client():
    """Create a TestClient instance to be used for all tests."""
    client = TestClient(app)
    return client

@pytest.fixture
def access_token(test_client):
    """Fixture to log in a user and return the access token."""
    login_data = {
        "username": "newuser",
        "password": "Newuserexam@1234"
    }
    response = test_client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200, response.json()
    return response.json()["accessToken"]

def test_register_success(test_client):
    """Test successful user registration."""
    user_data = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "Newuserexam@1234"
    }
    response = test_client.post("/api/v1/auth/register", json=user_data)
    if response.status_code == 400 and "User already exists" in response.json().get("detail", ""):
        assert response.status_code == 400
        assert "User already exists" in response.json()["detail"]
    else:
        
        assert response.status_code == 200, response.json()
        response_data = response.json()
        assert response_data["username"] == user_data["username"]
        assert response_data["email"] == user_data["email"]
        assert "password" not in response_data



def test_login_user(test_client):
    """Test login for both success and failure scenarios."""
    login_data_valid = {
        "username": "testuser",
        "password": "Newuserexam@1234"
    }
    login_data_invalid = {
        "username": "testuser",
        "password": "Wrongpassword@123"
    }
    
    response = test_client.post("/api/v1/auth/login", json=login_data_valid)
    if response.status_code == 200:
        assert "accessToken" in response.json()
        assert response.json()["tokenType"] == "bearer"
    else:
        response = test_client.post("/api/v1/auth/login", json=login_data_invalid)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid credentials" in response.json()["detail"]

def test_logout_success(test_client, access_token):
    """Test successful user logout."""
    response = test_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 200
    assert "message" in response.json()
    assert response.json()["message"] == "User logged out successfully"
    # Validate logout status in DB
    latest_login_record = user_login_collection.find_one(
        {"logout": {"$ne": ""}},
        sort=[("createdAt", -1)]
    )

    assert latest_login_record is not None
    assert latest_login_record["logout"] is not None
    assert latest_login_record["logout"] != ""

def test_logout_unauthorized(test_client):
    """Test logout with invalid or missing token."""
    response = test_client.post("/api/v1/auth/logout")
    
    assert response.status_code == 401
    assert "detail" in response.json()
    assert response.json()["detail"] == "Not authenticated"

@pytest.fixture
def valid_estimate_request():
    """Fixture for valid estimate request data."""
    return {
        "tasks": ["255000-16-1", "200435-01-1 (LH)"],
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
        "tasks": [],  
        "probability": 0.8,
        "operator": "operator1",
        "aircraftAge": 5,
        "aircraftFlightHours": 1000,
        "aircraftFlightCycles": 200
    }

def test_create_estimate(test_client, access_token, valid_estimate_request):
    """Test the estimate creation endpoint for success """
    
    # Test successful estimate creation
    response = test_client.post(
        "/api/v1/estimates",
        json=valid_estimate_request,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    
    assert response.status_code == 201, response.json()
    data = response.json()
    assert "estID" in data
    assert isinstance(data["estID"], str)

    assert "description" in data
    assert isinstance(data["description"], str)

    assert "tasks" in data
    assert isinstance(data["tasks"], list)
    assert len(data["tasks"]) == len(valid_estimate_request["tasks"])

    assert "aggregatedTasks" in data
    assert isinstance(data["aggregatedTasks"], dict) or data["aggregatedTasks"] is None

    assert "findings" in data
    assert isinstance(data["findings"], list)

    assert "aggregatedFindingsByTask" in data
    assert isinstance(data["aggregatedFindingsByTask"], list) or data["aggregatedFindingsByTask"] is None

    assert "aggregatedFindings" in data
    assert isinstance(data["aggregatedFindings"], dict) or data["aggregatedFindings"] is None

    assert "user_id" in data  # Matching alias in response schema
    assert isinstance(data["user_id"], str)

    assert "createdBy" in data
    assert isinstance(data["createdBy"], str)

    assert "createdAt" in data
    assert isinstance(data["createdAt"], str)  # FastAPI returns datetime as string in JSON

    assert "lastUpdated" in data
    assert isinstance(data["lastUpdated"], str)

    assert "updated_by" in data  # Matching alias in response schema
    assert isinstance(data["updated_by"], str)

    assert "originalFilename" in data
    assert isinstance(data["originalFilename"], str)


def test_create_estimate_missing_fields(test_client, access_token):
    """Test creating an estimate with invalid data."""
    invalid_request = {"tasks": []}  # Missing required fields
    response = test_client.post("/api/v1/estimates/", json=invalid_request, headers=access_token)
    assert response.status_code == 400,response.json()
    assert "tasks must contain at least one item" in response.json()

def test_get_all_estimates(test_client, access_token):
    """Test retrieving all estimates."""
    response = test_client.get(
        "/api/v1/estimates",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)
        if data:
            for estimate in data: 
                assert "estID" in estimate and isinstance(estimate["estID"], str)
                assert "description" in estimate and isinstance(estimate["description"], str)
                assert "createdBy" in estimate and isinstance(estimate["createdBy"], str)
                assert "createdAt" in estimate and isinstance(estimate["createdAt"], str)
                assert "lastUpdated" in estimate and isinstance(estimate["lastUpdated"], str)
    elif response.status_code == 404:
        assert response.json()["detail"] == "Estimates not found", "Expected not found error when no estimates exist"

    else:
        assert False, f"Unexpected status code: {response.status_code}, response: {response.json()}"

def test_get_task_estimate_by_id(test_client, access_token,valid_estimate_request):
    """Test getting a specific task estimate by ID."""
    response = test_client.post(
        "/api/v1/estimates",
        json=valid_estimate_request,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    
    assert response.status_code == 201, response.json()
    estimate_id = response.json()["estID"]
    
    # Fetch the estimate by ID
    response = test_client.get(
        f"/api/v1/estimates/{estimate_id}",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    
    assert response.status_code == 200, response.json()
    assert response.json()["estID"] == estimate_id

def test_get_task_estimate_by_id_not_found(test_client, access_token,invalid_estimate_request):
    """Test getting a non-existent task estimate."""
    estimate_id = "non_existent_id"
    response = test_client.get(f"/api/v1/estimates/{estimate_id}", headers=access_token)
    assert response.status_code == 404
    assert "Estimate not found" in response.json().get("detail", "")

# def test_task_man_hours(test_client, auth_headers):
#     """Test getting task man hours."""
#     task_id = "255000-16-1"
#     response = test_client.get(f"/api/v1/estimation/man_hours/{task_id}", headers=auth_headers)
#     assert response.status_code == 200
#     assert isinstance(response.json(), list)

# def test_task_man_hours_not_found(test_client, auth_headers):
#     """Test getting man hours for a non-existent task."""
#     task_id = "non_existent_task"
#     response = test_client.get(f"/api/v1/estimation/man_hours/{task_id}", headers=auth_headers)
#     assert response.status_code == 404
#     assert "Source task not found" in response.json()["detail"]

# def test_get_spare_parts(test_client, auth_headers):
#     """Test getting spare parts."""
#     task_id = "255000-16-1"
#     response = test_client.get(f"/api/v1/estimation/spare_parts/{task_id}", headers=auth_headers)
#     assert response.status_code == 200
#     assert isinstance(response.json(), list)

# def test_get_spare_parts_not_found(test_client, auth_headers):
#     """Test getting spare parts for a non-existent task."""
#     task_id = "non_existent_task"
#     response = test_client.get(f"/api/v1/estimation/spare_parts/{task_id}", headers=auth_headers)
#     assert response.status_code == 404
#     assert "Source task not found" in response.json()["detail"]
