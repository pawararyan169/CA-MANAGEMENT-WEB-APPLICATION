# CA Office Management Backend

## Requirements
- Node.js 20+
- npm

## Install
```powershell
cd "G:\Aryan Work\CA MANAGEMENT WEBSITE"
npm install
```

Copy these backend files into the project, keeping your existing `login.html`, `signup.html`, `admin/`, `employee/`, `CSS/`, and `JS/` folders.

Create a `.env` file if you want to override defaults. For this local prototype, `JWT_SECRET` is optional but should be changed before deployment.

## Start
```powershell
node server.js
```

Open:
`http://localhost:5000/login.html`

Default admin:
- username: `admin`
- password: `Admin@12345`

The database is automatically created at `data/ca-office.sqlite`.

## Important
This is a local development foundation. Before production, add HTTPS, a real secret in environment variables, CSRF protection, stronger audit logging, encrypted storage for Aadhaar and other sensitive identifiers, backups, and a managed database.
