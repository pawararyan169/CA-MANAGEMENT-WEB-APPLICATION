const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');

require('./database/database');
const db = require('./database/database');


/* =========================================================
   ROUTES
========================================================= */

const cinDashboardRoutes =
    require('./routes/cin-dashboard');

const fssaiDashboardRoutes =
    require('./routes/fssai-dashboard');


/* =========================================================
   APP
========================================================= */

const app = express();

const PORT =
    Number(process.env.PORT || 5000);


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
    express.json({
        limit: '1mb'
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: '1mb'
    })
);

app.use(cookieParser());

app.use(
    express.static(__dirname)
);


/* =========================================================
   API ROUTES
========================================================= */


/*
 * GST DASHBOARD
 */
app.use(
    '/api',
    require('./routes/gst-dashboard')
);


/*
 * DASHBOARD LIVE COUNTS
 */
app.use(
    '/api',
    require('./routes/dashboard-stats')
);


/*
 * CIN DASHBOARD
 */
app.use(
    '/api',
    cinDashboardRoutes
);


/*
 * FSSAI DASHBOARD
 */
app.use(
    '/api',
    fssaiDashboardRoutes
);


/*
 * AUTH
 */
app.use(
    '/api/auth',
    require('./routes/auth')
);


/*
 * SIGNUP
 */
app.use(
    '/api',
    require('./routes/signup')
);


/*
 * LOCATIONS
 */
app.use(
    '/api',
    require('./routes/locations')
);


/*
 * CLIENTS
 */
app.use(
    '/api',
    require('./routes/clients')
);


/*
 * EMPLOYEES
 */
app.use(
    '/api',
    require('./routes/employees')
);


/*
 * TASKS
 */
app.use(
    '/api',
    require('./routes/tasks')
);


/*
 * DOCUMENTS
 */
app.use(
    '/api',
    require('./routes/documents')
);


/*
 * BILLING
 */
app.use(
    '/api',
    require('./routes/billing')
);


/*
 * INCOME TAX
 */
app.use(
    '/api',
    require('./routes/income-tax')
);

app.use('/api',require('./routes/professional-tax'))
app.use('/api', require('./routes/udyam-dashboard'));
app.use(
    '/api',
    require('./routes/pan-dashboard')
);

app.use(
    '/api',
    require('./routes/tan-dashboard')
);


/* =========================================================
   PAGE ROUTES
========================================================= */


/* =========================================================
   LOGIN
========================================================= */

app.get(
    '/',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'login.html'
            )
        );

    }
);


app.get(
    '/login',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'login.html'
            )
        );

    }
);


/* =========================================================
   SIGNUP
========================================================= */

app.get(
    '/signup',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'signup.html'
            )
        );

    }
);


/* =========================================================
   ADMIN
========================================================= */

app.get(
    '/admin',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'admin',
                'dashboard.html'
            )
        );

    }
);


app.get(
    '/admin/dashboard.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'admin',
                'dashboard.html'
            )
        );

    }
);


app.get(
    '/admin/documents.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'admin',
                'documents.html'
            )
        );

    }
);


app.get(
    '/admin/tasks.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'admin',
                'tasks.html'
            )
        );

    }
);


app.get(
    '/admin/billing.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'admin',
                'billing.html'
            )
        );

    }
);


/*
 * ADMIN CIN DASHBOARD
 */
app.get(
    '/admin/cin_dashboard.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'admin',
                'cin_dashboard.html'
            )
        );

    }
);


/*
 * ADMIN INCOME TAX
 */
app.get(
    '/admin/income_tax.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'admin',
                'income_tax.html'
            )
        );

    }
);


/*
 * ADMIN FSSAI DASHBOARD
 */
app.get(
    '/admin/fssai_dashboard.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'admin',
                'fssai_dashboard.html'
            )
        );

    }
);


app.get(
    '/admin/udyam_dashboard.html',
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                'admin',
                'udyam_dashboard.html'
            )
        );
    }
);

app.get(
    '/employee/udyam_dashboard.html',
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                'employee',
                'udyam_dashboard.html'
            )
        );
    }
);


