#!/usr/bin/env python3
"""
Seed realistic fake data for Saif Belfaquir's account (User ID 1) in DubFlow:
- Companies (Dubbing studios & broadcasters)
- Staff (Collaborators with roles, linked user accounts & permissions)
- Projects (Dubbing productions with deadlines, descriptions & collaborators)
- Appointments (Studio recording & mixing sessions)
"""

import os
import sys
import json
import datetime

# Ensure project root is in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.database.database import SessionLocal
from backend.models import models
from backend.services.auth_service import hash_password

def seed_data():
    db = SessionLocal()
    try:
        # 1. Locate Saif Belfaquir's account
        user = db.query(models.User).filter(
            (models.User.email == "hamza.emilie23@gmail.com") |
            ((models.User.first_name.ilike("%saif%")) & (models.User.last_name.ilike("%belfaquir%")))
        ).first()

        if not user:
            print("[Error] Saif Belfaquir's user account was not found in database!")
            return

        print(f"[Seed] Found target user: {user.first_name} {user.last_name} (ID: {user.id}, Email: {user.email})")

        # 2. Seed Companies for Saif Belfaquir
        companies_data = [
            {
                "name": "Dubbing Brothers International",
                "description": "Studio européen historique spécialisé dans le doublage cinématographique de prestige et la postsynchronisation.",
                "rate_detection": 48,
                "rate_conformation": 38,
                "rate_pose_texte": 55,
                "rate_chantant": 75,
                "supplier_email": "production@dubbing-brothers.com",
                "target_software": "DubFlow"
            },
            {
                "name": "Netflix Worldwide Dubbing",
                "description": "Pôle de localisation multilingue pour les productions originales et séries internationales Netflix.",
                "rate_detection": 52,
                "rate_conformation": 42,
                "rate_pose_texte": 60,
                "rate_chantant": 85,
                "supplier_email": "partner-delivery@netflix.com",
                "target_software": "Mosaic"
            },
            {
                "name": "TitraFilm Post-Production",
                "description": "Laboratoire et auditorium de doublage, sous-titrage et mixage Dolby Atmos agréé.",
                "rate_detection": 45,
                "rate_conformation": 35,
                "rate_pose_texte": 50,
                "rate_chantant": 70,
                "supplier_email": "contact@titrafilm.com",
                "target_software": "DubFlow"
            },
            {
                "name": "Canal+ Création Originale",
                "description": "Département acquisitions et doublage français pour les séries et longs-métrages Canal+.",
                "rate_detection": 46,
                "rate_conformation": 36,
                "rate_pose_texte": 52,
                "rate_chantant": 72,
                "supplier_email": "acquisitions@canal-plus.com",
                "target_software": "Cappella"
            },
            {
                "name": "Crunchyroll Localisation EMEA",
                "description": "Leader mondial du streaming d'animation japonaise et du doublage simulcast express.",
                "rate_detection": 50,
                "rate_conformation": 40,
                "rate_pose_texte": 58,
                "rate_chantant": 80,
                "supplier_email": "simulcast@crunchyroll.com",
                "target_software": "DubFlow"
            },
            {
                "name": "Mediawan Studios Paris",
                "description": "Maison de production audiovisuelle majeure en fiction, animation et documentaire.",
                "rate_detection": 44,
                "rate_conformation": 34,
                "rate_pose_texte": 48,
                "rate_chantant": 68,
                "supplier_email": "studios@mediawan.com",
                "target_software": "Mosaic"
            }
        ]

        created_companies = []
        for cdata in companies_data:
            existing = db.query(models.Company).filter(
                models.Company.user_id == user.id,
                models.Company.name == cdata["name"]
            ).first()

            if not existing:
                comp = models.Company(
                    user_id=user.id,
                    name=cdata["name"],
                    description=cdata["description"],
                    rate_detection=cdata["rate_detection"],
                    rate_conformation=cdata["rate_conformation"],
                    rate_pose_texte=cdata["rate_pose_texte"],
                    rate_chantant=cdata["rate_chantant"],
                    supplier_email=cdata["supplier_email"],
                    target_software=cdata["target_software"]
                )
                db.add(comp)
                created_companies.append(comp)
            else:
                created_companies.append(existing)

        db.commit()
        for c in created_companies:
            db.refresh(c)
        print(f"[Seed] Successfully added/verified {len(created_companies)} companies.")

        # 3. Seed Staff Members & Associated User Accounts
        staff_data = [
            {
                "first_name": "Yassine",
                "last_name": "Mansouri",
                "email": "yassine.mansouri@dubflow.io",
                "job_type": "Ingénieur du Son / Sound Designer",
                "phone_number": "+212 661 234567",
                "task": "Ingénieur du Son & Mixage Plateau",
                "access_level": "full_access",
                "auto_accept_transfers": True
            },
            {
                "first_name": "Sarah",
                "last_name": "Benali",
                "email": "sarah.benali@dubflow.io",
                "job_type": "Auteure / Adaptatrice Rythmo",
                "phone_number": "+212 662 345678",
                "task": "Détection & Adaptation Rythmo",
                "access_level": "full_access",
                "auto_accept_transfers": False
            },
            {
                "first_name": "Karim",
                "last_name": "El Amrani",
                "email": "karim.elamrani@dubflow.io",
                "job_type": "Comédien Voix Off / Voice Talent",
                "phone_number": "+212 663 456789",
                "task": "Voix Rôles Principaux & Doublage",
                "access_level": "spectator",
                "auto_accept_transfers": True
            },
            {
                "first_name": "Nadia",
                "last_name": "Tazi",
                "email": "nadia.tazi@dubflow.io",
                "job_type": "Directrice Artistique",
                "phone_number": "+212 664 567890",
                "task": "Direction Artistique & Casting",
                "access_level": "full_access",
                "auto_accept_transfers": False
            },
            {
                "first_name": "Alexandre",
                "last_name": "Dupont",
                "email": "a.dupont@titrafilm.com",
                "job_type": "Monteur Son & Conformation",
                "phone_number": "+33 6 12 34 56 78",
                "task": "Conformation Dialogue & Synchronisation",
                "access_level": "spectator",
                "auto_accept_transfers": False
            },
            {
                "first_name": "Mehdi",
                "last_name": "Chraibi",
                "email": "mehdi.chraibi@dubflow.io",
                "job_type": "Mixeur Dolby Atmos",
                "phone_number": "+212 665 678901",
                "task": "Mixage Final 5.1 & Dolby Atmos",
                "access_level": "full_access",
                "auto_accept_transfers": True
            },
            {
                "first_name": "Camille",
                "last_name": "Laurent",
                "email": "camille.laurent@dubbingbrothers.com",
                "job_type": "Calligraphe & Détectrice",
                "phone_number": "+33 6 98 76 54 32",
                "task": "Pose de Texte & Calligraphie Rythmo",
                "access_level": "spectator",
                "auto_accept_transfers": True
            }
        ]

        created_staff = []
        default_pwd_hash = hash_password("DubFlow@2026")

        for sdata in staff_data:
            # Create user account for staff member if doesn't exist
            staff_user = db.query(models.User).filter(models.User.email == sdata["email"]).first()
            if not staff_user:
                staff_user = models.User(
                    first_name=sdata["first_name"],
                    last_name=sdata["last_name"],
                    email=sdata["email"],
                    password_hash=default_pwd_hash,
                    phone_number=sdata["phone_number"],
                    job_type=sdata["job_type"],
                    email_verified=True,
                    is_private=False
                )
                db.add(staff_user)
                db.commit()
                db.refresh(staff_user)

            # Check if already added to Saif's staff
            full_name = f"{sdata['first_name']} {sdata['last_name']}"
            existing_staff = db.query(models.Staff).filter(
                models.Staff.user_id == user.id,
                models.Staff.email == sdata["email"]
            ).first()

            if not existing_staff:
                staff_member = models.Staff(
                    user_id=user.id,
                    staff_user_id=staff_user.id,
                    name=full_name,
                    email=sdata["email"],
                    task=sdata["task"],
                    access_level=sdata["access_level"],
                    auto_accept_transfers=sdata["auto_accept_transfers"]
                )
                db.add(staff_member)
                created_staff.append(staff_member)
            else:
                created_staff.append(existing_staff)

        db.commit()
        for s in created_staff:
            db.refresh(s)
        print(f"[Seed] Successfully added/verified {len(created_staff)} staff members.")

        # 4. Seed Projects for Saif Belfaquir
        company_map = {c.name: c for c in created_companies}
        
        # Prepare sample collaborator assignment lists
        collab_set_1 = json.dumps([
            {"staff_id": created_staff[0].id, "staff_name": created_staff[0].name, "staff_email": created_staff[0].email, "role": "Ingénieur du Son", "access_level": "full_access", "can_update_project_file": True},
            {"staff_id": created_staff[1].id, "staff_name": created_staff[1].name, "staff_email": created_staff[1].email, "role": "Adaptatrice", "access_level": "full_access", "can_update_project_file": True},
            {"staff_id": created_staff[2].id, "staff_name": created_staff[2].name, "staff_email": created_staff[2].email, "role": "Comédien Voix Off", "access_level": "spectator", "can_update_project_file": False}
        ])

        collab_set_2 = json.dumps([
            {"staff_id": created_staff[3].id, "staff_name": created_staff[3].name, "staff_email": created_staff[3].email, "role": "Directrice Artistique", "access_level": "full_access", "can_update_project_file": True},
            {"staff_id": created_staff[5].id, "staff_name": created_staff[5].name, "staff_email": created_staff[5].email, "role": "Mixeur Dolby Atmos", "access_level": "full_access", "can_update_project_file": True}
        ])

        collab_set_3 = json.dumps([
            {"staff_id": created_staff[4].id, "staff_name": created_staff[4].name, "staff_email": created_staff[4].email, "role": "Monteur Son", "access_level": "spectator", "can_update_project_file": False},
            {"staff_id": created_staff[6].id, "staff_name": created_staff[6].name, "staff_email": created_staff[6].email, "role": "Calligraphe", "access_level": "spectator", "can_update_project_file": False}
        ])

        projects_data = [
            {
                "name": "Cyberpunk: Edgerunners - S01E01",
                "company_name": "Netflix Worldwide Dubbing",
                "project_type": "Série Animation",
                "target_software": "DubFlow",
                "total_time": 28,
                "status": "active",
                "description": "Enregistrement version française officielle. Mixage Dolby Atmos et conformation des répliques rythmo.",
                "deadline": datetime.datetime.utcnow() + datetime.timedelta(days=12),
                "collaborators": collab_set_1
            },
            {
                "name": "Dune: Prophecy - Épisode Pilote",
                "company_name": "Dubbing Brothers International",
                "project_type": "Série Fiction",
                "target_software": "DubFlow",
                "total_time": 65,
                "status": "active",
                "description": "Adaptation française des dialogues et bande rythmo synchrone 24fps pour diffusion Canal+ / HBO.",
                "deadline": datetime.datetime.utcnow() + datetime.timedelta(days=20),
                "collaborators": collab_set_2
            },
            {
                "name": "Spider-Man: Beyond the Spider-Verse (VF)",
                "company_name": "TitraFilm Post-Production",
                "project_type": "Long-Métrage",
                "target_software": "Mosaic",
                "total_time": 138,
                "status": "active",
                "description": "Export Mosaic Excel et validation des dialogues en auditorium A avec comédiens principaux.",
                "deadline": datetime.datetime.utcnow() + datetime.timedelta(days=35),
                "collaborators": collab_set_1
            },
            {
                "name": "L'Attaque des Titans - Final Season Part 3",
                "company_name": "Crunchyroll Localisation EMEA",
                "project_type": "Série Animation",
                "target_software": "DubFlow",
                "total_time": 48,
                "status": "completed",
                "description": "Enregistrement terminé, export des bandes rythmo validé et livré au client sous format .docx.",
                "deadline": datetime.datetime.utcnow() - datetime.timedelta(days=5),
                "collaborators": collab_set_3
            },
            {
                "name": "Le Bureau des Légendes - Reboot Saison 1",
                "company_name": "Canal+ Création Originale",
                "project_type": "Série Fiction",
                "target_software": "Cappella",
                "total_time": 52,
                "status": "active",
                "description": "Détection en cours. Conformation temporelle et session comédiens programmée.",
                "deadline": datetime.datetime.utcnow() + datetime.timedelta(days=18),
                "collaborators": collab_set_2
            }
        ]

        created_projects = []
        for pdata in projects_data:
            existing = db.query(models.Project).filter(
                models.Project.user_id == user.id,
                models.Project.name == pdata["name"]
            ).first()

            comp_obj = company_map.get(pdata["company_name"])
            comp_id = comp_obj.id if comp_obj else None

            if not existing:
                proj = models.Project(
                    user_id=user.id,
                    name=pdata["name"],
                    company_id=comp_id,
                    company_name=pdata["company_name"],
                    project_type=pdata["project_type"],
                    target_software=pdata["target_software"],
                    total_time=pdata["total_time"],
                    status=pdata["status"],
                    description=pdata["description"],
                    deadline=pdata["deadline"],
                    collaborators=pdata["collaborators"]
                )
                db.add(proj)
                created_projects.append(proj)
            else:
                created_projects.append(existing)

        db.commit()
        print(f"[Seed] Successfully added/verified {len(created_projects)} projects.")

        # 5. Seed Appointments for Saif's Studio Schedule
        now = datetime.datetime.utcnow()
        appointments_data = [
            {
                "title": "Session Voix Off - Cyberpunk E01 (Karim El Amrani)",
                "type": "Enregistrement",
                "start_time": now + datetime.timedelta(days=1, hours=10),
                "end_time": now + datetime.timedelta(days=1, hours=14)
            },
            {
                "title": "Mixage Final Dolby Atmos - Dune Prophecy",
                "type": "Mixage",
                "start_time": now + datetime.timedelta(days=3, hours=14),
                "end_time": now + datetime.timedelta(days=3, hours=18)
            },
            {
                "title": "Validation Conformation & Calligraphie - Spider-Man",
                "type": "Conformation",
                "start_time": now + datetime.timedelta(days=5, hours=9),
                "end_time": now + datetime.timedelta(days=5, hours=12)
            },
            {
                "title": "Réunion de Production & Casting - Canal+",
                "type": "Production",
                "start_time": now + datetime.timedelta(days=7, hours=11),
                "end_time": now + datetime.timedelta(days=7, hours=12, minutes=30)
            }
        ]

        created_appointments = []
        for adata in appointments_data:
            existing = db.query(models.Appointment).filter(
                models.Appointment.user_id == user.id,
                models.Appointment.title == adata["title"]
            ).first()

            if not existing:
                app = models.Appointment(
                    user_id=user.id,
                    title=adata["title"],
                    type=adata["type"],
                    start_time=adata["start_time"],
                    end_time=adata["end_time"]
                )
                db.add(app)
                created_appointments.append(app)
            else:
                created_appointments.append(existing)

        db.commit()
        print(f"[Seed] Successfully added/verified {len(created_appointments)} appointments.")

        print("\n" + "="*70)
        print("[SUCCESS] FAKE DATA SEEDING COMPLETE FOR SAIF BELFAQUIR!")
        print(f" -> Companies: {len(created_companies)}")
        print(f" -> Staff Members: {len(created_staff)}")
        print(f" -> Projects: {len(created_projects)}")
        print(f" -> Appointments: {len(created_appointments)}")
        print("="*70 + "\n")

    except Exception as e:
        db.rollback()
        print(f"[Error] Failed to seed data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
