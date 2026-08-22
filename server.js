const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
require('./database/database');
const db = require('./database/database');


const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(express.static(__dirname))

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/signup'));
app.use('/api', require('./routes/locations'));
app.use('/api', require('./routes/clients'));
app.use('/api', require('./routes/employees'));
app.use('/api', require('./routes/tasks'));
app.use('/api', require('./routes/documents'));
app.use('/api', require('./routes/billing'));

app.use(express.static(__dirname));

function seedAdmin() {
  const existing = db.prepare(`SELECT id FROM users WHERE username = 'admin' COLLATE NOCASE`).get();
  if (existing) return;
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO users (id, username, password_hash, first_name, middle_name, last_name, email, role, status, created_at, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', 'active', ?, ?)`)
    .run('ADMIN001', 'admin', bcrypt.hashSync('Admin@12345', 12), 'CA Office', '', 'Administrator', 'admin@caoffice.local', now, now);
  console.log('Created default admin: admin / Admin@12345');
}

function seedLocation() {
  const existing = db.prepare(`SELECT id FROM locations LIMIT 1`).get();
  if (existing) return;
  db.prepare(`INSERT INTO locations (id,name,city,state,country,created_at,created_by) VALUES (?,?,?,?,?,?,?)`)
    .run('LOC001','Main Office','Ahmedabad','Gujarat','India',new Date().toISOString(),'ADMIN001');
}

/* =========================================================
   PAGE ROUTES
========================================================= */

app.get('/', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'login.html'
        )
    );

});


app.get('/login', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'login.html'
        )
    );

});


app.get('/signup', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'signup.html'
        )
    );

});


/* =========================================================
   ADMIN
========================================================= */

app.get('/admin', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'admin',
            'dashboard.html'
        )
    );

});


app.get('/admin/dashboard.html', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'admin',
            'dashboard.html'
        )
    );

});



app.get('/admin/documents.html', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'admin',
            'documents.html'
        )
    );

});



app.get('/admin/tasks.html', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'admin',
            'tasks.html'
        )
    );

});

app.get('/admin/billing.html', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'admin', 'billing.html')
    );
});

/* =========================================================
   EMPLOYEE
========================================================= */

app.get('/employee', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'employee',
            'dashboard.html'
        )
    );

});


app.get('/employee/dashboard.html', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'employee',
            'dashboard.html'
        )
    );

});



app.get('/employee/documents.html', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'employee',
            'documents.html'
        )
    );

});



app.get('/employee/tasks.html', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'employee',
            'tasks.html'
        )
    );

});

app.get('/employee/billing.html', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'employee', 'billing.html')
    );
});

/* =========================================================
   CLIENT
========================================================= */

app.get('/client', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'client',
            'clients.html'
        )
    );

});


app.get('/client/clients.html', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'client',
            'clients.html'
        )
    );

});

app.use('/api', (req,res)=>res.status(404).json({success:false,message:'API route not found.'}));
app.use((err,req,res,next)=>{
  console.error(err);
  res.status(500).json({success:false,message:'Internal server error.'});
});

seedAdmin();
seedLocation();

app.listen(PORT,()=>{
  console.log('');
  console.log('========================================');
  console.log(' CA OFFICE MANAGEMENT SYSTEM');
  console.log('========================================');
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Login:  http://localhost:${PORT}/login.html`);
  console.log('Admin:  admin / Admin@12345');
  console.log('Database: ./data/ca-office.sqlite');
  console.log('========================================');
});
