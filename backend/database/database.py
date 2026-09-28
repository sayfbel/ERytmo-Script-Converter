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
    
    # Safe migrations for existing SQLite databases
    if not is_mysql:
        with engine.connect() as conn:
            try:
                conn.execute(text("SELECT label FROM api_keys LIMIT 1"))
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE api_keys ADD COLUMN label VARCHAR"))
                    conn.commit()
                except Exception:
                    pass

            # Migration: user_id on projects table
            try:
                conn.execute(text("SELECT user_id FROM projects LIMIT 1"))
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                    conn.commit()
                except Exception as e:
                    print(f"[DB Migration] projects.user_id: {e}")

            # Migration: user_id on staff table
            try:
                conn.execute(text("SELECT user_id FROM staff LIMIT 1"))
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE staff ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                    conn.commit()
                except Exception as e:
                    print(f"[DB Migration] staff.user_id: {e}")

            # Migration: staff_user_id on staff table
            try:
                conn.execute(text("SELECT staff_user_id FROM staff LIMIT 1"))
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE staff ADD COLUMN staff_user_id INTEGER REFERENCES users(id)"))
                    conn.commit()
                except Exception as e:
                    print(f"[DB Migration] staff.staff_user_id: {e}")

    # Legacy config sync into DB if api_keys table is empty
    db = SessionLocal()
    try:
        from backend.models import models
        existing_count = db.query(models.ApiKey).count()
        if existing_count == 0:
            config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config.json")
            if os.path.exists(config_path):
                try:
                    with open(config_path, "r") as f:
                        data = json.load(f)
                    gemini_key = data.get("GEMINI_API_KEY")
                    openai_key = data.get("OPENAI_API_KEY")
                    groq_key = data.get("GROQ_API_KEY")

                    if gemini_key:
                        db.add(models.ApiKey(provider="gemini", key=gemini_key, label="Gemini Key 1", is_active=True))
                    if openai_key:
                        db.add(models.ApiKey(provider="openai", key=openai_key, label="OpenAI Key 1", is_active=True))
                    if groq_key:
                        db.add(models.ApiKey(provider="groq", key=groq_key, label="Groq Key 1", is_active=True))
                    db.commit()
                except Exception as e:
                    print(f"Error migrating legacy config.json keys: {e}")
    finally:
        db.close()


