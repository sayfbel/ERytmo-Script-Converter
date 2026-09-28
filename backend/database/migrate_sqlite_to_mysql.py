"""
Migration Script: Transfer data from local SQLite (erytmo.db) to XAMPP MySQL (erytmo_db).
Usage:
    python backend/database/migrate_sqlite_to_mysql.py
"""

import os
import sys
from dotenv import load_dotenv

# Path setup
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_dir = os.path.dirname(backend_dir)
sys.path.insert(0, root_dir)

load_dotenv(os.path.join(root_dir, ".env"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import models

def migrate():
    # 1. Source: SQLite
    sqlite_path = os.path.join(backend_dir, "database", "erytmo.db")
    if not os.path.exists(sqlite_path):
        print(f"[Error] SQLite database not found at {sqlite_path}")
        return

    sqlite_engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})
    SqliteSession = sessionmaker(bind=sqlite_engine)
    src_db = SqliteSession()

    # 2. Target: MySQL in XAMPP
    mysql_user = os.getenv("MYSQL_USER", "root")
    mysql_password = os.getenv("MYSQL_PASSWORD", "")
    mysql_host = os.getenv("MYSQL_HOST", "localhost")
    mysql_port = os.getenv("MYSQL_PORT", "3306")
    mysql_db = os.getenv("MYSQL_DATABASE", "erytmo_db")

    mysql_url = os.getenv("DATABASE_URL")
    if not mysql_url or not mysql_url.startswith("mysql"):
        mysql_url = f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_db}?charset=utf8mb4"

    print(f"Connecting to MySQL: {mysql_host}:{mysql_port}/{mysql_db} ...")
    try:
        # Auto-create target database if needed
        import pymysql
        conn = pymysql.connect(
            host=mysql_host,
            user=mysql_user,
            password=mysql_password,
            port=int(mysql_port),
            charset="utf8mb4"
        )
        with conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{mysql_db}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        conn.commit()
        conn.close()

        mysql_engine = create_engine(mysql_url, pool_pre_ping=True)
        # Create all tables in target
        models.Base.metadata.create_all(bind=mysql_engine)
        MysqlSession = sessionmaker(bind=mysql_engine)
        tgt_db = MysqlSession()
    except Exception as e:
        print(f"[Error] Failed to connect to MySQL in XAMPP: {e}")
        print("Please make sure XAMPP Apache & MySQL are started.")
        return

    print("Beginning table-by-table migration...")

    # A. Users
    users = src_db.query(models.User).all()
    print(f"Migrating {len(users)} users...")
    for u in users:
        existing = tgt_db.query(models.User).filter_by(id=u.id).first()
        if not existing:
            tgt_db.add(models.User(
                id=u.id,
                first_name=u.first_name,
                last_name=u.last_name,
                email=u.email,
                password_hash=u.password_hash,
                phone_number=u.phone_number,
                google_id=u.google_id,
                email_verified=u.email_verified,
                created_at=u.created_at,
                updated_at=u.updated_at
            ))
    tgt_db.commit()

    # B. Companies
    companies = src_db.query(models.Company).all()
    print(f"Migrating {len(companies)} companies...")
    for c in companies:
        existing = tgt_db.query(models.Company).filter_by(id=c.id).first()
        if not existing:
            tgt_db.add(models.Company(
                id=c.id,
                user_id=c.user_id,
                name=c.name,
                description=c.description,
                rate_detection=c.rate_detection,
                rate_conformation=c.rate_conformation,
                rate_pose_texte=c.rate_pose_texte,
                rate_chantant=c.rate_chantant,
                supplier_email=c.supplier_email,
                target_software=c.target_software,
                created_at=c.created_at
            ))
    tgt_db.commit()

    # C. Projects
    projects = src_db.query(models.Project).all()
    print(f"Migrating {len(projects)} projects...")
    for p in projects:
        existing = tgt_db.query(models.Project).filter_by(id=p.id).first()
        if not existing:
            tgt_db.add(models.Project(
                id=p.id,
                user_id=p.user_id,
                name=p.name,
                company_id=p.company_id,
                company_name=p.company_name,
                folder_path=p.folder_path,
                target_software=p.target_software,
                project_type=p.project_type,
                deadline=p.deadline,
                total_time=p.total_time,
                status=p.status,
                created_at=p.created_at
            ))
    tgt_db.commit()

    # D. Staff
    staff_members = src_db.query(models.Staff).all()
    print(f"Migrating {len(staff_members)} staff members...")
    for s in staff_members:
        existing = tgt_db.query(models.Staff).filter_by(id=s.id).first()
        if not existing:
            tgt_db.add(models.Staff(
                id=s.id,
                user_id=s.user_id,
                staff_user_id=s.staff_user_id,
                name=s.name,
                email=s.email,
                task=s.task,
                created_at=s.created_at
            ))
    tgt_db.commit()

    # E. Appointments
    appointments = src_db.query(models.Appointment).all()
    print(f"Migrating {len(appointments)} appointments...")
    for a in appointments:
        existing = tgt_db.query(models.Appointment).filter_by(id=a.id).first()
        if not existing:
            tgt_db.add(models.Appointment(
                id=a.id,
                user_id=a.user_id,
                title=a.title,
                type=a.type,
                start_time=a.start_time,
                end_time=a.end_time,
                created_at=a.created_at
            ))
    tgt_db.commit()

    # F. Api Keys
    keys = src_db.query(models.ApiKey).all()
    print(f"Migrating {len(keys)} api keys...")
    for k in keys:
        existing = tgt_db.query(models.ApiKey).filter_by(id=k.id).first()
        if not existing:
            tgt_db.add(models.ApiKey(
                id=k.id,
                user_id=k.user_id,
                provider=k.provider,
                key=k.key,
                label=k.label,
                is_active=k.is_active,
                created_at=k.created_at
            ))
    tgt_db.commit()

    src_db.close()
    tgt_db.close()
    print("\n[SUCCESS] Migration from SQLite to MySQL completed successfully!")

if __name__ == "__main__":
    migrate()
