import sqlite3

def migrate():
    conn = sqlite3.connect('backend/database/erytmo.db')
    cursor = conn.cursor()
    
    # Check existing columns in companies table
    cursor.execute("PRAGMA table_info(companies)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if "rate_per_min" not in columns:
        print("Adding rate_per_min column...")
        cursor.execute("ALTER TABLE companies ADD COLUMN rate_per_min REAL")
        
    if "supplier_email" not in columns:
        print("Adding supplier_email column...")
        cursor.execute("ALTER TABLE companies ADD COLUMN supplier_email TEXT")
        
    if "target_software" not in columns:
        print("Adding target_software column...")
        cursor.execute("ALTER TABLE companies ADD COLUMN target_software TEXT")
        
    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
