document.addEventListener(
    'DOMContentLoaded',
    () => {


        /* =====================================================
           USER INFORMATION
        ====================================================== */

        loadEmployeeInformation();


        /* =====================================================
           INITIAL CLIENT LOAD
        ====================================================== */

        loadClients();


        /* =====================================================
           LIVE REFRESH
           
           Every 5 seconds.
        ====================================================== */

        setInterval(
            loadClients,
            5000
        );


    }
);


/* =========================================================
   LOAD EMPLOYEE INFORMATION
========================================================= */

function loadEmployeeInformation() {

    const storedUser =
        localStorage.getItem(
            'caOfficeUser'
        );


    if (!storedUser) {
        return;
    }


    try {

        const user =
            JSON.parse(
                storedUser
            );


        const displayName =
            user.name ||
            user.fullName ||
            [
                user.firstName,
                user.middleName,
                user.lastName
            ]
                .filter(Boolean)
                .join(' ') ||
            user.username ||
            'Employee';


        const nameElement =
            document.getElementById(
                'employeeName'
            );


        const roleElement =
            document.getElementById(
                'employeeRole'
            );


        const avatarElement =
            document.getElementById(
                'employeeAvatar'
            );


        if (nameElement) {

            nameElement.textContent =
                displayName;

        }


        if (roleElement) {

            roleElement.textContent =
                user.designation ||
                'Staff';

        }


        if (avatarElement) {

            avatarElement.textContent =
                displayName
                    .charAt(0)
                    .toUpperCase();

        }

    }

    catch (error) {

        console.error(
            'Employee information error:',
            error
        );

    }

}


/* =========================================================
   LOAD CLIENTS
========================================================= */

async function loadClients() {

    try {

        const response =
            await fetch(
                '/api/clients',
                {
                    method: 'GET',

                    credentials:
                        'same-origin',

                    cache:
                        'no-store'
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                'Unable to load clients.'
            );

        }


        const clients =
            Array.isArray(
                result.clients
            )
                ? result.clients
                : [];


        updateClientCount(
            clients.length
        );


        renderRecentClients(
            clients
        );

    }

    catch (error) {

        console.error(
            'Employee client load error:',
            error
        );


        const container =
            document.getElementById(
                'recentClients'
            );


        if (container) {

            container.innerHTML = `

                <div class="employee-empty">

                    Unable to load clients.

                </div>

            `;

        }

    }

}


/* =========================================================
   CLIENT COUNT
========================================================= */

function updateClientCount(
    count
) {

    const element =
        document.getElementById(
            'clientCount'
        );


    if (!element) {
        return;
    }


    element.textContent =
        count;

}


/* =========================================================
   RECENT CLIENTS
========================================================= */

function renderRecentClients(
    clients
) {

    const container =
        document.getElementById(
            'recentClients'
        );


    if (!container) {
        return;
    }


    if (!clients.length) {

        container.innerHTML = `

            <div class="employee-empty">

                No active clients found.

            </div>

        `;

        return;

    }


    container.innerHTML =
        clients
            .slice(0, 8)
            .map(
                client =>
                    createClientCard(
                        client
                    )
            )
            .join('');

}


/* =========================================================
   CLIENT CARD
========================================================= */

function createClientCard(
    client
) {

    const location = [
        client.city,
        client.district,
        client.state
    ]
        .filter(Boolean)
        .join(', ');


    return `

        <div class="employee-client-card">

            <h3>
                ${escapeHtml(
                    client.name ||
                    'Unnamed Client'
                )}
            </h3>

            <div class="employee-client-type">

                ${escapeHtml(
                    formatClientType(
                        client.clientType
                    )
                )}

            </div>

            <div class="employee-client-location">

                ${escapeHtml(
                    location ||
                    client.locationName ||
                    'Location not available'
                )}

                <br>

                ${escapeHtml(
                    client.contactNumber ||
                    ''
                )}

            </div>

            <div class="employee-client-footer">

                <a
                    href="/employee/client-details.html?id=${encodeURIComponent(client.id)}"
                    class="employee-view-button"
                >
                    View Details
                </a>

            </div>

        </div>

    `;

}


/* =========================================================
   FORMAT CLIENT TYPE
========================================================= */

function formatClientType(
    type
) {

    const values = {

        individual:
            'Individual',

        huf:
            'HUF',

        partnership:
            'Partnership Firm',

        llp:
            'LLP',

        private_limited:
            'Private Limited Company',

        cooperative_society:
            'Co-operative Society',

        trust:
            'Trust'

    };


    return values[type] ||
        type ||
        'Client';

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ''
    )

        .replace(
            /&/g,
            '&amp;'
        )

        .replace(
            /</g,
            '&lt;'
        )

        .replace(
            />/g,
            '&gt;'
        )

        .replace(
            /"/g,
            '&quot;'
        )

        .replace(
            /'/g,
            '&#039;'
        );

}