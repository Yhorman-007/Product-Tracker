import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["AUTO_CREATE_TABLES"] = "false"
os.environ["DATABASE_URL"] = "sqlite:///./test_tenant.db"

from app.database import Base, get_db
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_tenant.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("test_tenant.db"):
        os.remove("test_tenant.db")


@pytest.fixture
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def signup_org(client, org_name, username, email):
    return client.post(
        "/api/auth/signup",
        json={
            "organization_name": org_name,
            "username": username,
            "email": email,
            "full_name": "Admin User",
            "password": "secret123",
        },
    )


def auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}


def test_products_require_auth(client):
    response = client.get("/api/products/")
    assert response.status_code == 401


def test_tenant_isolation(client):
    r1 = signup_org(client, "Tienda Alpha", "alpha_admin", "alpha@test.com")
    r2 = signup_org(client, "Tienda Beta", "beta_admin", "beta@test.com")
    assert r1.status_code == 200
    assert r2.status_code == 200

    token_a = r1.json()["access_token"]
    token_b = r2.json()["access_token"]

    create_a = client.post(
        "/api/products/",
        headers=auth_headers(token_a),
        json={
            "name": "Producto Alpha",
            "sku": "SKU-A1",
            "category": "General",
            "price_purchase": 10,
            "price_sale": 20,
            "unit": "unidad",
            "stock": 5,
            "min_stock": 1,
        },
    )
    assert create_a.status_code == 201
    product_id = create_a.json()["id"]

    list_b = client.get("/api/products/", headers=auth_headers(token_b))
    assert list_b.status_code == 200
    assert all(p["sku"] != "SKU-A1" for p in list_b.json())

    get_b = client.get(f"/api/products/{product_id}", headers=auth_headers(token_b))
    assert get_b.status_code == 404


def test_signup_creates_trial_org(client):
    response = signup_org(client, "Trial Shop", "trial_admin", "trial@test.com")
    assert response.status_code == 200
    data = response.json()
    assert data["organization_name"] == "Trial Shop"
    assert "access_token" in data
    assert "refresh_token" in data

    me = client.get("/api/users/me", headers=auth_headers(data["access_token"]))
    assert me.status_code == 200
    assert me.json()["role"] == "ADMIN"

    org = client.get("/api/organizations/me", headers=auth_headers(data["access_token"]))
    assert org.status_code == 200
    assert org.json()["plan"] == "trial"
