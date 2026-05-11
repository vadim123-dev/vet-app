import pytest
import requests

BASE_URL = "http://localhost:5000"


@pytest.fixture(scope="module")
def admin_token():
    res = requests.post(f"{BASE_URL}/users/authenticate",
                        json={"user_name": "Admin", "password": "Admin"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def vet_token():
    res = requests.post(f"{BASE_URL}/users/authenticate",
                        json={"user_name": "dr_amy", "password": "Admin"})
    assert res.status_code == 200, f"Vet login failed: {res.text}"
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def coordinator_token():
    res = requests.post(f"{BASE_URL}/users/authenticate",
                        json={"user_name": "vad", "password": "Vadim123"})
    assert res.status_code == 200, f"Coordinator login failed: {res.text}"
    return res.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ── Health ────────────────────────────────────────────────────────────────────

def test_health_endpoint():
    res = requests.get(f"{BASE_URL}/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# ── Auth flows ────────────────────────────────────────────────────────────────

def test_login_returns_token_and_roles():
    res = requests.post(f"{BASE_URL}/users/authenticate",
                        json={"user_name": "Admin", "password": "Admin"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["roles"] == ["admin"]


def test_login_wrong_password_returns_401():
    res = requests.post(f"{BASE_URL}/users/authenticate",
                        json={"user_name": "Admin", "password": "wrong"})
    assert res.status_code == 401


def test_protected_endpoint_without_token_returns_401():
    res = requests.get(f"{BASE_URL}/pets/all")
    assert res.status_code == 401


# ── Patients (pets) ───────────────────────────────────────────────────────────

def test_get_all_pets_returns_seeded_data(admin_token):
    res = requests.get(f"{BASE_URL}/pets/all", headers=auth(admin_token))
    assert res.status_code == 200
    pets = res.json()
    assert len(pets) > 0
    first = pets[0]
    assert "name" in first
    assert "type_code" in first
    assert "owner_first_name" in first


def test_get_pet_profile(admin_token):
    # get list first, then fetch one profile
    pets = requests.get(f"{BASE_URL}/pets/all", headers=auth(admin_token)).json()
    pet_id = pets[0]["id"]
    res = requests.get(f"{BASE_URL}/pets/{pet_id}", headers=auth(admin_token))
    assert res.status_code == 200
    profile = res.json()
    assert "owner" in profile
    assert "measurements" in profile
    assert "appointments" in profile


# ── Users ─────────────────────────────────────────────────────────────────────

def test_admin_can_fetch_all_users_with_roles(admin_token):
    res = requests.get(f"{BASE_URL}/users/all", headers=auth(admin_token))
    assert res.status_code == 200
    users = res.json()
    assert len(users) > 0
    assert "roles" in users[0]


def test_coordinator_gets_customer_only_list(coordinator_token):
    res = requests.get(f"{BASE_URL}/users/all", headers=auth(coordinator_token))
    assert res.status_code == 200
    users = res.json()
    # coordinator sees customers only — no roles field in response
    assert all("roles" not in u for u in users)


def test_get_current_user(vet_token):
    res = requests.get(f"{BASE_URL}/users/current", headers=auth(vet_token))
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["user_name"] == "dr_amy"
    assert "vet" in data["user"]["roles"]


# ── Appointments ──────────────────────────────────────────────────────────────

def test_get_clinic_resources(coordinator_token):
    res = requests.get(f"{BASE_URL}/appointments/resources",
                       headers=auth(coordinator_token))
    assert res.status_code == 200
    data = res.json()
    assert len(data["vets"]) > 0
    assert len(data["rooms"]) > 0


def test_get_appointments_for_today(coordinator_token):
    from datetime import date
    today = date.today().isoformat()
    res = requests.get(f"{BASE_URL}/appointments/?date={today}",
                       headers=auth(coordinator_token))
    assert res.status_code == 200
    assert isinstance(res.json(), list)


# ── Role access control ───────────────────────────────────────────────────────

def test_coordinator_cannot_access_user_management(coordinator_token):
    res = requests.post(f"{BASE_URL}/users/add",
                        headers=auth(coordinator_token),
                        json={"user_name": "test", "first_name": "T",
                              "last_name": "T", "gender": 1,
                              "city": "TLV", "telephone": "050"})
    assert res.status_code == 403


def test_vet_cannot_access_user_management(vet_token):
    res = requests.post(f"{BASE_URL}/users/add",
                        headers=auth(vet_token),
                        json={"user_name": "test", "first_name": "T",
                              "last_name": "T", "gender": 1,
                              "city": "TLV", "telephone": "050"})
    assert res.status_code == 403


# ── Dashboard ─────────────────────────────────────────────────────────────────

def test_get_hospitalizations(admin_token):
    res = requests.get(f"{BASE_URL}/appointments/hospitalizations",
                       headers=auth(admin_token))
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    assert "pet_name" in data[0]
    assert "status" in data[0]


def test_get_reminders(admin_token):
    res = requests.get(f"{BASE_URL}/appointments/reminders",
                       headers=auth(admin_token))
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    assert "note" in data[0]
    assert "priority" in data[0]
