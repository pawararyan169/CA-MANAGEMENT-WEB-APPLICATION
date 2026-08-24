import sqlite3
from pathlib import Path
import shutil
from datetime import datetime

DB = Path(__file__).resolve().parent / "data" / "ca-office.sqlite"

if not DB.exists():
    raise SystemExit(f"Database not found: {DB}")

timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = DB.with_name(f"ca-office-backup-before-reset-{timestamp}.sqlite")
shutil.copy2(DB, backup)

conn = sqlite3.connect(DB)

try:
    conn.execute("PRAGMA foreign_keys = OFF")

    tables = conn.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    """).fetchall()

    for (table,) in tables:
        safe_name = table.replace('"', '""')
        conn.execute(f'DELETE FROM "{safe_name}"')

    try:
        conn.execute("DELETE FROM sqlite_sequence")
    except sqlite3.OperationalError:
        pass

    conn.commit()

    print("FULL DATA RESET COMPLETE.")
    print("Database structure was preserved.")
    print(f"Backup: {backup}")

finally:
    conn.execute("PRAGMA foreign_keys = ON")
    conn.close()
