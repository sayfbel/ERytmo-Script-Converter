import os
import sys
import uuid
import datetime
from fastapi.testclient import TestClient

# Ensure root dir is in sys.path
root_dir = os.path.dirname(os.path.abspath(__file__))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.main import app
from backend.database.database import SessionLocal, init_db
from backend.models import models
from backend.routes.auth import create_access_token, hash_password

def run_security_isolation_tests():
    print("=" * 60)
    print("RUNNING MULTI-USER DATA ISOLATION SECURITY TESTS")
    print("=" * 60)

    init_db()
    db = SessionLocal()

    # 1. Create User A and User B
    tag = uuid.uuid4().hex[:8]
    user_a_email = f"user_a_{tag}@isolation-test.com"
    user_b_email = f"user_b_{tag}@isolation-test.com"
    user_c_email = f"user_c_empty_{tag}@isolation-test.com"

    user_a = models.User(
        first_name="UserA",
        last_name="Owner",
        email=user_a_email,
        password_hash=hash_password("Secret123!"),
        email_verified=True
    )
    user_b = models.User(
        first_name="UserB",
        last_name="Other",
        email=user_b_email,
        password_hash=hash_password("Secret123!"),
        email_verified=True
    )
    user_c = models.User(
        first_name="UserC",
        last_name="EmptyWorkspace",
        email=user_c_email,
        password_hash=hash_password("Secret123!"),
        email_verified=True
    )

    db.add_all([user_a, user_b, user_c])
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)
    db.refresh(user_c)

    print(f"Created Test Users: User A (ID: {user_a.id}), User B (ID: {user_b.id}), User C (ID: {user_c.id})")

    # Generate Auth Tokens
    token_a = create_access_token({"sub": str(user_a.id), "email": user_a.email})
    token_b = create_access_token({"sub": str(user_b.id), "email": user_b.email})
    token_c = create_access_token({"sub": str(user_c.id), "email": user_c.email})

    client_a = TestClient(app, cookies={"erytmo_token": token_a})
    client_b = TestClient(app, cookies={"erytmo_token": token_b})
    client_c = TestClient(app, cookies={"erytmo_token": token_c})

    # ==========================================================
    # TEST 1: EMPTY USER VERIFICATION
    # ==========================================================
    print("\n--- Test 1: Empty User Isolation ---")
    res = client_c.get("/api/companies")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert len(res.json()) == 0, f"User C should have 0 companies, got {len(res.json())}"

    res = client_c.get("/api/projects")
    assert res.status_code == 200
    assert len(res.json()) == 0, f"User C should have 0 projects, got {len(res.json())}"

    res = client_c.get("/api/staff")
    assert res.status_code == 200
    assert len(res.json()) == 0, f"User C should have 0 staff, got {len(res.json())}"

    res = client_c.get("/api/appointments")
    assert res.status_code == 200
    assert len(res.json()) == 0, f"User C should have 0 appointments, got {len(res.json())}"

    res = client_c.get("/api/settings/keys")
    assert res.status_code == 200
    assert len(res.json()) == 0, f"User C should have 0 API keys, got {len(res.json())}"

    print("[PASS] User C starts with a completely isolated, empty workspace!")

    # ==========================================================
    # TEST 2: COMPANIES ISOLATION
    # ==========================================================
    print("\n--- Test 2: Companies Isolation ---")
    # User A creates Company A
    res_ca = client_a.post("/api/companies?name=Company_Alpha_A&description=Owned_by_User_A")
    assert res_ca.status_code == 200, f"Failed to create Company A: {res_ca.text}"
    comp_a_id = res_ca.json()["id"]

    # User B creates Company B
    res_cb = client_b.post("/api/companies?name=Company_Beta_B&description=Owned_by_User_B")
    assert res_cb.status_code == 200, f"Failed to create Company B: {res_cb.text}"
    comp_b_id = res_cb.json()["id"]

    # User A lists companies -> receives only Company A
    res = client_a.get("/api/companies")
    assert res.status_code == 200
    a_comp_ids = [c["id"] for c in res.json()]
    assert comp_a_id in a_comp_ids, "Company A must be visible to User A"
    assert comp_b_id not in a_comp_ids, "Company B must NOT be visible to User A"

    # User B lists companies -> receives only Company B
    res = client_b.get("/api/companies")
    assert res.status_code == 200
    b_comp_ids = [c["id"] for c in res.json()]
    assert comp_b_id in b_comp_ids, "Company B must be visible to User B"
    assert comp_a_id not in b_comp_ids, "Company A must NOT be visible to User B"

    # User A attempts to UPDATE Company B -> rejected (404)
    res_hack_update = client_a.put(f"/api/companies/{comp_b_id}?name=HackedCompany")
    assert res_hack_update.status_code == 404, f"Expected 404, got {res_hack_update.status_code}"

    # Verify Company B name unchanged (via fresh DB session)
    with SessionLocal() as s:
        db_comp_b = s.query(models.Company).filter(models.Company.id == comp_b_id).first()
        assert db_comp_b is not None, f"Company B (id {comp_b_id}) not found in DB!"
        assert db_comp_b.name == "Company_Beta_B", "Company B name was illegally altered!"

    # User A attempts to DELETE Company B -> rejected (404)
    res_hack_delete = client_a.delete(f"/api/companies/{comp_b_id}")
    assert res_hack_delete.status_code == 404, f"Expected 404, got {res_hack_delete.status_code}"

    # Verify Company B still exists in DB
    with SessionLocal() as s:
        db_comp_b = s.query(models.Company).filter(models.Company.id == comp_b_id).first()
        assert db_comp_b is not None, "Company B was illegally deleted!"

    # Malicious attempt to spoof user_id on Company creation
    res_spoof = client_a.post(f"/api/companies?name=SpoofedCompany&user_id={user_b.id}")
    assert res_spoof.status_code == 200
    spoofed_comp_id = res_spoof.json()["id"]
    with SessionLocal() as s:
        db_spoofed = s.query(models.Company).filter(models.Company.id == spoofed_comp_id).first()
        assert db_spoofed.user_id == user_a.id, f"Spoofed user_id was accepted! Expected {user_a.id}, got {db_spoofed.user_id}"

    print("[PASS] Companies isolation, protection from unauthorized update/delete, and spoof prevention verified!")

    # ==========================================================
    # TEST 3: PROJECTS ISOLATION
    # ==========================================================
    print("\n--- Test 3: Projects Isolation ---")
    # User A creates Project A
    res_pa = client_a.post(f"/api/projects?name=Project_Alpha_A&company_id={comp_a_id}")
    assert res_pa.status_code == 200, f"Failed to create Project A: {res_pa.text}"
    proj_a_id = res_pa.json()["id"]

    # User B creates Project B
    res_pb = client_b.post(f"/api/projects?name=Project_Beta_B&company_id={comp_b_id}")
    assert res_pb.status_code == 200, f"Failed to create Project B: {res_pb.text}"
    proj_b_id = res_pb.json()["id"]

    # User A lists projects -> receives only Project A
    res = client_a.get("/api/projects")
    assert res.status_code == 200
    a_proj_ids = [p["id"] for p in res.json()]
    assert proj_a_id in a_proj_ids, "Project A must be visible to User A"
    assert proj_b_id not in a_proj_ids, "Project B must NOT be visible to User A"

    # User B lists projects -> receives only Project B
    res = client_b.get("/api/projects")
    assert res.status_code == 200
    b_proj_ids = [p["id"] for p in res.json()]
    assert proj_b_id in b_proj_ids, "Project B must be visible to User B"
    assert proj_a_id not in b_proj_ids, "Project A must NOT be visible to User B"

    # User A attempts to UPDATE Project B -> rejected (404)
    res_hack_proj_upd = client_a.put(f"/api/projects/{proj_b_id}?name=HackedProject")
    assert res_hack_proj_upd.status_code == 404

    # User A attempts to DELETE Project B -> rejected (404)
    res_hack_proj_del = client_a.delete(f"/api/projects/{proj_b_id}")
    assert res_hack_proj_del.status_code == 404

    # User A attempts to link project to User B's company -> rejected (400)
    res_illegal_company = client_a.post(f"/api/projects?name=IllegalProject&company_id={comp_b_id}")
    assert res_illegal_company.status_code == 400, f"Expected 400 Bad Request, got {res_illegal_company.status_code}"

    print("[PASS] Projects isolation, unauthorized mutation protection, and cross-company link rejection verified!")

    # ==========================================================
    # TEST 4: STAFF ISOLATION
    # ==========================================================
    print("\n--- Test 4: Staff Isolation ---")
    # User A creates Staff A
    res_sa = client_a.post("/api/staff?name=Staff_Alpha&task=Detection&email=staff_a@test.com")
    assert res_sa.status_code == 200, f"Failed to create Staff A: {res_sa.text}"
    staff_a_id = res_sa.json()["id"]

    # User B creates Staff B
    res_sb = client_b.post("/api/staff?name=Staff_Beta&task=Conformation&email=staff_b@test.com")
    assert res_sb.status_code == 200, f"Failed to create Staff B: {res_sb.text}"
    staff_b_id = res_sb.json()["id"]

    # User A lists staff -> receives only Staff A
    res = client_a.get("/api/staff")
    assert res.status_code == 200
    a_staff_ids = [s["id"] for s in res.json()]
    assert staff_a_id in a_staff_ids, "Staff A must be visible to User A"
    assert staff_b_id not in a_staff_ids, "Staff B must NOT be visible to User A"

    # User B lists staff -> receives only Staff B
    res = client_b.get("/api/staff")
    assert res.status_code == 200
    b_staff_ids = [s["id"] for s in res.json()]
    assert staff_b_id in b_staff_ids, "Staff B must be visible to User B"
    assert staff_a_id not in b_staff_ids, "Staff A must NOT be visible to User B"

    # User A attempts to UPDATE Staff B -> rejected (404)
    res_hack_staff_upd = client_a.put(f"/api/staff/{staff_b_id}?name=HackedStaff")
    assert res_hack_staff_upd.status_code == 404

    # User A attempts to DELETE Staff B -> rejected (404)
    res_hack_staff_del = client_a.delete(f"/api/staff/{staff_b_id}")
    assert res_hack_staff_del.status_code == 404

    print("[PASS] Staff isolation and cross-user update/delete protection verified!")

    # ==========================================================
    # TEST 5: APPOINTMENTS ISOLATION
    # ==========================================================
    print("\n--- Test 5: Appointments Isolation ---")
    now_str = datetime.datetime.utcnow().isoformat() + "Z"
    end_str = (datetime.datetime.utcnow() + datetime.timedelta(hours=1)).isoformat() + "Z"

    # User A creates Appointment A
    res_aa = client_a.post(f"/api/appointments?title=Studio_A_Booking&type=Detection&start_time={now_str}&end_time={end_str}")
    assert res_aa.status_code == 200, f"Failed to create Appointment A: {res_aa.text}"
    appt_a_id = res_aa.json()["id"]

    # User B creates Appointment B
    res_ab = client_b.post(f"/api/appointments?title=Studio_B_Booking&type=Conformation&start_time={now_str}&end_time={end_str}")
    assert res_ab.status_code == 200, f"Failed to create Appointment B: {res_ab.text}"
    appt_b_id = res_ab.json()["id"]

    # User A lists appointments -> receives only Appointment A
    res = client_a.get("/api/appointments")
    assert res.status_code == 200
    a_appt_ids = [a["id"] for a in res.json()]
    assert appt_a_id in a_appt_ids, "Appointment A must be visible to User A"
    assert appt_b_id not in a_appt_ids, "Appointment B must NOT be visible to User A"

    # User B lists appointments -> receives only Appointment B
    res = client_b.get("/api/appointments")
    assert res.status_code == 200
    b_appt_ids = [a["id"] for a in res.json()]
    assert appt_b_id in b_appt_ids, "Appointment B must be visible to User B"
    assert appt_a_id not in b_appt_ids, "Appointment A must NOT be visible to User B"

    # User A attempts to UPDATE Appointment B -> rejected (404)
    res_hack_appt_upd = client_a.put(f"/api/appointments/{appt_b_id}?title=HackedBooking")
    assert res_hack_appt_upd.status_code == 404

    # User A attempts to DELETE Appointment B -> rejected (404)
    res_hack_appt_del = client_a.delete(f"/api/appointments/{appt_b_id}")
    assert res_hack_appt_del.status_code == 404

    print("[PASS] Appointments isolation and cross-user update/delete protection verified!")

    # ==========================================================
    # TEST 6: API KEYS ISOLATION
    # ==========================================================
    print("\n--- Test 6: API Keys Isolation ---")
    # Directly add user-owned API keys in DB to avoid external HTTP provider verification
    key_a = models.ApiKey(
        user_id=user_a.id,
        provider="gemini",
        key="AIzaSyTestKey_ForUserA",
        label="User A Gemini Key",
        is_active=True
    )
    key_b = models.ApiKey(
        user_id=user_b.id,
        provider="gemini",
        key="AIzaSyTestKey_ForUserB",
        label="User B Gemini Key",
        is_active=True
    )
    db.add_all([key_a, key_b])
    db.commit()
    db.refresh(key_a)
    db.refresh(key_b)

    # User A GET /api/settings/keys -> sees Key A only
    res = client_a.get("/api/settings/keys")
    assert res.status_code == 200
    a_key_ids = [k["id"] for k in res.json()]
    assert key_a.id in a_key_ids, "Key A must be visible to User A"
    assert key_b.id not in a_key_ids, "Key B must NOT be visible to User A"

    # User B GET /api/settings/keys -> sees Key B only
    res = client_b.get("/api/settings/keys")
    assert res.status_code == 200
    b_key_ids = [k["id"] for k in res.json()]
    assert key_b.id in b_key_ids, "Key B must be visible to User B"
    assert key_a.id not in b_key_ids, "Key A must NOT be visible to User B"

    # User A attempts to TOGGLE Key B status -> rejected (404)
    res_hack_key_toggle = client_a.patch(f"/api/settings/keys/{key_b.id}/toggle")
    assert res_hack_key_toggle.status_code == 404

    # User A attempts to DELETE Key B -> rejected (404)
    res_hack_key_del = client_a.delete(f"/api/settings/keys/{key_b.id}")
    assert res_hack_key_del.status_code == 404

    print("[PASS] API Keys isolation and cross-user modification protection verified!")

    # Clean up test entities created
    print("\n--- Cleaning up test records ---")
    db.query(models.Project).filter(models.Project.user_id.in_([user_a.id, user_b.id, user_c.id])).delete(synchronize_session=False)
    db.query(models.Company).filter(models.Company.user_id.in_([user_a.id, user_b.id, user_c.id])).delete(synchronize_session=False)
    db.query(models.Staff).filter(models.Staff.user_id.in_([user_a.id, user_b.id, user_c.id])).delete(synchronize_session=False)
    db.query(models.Appointment).filter(models.Appointment.user_id.in_([user_a.id, user_b.id, user_c.id])).delete(synchronize_session=False)
    db.query(models.ApiKey).filter(models.ApiKey.user_id.in_([user_a.id, user_b.id, user_c.id])).delete(synchronize_session=False)
    db.query(models.User).filter(models.User.id.in_([user_a.id, user_b.id, user_c.id])).delete(synchronize_session=False)
    db.commit()
    db.close()

    print("\n" + "=" * 60)
    print("ALL MULTI-USER DATA ISOLATION TESTS PASSED SUCCESSFULLY! (100% ISOLATED)")
    print("=" * 60)

if __name__ == "__main__":
    run_security_isolation_tests()
