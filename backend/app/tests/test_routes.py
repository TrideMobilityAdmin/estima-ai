from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from app.main import app
from fastapi import status
from fastapi import UploadFile
import json
from io import BytesIO
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
        "aircraftRegNo":"KE134",
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

    assert "user_id" in data  
    assert isinstance(data["user_id"], str)

    assert "createdBy" in data
    assert isinstance(data["createdBy"], str)

    assert "createdAt" in data
    assert isinstance(data["createdAt"], str)  

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



@pytest.fixture    
def valid_estimate_request():
    """Fixture to provide a valid estimate request."""
    return {
        "probability": 0.75,
        "operator": "Operator Name",
        "aircraftAge": 5,
        "aircraftRegNo": "ABC123",
        "aircraftFlightHours": 1000,
        "aircraftFlightCycles": 500,
    }
@pytest.fixture
def invalid_estimate_request():
    """Fixture to provide an invalid estimate request."""
    return {
        "probability": "invalid",  
        "operator": "Operator Name",
        "aircraftAge": -1, 
        "aircraftRegNo": "",  
        "aircraftFlightHours": 1000,
        "aircraftFlightCycles": 500,
    }
@pytest.mark.parametrize("estimate_request, expected_status, expected_msg", [
    (valid_estimate_request, 200, "File and estimated data inserted successfully"),
    (invalid_estimate_request, 422, None),
])
def test_upload_estimate(test_client, access_token, estimate_request, expected_status, expected_msg):
    """Test uploading an estimate with both valid and invalid requests."""
    file_content = b"mock content of the excel file"
    file = UploadFile(filename="test_file.xlsx", file=BytesIO(file_content))

    # Prepare the request
    response = test_client.post(
        "/api/v1/estimates/upload",  
        headers={"Authorization": f"Bearer {access_token}"},
        data={"estimate_request": json.dumps(estimate_request)},  
        files={"file": (file.filename, file.file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}  
    )
    
    assert response.status_code == expected_status, response.json()
    
    if expected_status == 200:
        assert "estID" in response.json()
        assert response.json()["status"] == "Initiated"
        assert response.json()["msg"] == expected_msg
    else:
        assert "detail" in response.json()
def test_estimate_by_id(test_client, access_token):
    """Test getting an estimate by ID."""
    estimate_id = "AKIA_MWEHWG-SS7P"  
    response = test_client.get(
        f"/api/v1/estimates/{estimate_id}",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    assert response.status_code == 200, response.json()
    data = response.json()
    assert "estID" in data
    assert "description" in data
    assert "tasks" in data
    assert "aggregatedTasks" in data
    assert "originalFilename" in data
    
    response = test_client.get(
        "/api/v1/estimates/invalid_id",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    assert response.status_code in [404, 500], response.json()
    assert "Estimate not found" in response.json()["detail"]
    
    response = test_client.get(
        f"/api/v1/estimates/{estimate_id}",
        headers={}  
    )
    
    assert response.status_code in [401, 403], response.json() 
    assert "Not authenticated" in response.json()["detail"]  

def test_get_parts_usage(test_client, access_token):
    """Test both successful retrieval and no data found for parts usage."""
 
    part_id = "425A200-5"  
    start_date = datetime(2024, 3, 27)
    end_date = datetime(2024, 4, 3)
    
    response = test_client.get(
        f"/api/v1/parts/usage/?partId={part_id}&startDate={start_date.isoformat()}&endDate={end_date.isoformat()}",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if response.status_code == 200:
        response_data = response.json()
        assert "data" in response_data
        assert response_data["data"]["partId"] == part_id
        assert "usage" in response_data["data"]
        assert "tasks" in response_data["data"]["usage"]
        assert "findings" in response_data["data"]["usage"]
        assert "aircraftDetails" in response_data["data"]
    elif response.status_code == 404:
        response_data = response.json()
        assert "data" in response_data
        assert response_data["data"] == {}
    else:
        assert response.status_code == 422, "Expected validation error"
        assert "detail" in response.json()
    
    invalid_part_id = "INVALID_PART_ID"  
    response = test_client.get(
        f"/api/v1/parts/usage/?partId={invalid_part_id}&startDate={start_date.isoformat()}&endDate={end_date.isoformat()}",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    assert response.status_code == 422
    response_data = response.json()
    assert "detail" in response_data
def test_get_probability_wise_manhrs_sparecost(test_client, access_token):
    """Test both successful retrieval and no data found for probability-wise manhours and spare parts."""
    
    valid_estimate_id = "DCNOMK_NSY"  
    
    response = test_client.get(
        f"/api/v1/probability_wise_manhrs_sparecost/{valid_estimate_id}",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if response.status_code == 200:
        response_data = response.json()
        assert "estID" in response_data
        assert response_data["estID"] == valid_estimate_id
        assert "estProb" in response_data
    else:
        assert response.status_code == 404
        response_data = response.json()
        assert "detail" in response_data
       
    
    invalid_estimate_id = "INVALID_ESTIMATE_ID"  
    
    response = test_client.get(
        f"/api/v1/probability-wise-manhrs_sparecost/{invalid_estimate_id}",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    assert response.status_code == 404
    response_data = response.json()
    assert "detail" in response_data
    