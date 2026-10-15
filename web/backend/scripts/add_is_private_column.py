import os
import sys
from sqlalchemy import text

# Ensure we can import from backend module
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database.database import engine

with engine.connect() as conn:
    # Check if column exists
    result = conn.execute(text("SHOW COLUMNS FROM users LIKE 'is_private'"))
    column_exists = result.fetchone() is not None

    if not column_exists:
        print("Adding is_private column to users table...")
        conn.execute(text("ALTER TABLE users ADD COLUMN is_private BOOLEAN DEFAULT FALSE NOT NULL"))
        conn.commit()
        print("Successfully added is_private column.")
    else:
        print("is_private column already exists.")
