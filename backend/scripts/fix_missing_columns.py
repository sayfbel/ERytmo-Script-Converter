import os
import sys
from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))

from backend.database.database import engine

with engine.connect() as conn:
    # Check companies table
    result = conn.execute(text("SHOW COLUMNS FROM companies LIKE 'description'"))
    if result.fetchone() is None:
        print("Adding description to companies...")
        conn.execute(text("ALTER TABLE companies ADD COLUMN description TEXT NULL"))
        
    # Check projects table
    result = conn.execute(text("SHOW COLUMNS FROM projects LIKE 'description'"))
    if result.fetchone() is None:
        print("Adding description to projects...")
        conn.execute(text("ALTER TABLE projects ADD COLUMN description TEXT NULL"))
        
    conn.commit()
    print("Database schema updated successfully!")
