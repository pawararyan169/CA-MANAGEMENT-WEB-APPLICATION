CA OFFICE - FULL DATA RESET

1. STOP Node:
   Ctrl + C

2. Put reset_all_data.py in your project root, next to:
   data/ca-office.sqlite

3. Run:
   python reset_all_data.py

   Or:
   .\reset_all_data.ps1

4. The script automatically creates a backup:
   data/ca-office-backup-before-reset-YYYYMMDD-HHMMSS.sqlite

5. Start the server:
   node server.js

This deletes ALL ROWS from ALL normal SQLite application tables.
It preserves the database schema, tables, columns, indexes and triggers.

This is a COMPLETE data wipe. Do not run it if you only want to
remove billing or task records.
