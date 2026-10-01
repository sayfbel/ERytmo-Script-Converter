import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.database.database import engine

def main():
    try:
        with engine.connect() as conn:
            # Check if column exists first
            check_sql = text("""
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name = 'avatar_url'
                AND table_schema = DATABASE()
            """)
            result = conn.execute(check_sql).scalar()
            
            if result == 0:
                print("Adding avatar_url column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL"))
                conn.commit()
                print("Successfully added avatar_url column!")
            else:
                print("Column avatar_url already exists in users table.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
