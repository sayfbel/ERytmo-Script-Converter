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

# Determine Database URL
# DubFlow relies strictly on MySQL / MariaDB (via XAMPP locally or DATABASE_URL online)
raw_db_url = os.getenv("DATABASE_URL")

# Pytest / Unit Test isolated in-memory DB support
if raw_db_url and raw_db_url.startswith("sqlite"):
    SQLALCHEMY_DATABASE_URL = raw_db_url
    is_mysql = False
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # Standard Production / Local Environment -> Strictly MySQL (XAMPP or Cloud MySQL)
    if raw_db_url:
        if raw_db_url.startswith("mysql://"):
            raw_db_url = raw_db_url.replace("mysql://", "mysql+pymysql://", 1)
        if "ssl-mode=REQUIRED" in raw_db_url:
            raw_db_url = raw_db_url.replace("?ssl-mode=REQUIRED", "").replace("&ssl-mode=REQUIRED", "").replace("ssl-mode=REQUIRED", "")
    else:
        # Default to XAMPP MySQL credentials (host: localhost, port: 3306, user: root, password: "")
        mysql_user = os.getenv("MYSQL_USER", "root")
        mysql_password = os.getenv("MYSQL_PASSWORD", "")
        mysql_host = os.getenv("MYSQL_HOST", "localhost")
        mysql_port = os.getenv("MYSQL_PORT", "3306")
        mysql_db = os.getenv("MYSQL_DATABASE", "dubflow_db")
        raw_db_url = f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_db}?charset=utf8mb4"

    SQLALCHEMY_DATABASE_URL = raw_db_url
    is_mysql = True

    def _ensure_mysql_db_exists(url_str: str):
        """
        If using MySQL in XAMPP or local/cloud server, ensure the database exists.
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
            print(f"[Database] MySQL database '{db_name}' verified/ready.")
        except Exception as e:
            print(f"[Database Notification] Could not auto-create database (might already exist or server not yet reachable): {e}")

    _ensure_mysql_db_exists(SQLALCHEMY_DATABASE_URL)

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600
    )

    try:
        with engine.connect() as test_conn:
            test_conn.execute(text("SELECT 1"))
        print(f"[Database] Successfully connected to MySQL ({SQLALCHEMY_DATABASE_URL.split('@')[-1] if '@' in SQLALCHEMY_DATABASE_URL else 'MySQL'})")
    except Exception as e:
        print("\n" + "=" * 70)
        print(f"[Database Error] FAILED TO CONNECT TO MYSQL!")
        print(f"Details: {e}")
        print("SQLite fallback is completely DISABLED.")
        print("Please ensure XAMPP (MySQL) is running (port 3306) or verify your DATABASE_URL in .env.")
        print("=" * 70 + "\n")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _cleanup_expired_revoked_tokens():
    """Remove expired revoked tokens on startup. Safe to call repeatedly."""
    try:
        from backend.models import models
        import datetime
        db = SessionLocal()
        now = datetime.datetime.utcnow()
        deleted = db.query(models.RevokedToken).filter(
            models.RevokedToken.expires_at < now
        ).delete()
        db.commit()
        db.close()
        if deleted:
            print(f"[DB Cleanup] Removed {deleted} expired revoked token(s).")
    except Exception as e:
        print(f"[DB Cleanup] RevokedToken cleanup notification: {e}")

def init_db():
    from backend.models import models
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print("\n" + "=" * 70)
        print(f"[Database Error] Table initialization failed: {e}")
        print("DubFlow requires MySQL. Please start MySQL in XAMPP (port 3306) and restart.")
        print("=" * 70 + "\n")
        raise RuntimeError(f"Database connection failed: Cannot reach MySQL on localhost:3306. Please start XAMPP MySQL. Error: {e}")

    # Clean up expired revoked tokens on every startup
    _cleanup_expired_revoked_tokens()

    # Safe migrations for MySQL database
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

        # Migration: staff.status
        try:
            conn.execute(text("SELECT status FROM staff LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE staff ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'accepted'"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] staff.status: {e}")

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

        # Migration: projects.collaborators
        try:
            conn.execute(text("SELECT collaborators FROM projects LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE projects ADD COLUMN collaborators TEXT NULL"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] projects.collaborators: {e}")

        # Migration: projects.project_file
        try:
            conn.execute(text("SELECT project_file FROM projects LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE projects ADD COLUMN project_file TEXT NULL"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] projects.project_file: {e}")

        # Migration: users.is_private
        try:
            conn.execute(text("SELECT is_private FROM users LIMIT 1"))
        except Exception:
            try:
                if is_mysql:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT 0"))
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT 0"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] users.is_private: {e}")
                
        # Migration: users.avatar_url
        try:
            conn.execute(text("SELECT avatar_url FROM users LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) NULL"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] users.avatar_url: {e}")

        # Migration: projects.description
        try:
            conn.execute(text("SELECT description FROM projects LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE projects ADD COLUMN description TEXT NULL"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] projects.description: {e}")
                
        # Migration: companies.description
        try:
            conn.execute(text("SELECT description FROM companies LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE companies ADD COLUMN description TEXT NULL"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] companies.description: {e}")

        # Migration: users.token_version
        try:
            conn.execute(text("SELECT token_version FROM users LIMIT 1"))
        except Exception:
            try:
                if is_mysql:
                    conn.execute(text("ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 1"))
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] users.token_version: {e}")

        # Migration: users.password_changed_at
        try:
            conn.execute(text("SELECT password_changed_at FROM users LIMIT 1"))
        except Exception:
            try:
                if is_mysql:
                    conn.execute(text("ALTER TABLE users ADD COLUMN password_changed_at DATETIME NULL"))
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN password_changed_at DATETIME NULL"))
                conn.commit()
            except Exception as e:
                print(f"[DB Migration] users.password_changed_at: {e}")


