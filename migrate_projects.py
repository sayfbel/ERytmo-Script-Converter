import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "backend", "database", "erytmo.db")

print(f"Connecting to database at {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Add total_time to projects
    cursor.execute("ALTER TABLE projects ADD COLUMN total_time INTEGER;")
    print("Successfully added total_time to projects table.")
    
    conn.commit()
except sqlite3.OperationalError as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