app.get(
    '/admin/pan-dashboard.html',
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                'admin',
                'pan-dashboard.html'
            )
        );
    }
);

app.get(
    '/employee/pan-dashboard.html',
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                'employee',
                'pan-dashboard.html'
            )
        );
    }
);

/* =========================================================
   EMPLOYEE
========================================================= */

app.get(
    '/employee',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'employee',
                'dashboard.html'
            )
        );

    }
);


app.get(
    '/employee/dashboard.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'employee',
                'dashboard.html'
            )
        );

    }
);


app.get(
    '/employee/documents.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'employee',
                'documents.html'
            )
        );

    }
);


app.get(
    '/employee/tasks.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'employee',
                'tasks.html'
            )
        );

    }
);


app.get(
    '/employee/billing.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'employee',
                'billing.html'
            )
        );

    }
);


/*
 * EMPLOYEE CIN DASHBOARD
 */
app.get(
    '/employee/cin_dashboard.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'employee',
                'cin_dashboard.html'
            )
        );

    }
);


/*
 * EMPLOYEE INCOME TAX
 */
app.get(
    '/employee/income_tax.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'employee',
                'income_tax.html'
            )
        );

    }
);


/*
 * EMPLOYEE FSSAI DASHBOARD
 */
app.get(
    '/employee/fssai_dashboard.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'employee',
                'fssai_dashboard.html'
            )
        );

    }
);


/* =========================================================
   CLIENT
========================================================= */

app.get(
    '/client',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'client',
                'clients.html'
            )
        );

    }
);


app.get(
    '/client/clients.html',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'client',
                'clients.html'
            )
        );

    }
);


/* =========================================================
   API 404
========================================================= */

app.use(
    '/api',
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                'API route not found.'

        });

    }
);


/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
    (err, req, res, next) => {

        console.error(
            'SERVER ERROR:',
            err
        );

        res.status(500).json({

            success: false,

            message:
                'Internal server error.'

        });

    }
);


/* =========================================================
   SEED ADMIN
========================================================= */

function seedAdmin() {

    const existing =
        db.prepare(`
            SELECT id
            FROM users
            WHERE username =
                'admin'
                COLLATE NOCASE
        `).get();


    if (existing) {

        return;

    }


    const now =
        new Date().toISOString();


    db.prepare(`
        INSERT INTO users
        (
            id,
            username,
            password_hash,
            first_name,
            middle_name,
            last_name,
            email,
            role,
            status,
            created_at,
            approved_at
        )

        VALUES
        (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            'admin',
            'active',
            ?,
            ?
        )
    `).run(

        'ADMIN001',

        'admin',

        bcrypt.hashSync(
            'Admin@12345',
            12
        ),

        'CA Office',

        '',

        'Administrator',

        'admin@caoffice.local',

        now,

        now

    );


    console.log(
        'Created default admin: admin / Admin@12345'
    );

}


/* =========================================================
   SEED LOCATION
========================================================= */

function seedLocation() {

    const existing =
        db.prepare(`
            SELECT id
            FROM locations
            LIMIT 1
        `).get();


    if (existing) {

        return;

    }


    db.prepare(`
        INSERT INTO locations
        (
            id,
            name,
            city,
            state,
            country,
            created_at,
            created_by
        )

        VALUES
        (?, ?, ?, ?, ?, ?, ?)
    `).run(

        'LOC001',

        'Main Office',

        'Ahmedabad',

        'Gujarat',

        'India',

        new Date().toISOString(),

        'ADMIN001'

    );

}


/* =========================================================
   START SERVER
========================================================= */

seedAdmin();

seedLocation();


app.listen(
    PORT,
    () => {

        console.log('');

        console.log(
            '========================================'
        );

        console.log(
            ' CA OFFICE MANAGEMENT SYSTEM'
        );

        console.log(
            '========================================'
        );

        console.log(
            `Server: http://localhost:${PORT}`
        );

        console.log(
            `Login:  http://localhost:${PORT}/login.html`
        );

        console.log(
            'Admin:  admin / Admin@12345'
        );

        console.log(
            'Database: ./data/ca-office.sqlite'
        );

        console.log(
            '========================================'
        );

    }
);