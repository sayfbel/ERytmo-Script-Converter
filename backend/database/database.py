from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DB_DIR = os.path.dirname(os.path.abspath(__file__))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'erytmo.db')}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

from sqlalchemy import text
import json

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            conn.execute(text("SELECT label FROM api_keys LIMIT 1"))
        except Exception:
            try:
                conn.execute(text("ALTER TABLE api_keys ADD COLUMN label VARCHAR"))
                conn.commit()
            except Exception:
                pass

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

