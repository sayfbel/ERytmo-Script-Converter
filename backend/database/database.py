from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import json
from dotenv import load_dotenv

# Load environment variables
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(root_dir, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
load_dotenv()

DB_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_URL = f"sqlite:///{os.path.join(DB_DIR, 'erytmo.db')}"

# Determine Database URL
raw_db_url = os.getenv("DATABASE_URL")
if not raw_db_url and os.getenv("MYSQL_HOST"):
    mysql_user = os.getenv("MYSQL_USER", "root")
    mysql_password = os.getenv("MYSQL_PASSWORD", "")
    mysql_host = os.getenv("MYSQL_HOST", "localhost")
    mysql_port = os.getenv("MYSQL_PORT", "3306")
    mysql_db = os.getenv("MYSQL_DATABASE", "erytmo_db")
    raw_db_url = f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_db}?charset=utf8mb4"

SQLALCHEMY_DATABASE_URL = raw_db_url if raw_db_url else SQLITE_URL
is_mysql = SQLALCHEMY_DATABASE_URL.startswith("mysql")

def _ensure_mysql_db_exists(url_str: str):
    """
    If using MySQL/MariaDB in XAMPP, automatically ensure the database exists.
    """
    try:
        from urllib.parse import urlparse
        clean_url = url_str.replace("mysql+pymysql://", "http://").replace("mysql://", "http://")
        parsed = urlparse(clean_url)
        db_name = parsed.path.lstrip("/").split("?")[0]
        if not db_name:
            return

        import pymysql
        user = parsed.username or "root"
        password = parsed.password or ""
        host = parsed.hostname or "localhost"
        port = parsed.port or 3306

        conn = pymysql.connect(
            host=host,
            user=user,
            password=password,
            port=port,
            charset="utf8mb4"
        )
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        conn.commit()
        conn.close()
        print(f"[Database] XAMPP MySQL database '{db_name}' verified/ready.")
    except Exception as e:
        print(f"[Database] MySQL auto-create notification: {e}")

if is_mysql:
    try:
        _ensure_mysql_db_exists(SQLALCHEMY_DATABASE_URL)
        test_engine = create_engine(
            SQLALCHEMY_DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=3600
        )
        with test_engine.connect() as test_conn:
            pass
        engine = test_engine
        print(f"[Database] Successfully connected to XAMPP MySQL ({SQLALCHEMY_DATABASE_URL})")
    except Exception as e:
        print(f"[Database Warning] Could not connect to MySQL in XAMPP ({e})")
        print(f"[Database] Falling back to local SQLite ({SQLITE_URL})")
        SQLALCHEMY_DATABASE_URL = SQLITE_URL
        is_mysql = False
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL,
            connect_args={"check_same_thread": False}
        )
else:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from backend.models import models
    Base.metadata.create_all(bind=engine)
    
    # Safe migrations for both SQLite and MySQL databases
    with engine.connect() as conn:
        # Migration: companies.user_id
        try:
            conn.execute(text("SELECT user_id FROM companies LIMIT 1"))
        except Exception:
            try:
                if is_mysql:
                    conn.execute(text("ALTER TABLE companies ADD COLUMN user_id INT NULL, ADD INDEX idx_companies_user_id (user_id), ADD CONSTRAINT fk_companies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"))
                else:
                    conn.execute(text("ALTER TABLE companies ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] companies.user_id: {e}")

        # Migration: appointments.user_id
        try:
            conn.execute(text("SELECT user_id FROM appointments LIMIT 1"))
        except Exception:
            try:
                if is_mysql:
                    conn.execute(text("ALTER TABLE appointments ADD COLUMN user_id INT NULL, ADD INDEX idx_appointments_user_id (user_id), ADD CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"))
                else:
                    conn.execute(text("ALTER TABLE appointments ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] appointments.user_id: {e}")

        # Migration: api_keys.user_id
        try:
            conn.execute(text("SELECT user_id FROM api_keys LIMIT 1"))
        except Exception:
            try:
                if is_mysql:
                    conn.execute(text("ALTER TABLE api_keys ADD COLUMN user_id INT NULL, ADD INDEX idx_api_keys_user_id (user_id), ADD CONSTRAINT fk_api_keys_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"))
                else:
                    conn.execute(text("ALTER TABLE api_keys ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] api_keys.user_id: {e}")

        # Migration: api_keys.label
        try:
            conn.execute(text("SELECT label FROM api_keys LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE api_keys ADD COLUMN label VARCHAR(255)"))
                conn.commit()
            except Exception:
                pass

        # Migration: projects.user_id
        try:
            conn.execute(text("SELECT user_id FROM projects LIMIT 1"))
        except Exception:
            try:
                if is_mysql:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN user_id INT NULL, ADD INDEX idx_projects_user_id (user_id), ADD CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"))
                else:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] projects.user_id: {e}")

        # Migration: staff.user_id
        try:
            conn.execute(text("SELECT user_id FROM staff LIMIT 1"))
        except Exception:
            try:
                if is_mysql:
                    conn.execute(text("ALTER TABLE staff ADD COLUMN user_id INT NULL, ADD INDEX idx_staff_user_id (user_id), ADD CONSTRAINT fk_staff_owner FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"))
                else:
                    conn.execute(text("ALTER TABLE staff ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] staff.user_id: {e}")

        # Migration: staff.staff_user_id
        try:
            conn.execute(text("SELECT staff_user_id FROM staff LIMIT 1"))
        except Exception:
            try:
                if is_mysql:
                    conn.execute(text("ALTER TABLE staff ADD COLUMN staff_user_id INT NULL, ADD INDEX idx_staff_staff_user_id (staff_user_id), ADD CONSTRAINT fk_staff_user FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE SET NULL"))
                else:
                    conn.execute(text("ALTER TABLE staff ADD COLUMN staff_user_id INTEGER REFERENCES users(id)"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] staff.staff_user_id: {e}")

        # Migration: staff.access_level
        try:
            conn.execute(text("SELECT access_level FROM staff LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE staff ADD COLUMN access_level VARCHAR(32) NOT NULL DEFAULT 'spectator'"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] staff.access_level: {e}")

        # Migration: staff.auto_accept_transfers
        try:
            conn.execute(text("SELECT auto_accept_transfers FROM staff LIMIT 1"))
        except Exception:
            try:
                if is_mysql:
                    conn.execute(text("ALTER TABLE staff ADD COLUMN auto_accept_transfers BOOLEAN NOT NULL DEFAULT 0"))
                else:
                    conn.execute(text("ALTER TABLE staff ADD COLUMN auto_accept_transfers BOOLEAN NOT NULL DEFAULT 0"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] staff.auto_accept_transfers: {e}")

        # Migration: users.job_type
        try:
            conn.execute(text("SELECT job_type FROM users LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN job_type VARCHAR(100) NULL"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] users.job_type: {e}")

        # Migration: projects.files_index
        try:
            conn.execute(text("SELECT files_index FROM projects LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE projects ADD COLUMN files_index TEXT NULL"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] projects.files_index: {e}")


