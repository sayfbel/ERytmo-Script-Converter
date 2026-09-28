import os
import sys
import uuid
from fastapi.testclient import TestClient

root_dir = os.path.dirname(os.path.abspath(__file__))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.main import app
from backend.database.database import SessionLocal, SQLALCHEMY_DATABASE_URL, is_mysql
from backend.models import models
from backend.routes.auth import create_access_token, hash_password

def run_comprehensive_isolation_verification():
    print("=" * 70)
    print("COMPREHENSIVE MULTI-USER DATA ISOLATION VERIFICATION SUITE")
    print(f"Active Database URL: {SQLALCHEMY_DATABASE_URL}")
    print(f"Database Type: {'MySQL / MariaDB (XAMPP)' if is_mysql else 'SQLite fallback'}")
    print("=" * 70)

    db = SessionLocal()

    # 1. Inspect existing users and records
    print("\n--- 1. ACTIVE DATABASE STATE INSPECTION ---")
    users = db.query(models.User).all()
    print(f"Total existing users: {len(users)}")
    for u in users:
        print(f"  User ID: {u.id} | Email: {u.email} | Name: {u.first_name} {u.last_name}")

    companies = db.query(models.Company).all()
    print(f"\nTotal existing companies: {len(companies)}")
    for c in companies:
        print(f"  Company ID: {c.id} | Owner user_id: {c.user_id} | Name: {c.name}")

    projects = db.query(models.Project).all()
    print(f"\nTotal existing projects: {len(projects)}")
    for p in projects:
        print(f"  Project ID: {p.id} | Owner user_id: {p.user_id} | Name: {p.name} | Company: {p.company_name}")

    staff = db.query(models.Staff).all()
    print(f"\nTotal existing staff: {len(staff)}")
    for s in staff:
        print(f"  Staff ID: {s.id} | Owner user_id: {s.user_id} | Name: {s.name} | Linked user_id: {s.staff_user_id}")

    # 2. Setup Test Users A and B
    print("\n--- 2. CREATING ISOLATED TEST USERS A & B ---")
    uid_suffix = uuid.uuid4().hex[:6]
    email_a = f"a_test_{uid_suffix}@example.com"
    email_b = f"b_test_{uid_suffix}@example.com"

    user_a = models.User(
        first_name="User",
        last_name="A",
        email=email_a,
        password_hash=hash_password("Password123!"),
        email_verified=True
    )
    user_b = models.User(
        first_name="User",
        last_name="B",
        email=email_b,
        password_hash=hash_password("Password123!"),
        email_verified=True
    )
    db.add(user_a)
    db.add(user_b)
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)
    print(f"Created User A: ID={user_a.id}, Email={user_a.email}")
    print(f"Created User B: ID={user_b.id}, Email={user_b.email}")

    token_a = create_access_token({"sub": str(user_a.id), "email": user_a.email})
    token_b = create_access_token({"sub": str(user_b.id), "email": user_b.email})

    client_a = TestClient(app, cookies={"erytmo_token": token_a})
    client_b = TestClient(app, cookies={"erytmo_token": token_b})

    # Verify /api/auth/me returns each respective user
    me_a = client_a.get("/api/auth/me").json()
    me_b = client_b.get("/api/auth/me").json()
    assert me_a["id"] == user_a.id and me_a["email"] == user_a.email, "User A /auth/me mismatch"
    assert me_b["id"] == user_b.id and me_b["email"] == user_b.email, "User B /auth/me mismatch"
    print("[PASS] Authentication identity: /api/auth/me returns correct identity for each user.")

    # 3. Verify clean initial slate
    print("\n--- 3. INITIAL WORKSPACE ISOLATION (ZERO-LEAK) ---")
    res_a_init_c = client_a.get("/api/companies").json()
    res_b_init_c = client_b.get("/api/companies").json()
    assert len(res_a_init_c) == 0, f"User A should see 0 companies, got {res_a_init_c}"
    assert len(res_b_init_c) == 0, f"User B should see 0 companies, got {res_b_init_c}"
    print("[PASS] User A and User B start with zero legacy companies (no leakage of User 13 TITRAFILM / Dubbing Brothers).")

    # 4. Create separate records for User A and User B
    print("\n--- 4. CREATING USER-SCOPED DATA ---")
    # User A creates Company, Project, Staff
    res_ca = client_a.post("/api/companies?name=A%20COMPANY&description=User%20A%20Company")
    assert res_ca.status_code == 200, f"User A company creation failed: {res_ca.text}"
    comp_a = res_ca.json()
    comp_a_id = comp_a["id"]

    res_pa = client_a.post(f"/api/projects?name=A%20PROJECT&company_id={comp_a_id}&company_name=A%20COMPANY")
    assert res_pa.status_code == 200, f"User A project creation failed: {res_pa.text}"
    proj_a = res_pa.json()
    proj_a_id = proj_a["id"]

    res_sa = client_a.post("/api/staff?name=A%20STAFF&email=staff_a@example.com&task=Detection")
    assert res_sa.status_code == 200, f"User A staff creation failed: {res_sa.text}"
    staff_a = res_sa.json()
    staff_a_id = staff_a["id"]

    print(f"User A created: Company ID {comp_a_id}, Project ID {proj_a_id}, Staff ID {staff_a_id}")

    # User B creates Company, Project, Staff
    res_cb = client_b.post("/api/companies?name=B%20COMPANY&description=User%20B%20Company")
    assert res_cb.status_code == 200, f"User B company creation failed: {res_cb.text}"
    comp_b = res_cb.json()
    comp_b_id = comp_b["id"]

    res_pb = client_b.post(f"/api/projects?name=B%20PROJECT&company_id={comp_b_id}&company_name=B%20COMPANY")
    assert res_pb.status_code == 200, f"User B project creation failed: {res_pb.text}"
    proj_b = res_pb.json()
    proj_b_id = proj_b["id"]

    res_sb = client_b.post("/api/staff?name=B%20STAFF&email=staff_b@example.com&task=Conformation")
    assert res_sb.status_code == 200, f"User B staff creation failed: {res_sb.text}"
    staff_b = res_sb.json()
    staff_b_id = staff_b["id"]

    print(f"User B created: Company ID {comp_b_id}, Project ID {proj_b_id}, Staff ID {staff_b_id}")

    # 5. Verify Isolation in Listing Endpoints
    print("\n--- 5. TESTING LISTING ISOLATION ---")
    # Companies
    list_ca = client_a.get("/api/companies").json()
    list_cb = client_b.get("/api/companies").json()
    assert [c["name"] for c in list_ca] == ["A COMPANY"], f"Expected ['A COMPANY'], got {[c['name'] for c in list_ca]}"
    assert [c["name"] for c in list_cb] == ["B COMPANY"], f"Expected ['B COMPANY'], got {[c['name'] for c in list_cb]}"
    print("[PASS] GET /api/companies strictly returns only owner's companies.")

    # Projects
    list_pa = client_a.get("/api/projects").json()
    list_pb = client_b.get("/api/projects").json()
    assert [p["name"] for p in list_pa] == ["A PROJECT"], f"Expected ['A PROJECT'], got {[p['name'] for p in list_pa]}"
    assert [p["name"] for p in list_pb] == ["B PROJECT"], f"Expected ['B PROJECT'], got {[p['name'] for p in list_pb]}"
    print("[PASS] GET /api/projects strictly returns only owner's projects.")

    # Staff
    list_sa = client_a.get("/api/staff").json()
    list_sb = client_b.get("/api/staff").json()
    assert [s["name"] for s in list_sa] == ["A STAFF"], f"Expected ['A STAFF'], got {[s['name'] for s in list_sa]}"
    assert [s["name"] for s in list_sb] == ["B STAFF"], f"Expected ['B STAFF'], got {[s['name'] for s in list_sb]}"
    print("[PASS] GET /api/staff strictly returns only owner's staff.")

    # 6. IDOR (Direct Object Access) Tests
    print("\n--- 6. TESTING DIRECT OBJECT ACCESS (IDOR PROTECTION) ---")
    # Single item GET
    assert client_a.get(f"/api/companies/{comp_b_id}").status_code == 404, "User A must NOT be able to GET User B's company"
    assert client_b.get(f"/api/companies/{comp_a_id}").status_code == 404, "User B must NOT be able to GET User A's company"
    assert client_a.get(f"/api/companies/{comp_a_id}").status_code == 200, "User A should be able to GET their own company"
    print("[PASS] GET /api/companies/{id} cross-user access rejected (404).")

    assert client_a.get(f"/api/projects/{proj_b_id}").status_code == 404, "User A must NOT be able to GET User B's project"
    assert client_b.get(f"/api/projects/{proj_a_id}").status_code == 404, "User B must NOT be able to GET User A's project"
    assert client_a.get(f"/api/projects/{proj_a_id}").status_code == 200, "User A should be able to GET their own project"
    print("[PASS] GET /api/projects/{id} cross-user access rejected (404).")

    assert client_a.get(f"/api/staff/{staff_b_id}").status_code == 404, "User A must NOT be able to GET User B's staff"
    assert client_b.get(f"/api/staff/{staff_a_id}").status_code == 404, "User B must NOT be able to GET User A's staff"
    assert client_a.get(f"/api/staff/{staff_a_id}").status_code == 200, "User A should be able to GET their own staff"
    print("[PASS] GET /api/staff/{id} cross-user access rejected (404).")

    # PUT cross-user updates
    assert client_a.put(f"/api/companies/{comp_b_id}?name=HACKED").status_code == 404, "User A must NOT be able to PUT User B's company"
    assert client_a.put(f"/api/projects/{proj_b_id}?name=HACKED").status_code == 404, "User A must NOT be able to PUT User B's project"
    assert client_a.put(f"/api/staff/{staff_b_id}?name=HACKED").status_code == 404, "User A must NOT be able to PUT User B's staff"
    print("[PASS] PUT cross-user updates rejected (404).")

    # DELETE cross-user deletions
    assert client_a.delete(f"/api/companies/{comp_b_id}").status_code == 404, "User A must NOT be able to DELETE User B's company"
    assert client_a.delete(f"/api/projects/{proj_b_id}").status_code == 404, "User A must NOT be able to DELETE User B's project"
    assert client_a.delete(f"/api/staff/{staff_b_id}").status_code == 404, "User A must NOT be able to DELETE User B's staff"
    print("[PASS] DELETE cross-user deletions rejected (404).")

    # 7. Cross-Entity Foreign Key Relationship Isolation
    print("\n--- 7. TESTING CROSS-ENTITY RELATIONSHIP INTEGRITY ---")
    # User A tries to create a project linking to User B's private company
    res_cross_link = client_a.post(f"/api/projects?name=IllegalProject&company_id={comp_b_id}")
    assert res_cross_link.status_code == 400, f"Cross-company linking must be rejected with 400! Got {res_cross_link.status_code}"
    print("[PASS] User A cannot attach project to User B's company (400 Bad Request).")

    # User A tries to update a project to point to User B's company
    res_cross_update = client_a.put(f"/api/projects/{proj_a_id}?company_id={comp_b_id}")
    assert res_cross_update.status_code == 400, f"Cross-company updating must be rejected with 400! Got {res_cross_update.status_code}"
    print("[PASS] User A cannot update project to point to User B's company (400 Bad Request).")

    # 8. Ownership Spoofing Prevention
    print("\n--- 8. TESTING CLIENT-SIDE OWNERSHIP SPOOFING PREVENTION ---")
    res_spoof = client_a.post(f"/api/companies?name=SpoofedCompany&user_id={user_b.id}")
    assert res_spoof.status_code == 200
    spoofed_id = res_spoof.json()["id"]
    with SessionLocal() as s:
        db_rec = s.query(models.Company).filter(models.Company.id == spoofed_id).first()
        assert db_rec.user_id == user_a.id, f"Ownership spoofing succeeded! Expected owner {user_a.id}, got {db_rec.user_id}"
    print("[PASS] Client-provided user_id is completely ignored by backend.")

    # 9. Verify User 13 (Legacy owner) is completely unaffected
    print("\n--- 9. VERIFYING LEGACY DATA PRESERVATION ---")
    with SessionLocal() as s:
        user_13 = s.query(models.User).filter(models.User.id == 13).first()
        if user_13:
            token_13 = create_access_token({"sub": str(user_13.id), "email": user_13.email})
            client_13 = TestClient(app, cookies={"erytmo_token": token_13})
            comps_13 = client_13.get("/api/companies").json()
            names_13 = [c["name"] for c in comps_13]
            assert "TITRAFILM" in names_13 and "Dubbing Brothers" in names_13, "User 13 lost legacy companies!"
            print(f"[PASS] User 13 ({user_13.email}) preserves their companies: {names_13}")

    print("\n" + "=" * 70)
    print("ALL MULTI-USER DATA ISOLATION & AUTHORIZATION TESTS PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    run_comprehensive_isolation_verification()
