document.addEventListener("DOMContentLoaded", () => {

    console.log("Employee dashboard JS loaded.");

    loadEmployeeDashboard();

});


/* =========================================================
   DASHBOARD
========================================================= */

async function loadEmployeeDashboard() {

    try {

        await loadClients();

    } catch (error) {

        console.error(
            "Employee dashboard error:",
            error
        );

        showClientError(
            error.message
        );

    }

}


/* =========================================================
   LOAD CLIENTS
========================================================= */

async function loadClients() {

    console.log(
        "Loading active clients..."
    );


    const response = await fetch(
        "/api/clients",
        {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        }
    );


    console.log(
        "Clients response:",
        response.status
    );


    let result;


    try {

        result = await response.json();

    } catch (error) {

        throw new Error(
            "Server returned an invalid response."
        );

    }


    console.log(
        "Clients API result:",
        result
    );


    if (!response.ok) {

        throw new Error(
            result.message ||
            `Unable to load clients. HTTP ${response.status}`
        );

    }


    if (!result.success) {

        throw new Error(
            result.message ||
            "Unable to load clients."
        );

    }


    const clients =
        Array.isArray(result.clients)
            ? result.clients
            : [];


    console.log(
        `Loaded ${clients.length} clients.`
    );


    /*
     * UPDATE ALL CLIENT COUNTERS
     */

    updateClientCounters(
        clients.length
    );

    updateRegistrationCounters(clients);


    /*
     * RENDER CLIENTS
     */

    renderOfficeClients(
        clients
    );

}


/* =========================================================
   UPDATE CLIENT COUNT
========================================================= */

function updateClientCounters(
    count
) {

    const ids = [
        "clientCount",
        "totalClients",
        "activeClientCount",
        "dashboardClientCount",
        "officeClientCount"
    ];


    ids.forEach(id => {

        const element =
            document.getElementById(id);


        if (element) {

            element.textContent =
                count;

        }

    });

}


/* =========================================================
   RENDER OFFICE CLIENTS
========================================================= */

function renderOfficeClients(
    clients
) {

    const container =
        document.getElementById(
            "officeClients"
        );


    if (!container) {

        console.error(
            "ERROR: #officeClients was not found in employee/dashboard.html"
        );

        return;

    }


    /*
     * CLEAR LOADING MESSAGE
     */

    container.innerHTML = "";


    /*
     * NO CLIENTS
     */

    if (clients.length === 0) {

        container.innerHTML = `

            <div class="clients-empty">

                <div class="clients-empty-icon">
                    ◉
                </div>

                <strong>
                    No active clients
                </strong>

                <span>
                    There are currently no active clients in the office.
                </span>

            </div>

        `;

        return;

    }


    /*
     * SHOW CLIENTS
     *
     * Show every active client.
     */

    clients.forEach(client => {

        const name =
            client.name ||
            [
                client.firstName,
                client.middleName,
                client.lastName
            ]
                .filter(Boolean)
                .join(" ") ||
            "Unnamed Client";


        const initial =
            name
                .charAt(0)
                .toUpperCase();


        const type =
            formatClientType(
                client.clientType
            );


        const location =
            [
                client.city,
                client.district,
                client.state
            ]
                .filter(Boolean)
                .join(", ");


        const row =
            document.createElement(
                "div"
            );


        row.className =
            "office-client-row";


        row.innerHTML = `

            <div class="office-client-main">

                <div class="office-client-avatar">
                    ${escapeHtml(initial)}
                </div>


                <div class="office-client-information">

                    <strong>
                        ${escapeHtml(name)}
                    </strong>

                    <span>
                        ${escapeHtml(type)}
                    </span>

                    ${
                        location
                            ? `
                                <small>
                                    ${escapeHtml(location)}
                                </small>
                              `
                            : ""
                    }

                </div>

            </div>


            <a
                href="/employee/client-details.html?id=${encodeURIComponent(client.id)}"
                class="office-client-view"
            >
                View
            </a>

        `;


        container.appendChild(
            row
        );

    });

}


/* =========================================================
   CLIENT TYPE
========================================================= */

function formatClientType(
    type
) {

    const types = {

        individual:
            "Individual",

        huf:
            "HUF",

        partnership:
            "Partnership Firm",

        llp:
            "LLP",

        private_limited:
            "Private Limited Company",

        cooperative_society:
            "Co-operative Society",

        trust:
            "Trust"

    };


    return (
        types[type] ||
        type ||
        "Client"
    );

}


/* =========================================================
   ERROR
========================================================= */

function showClientError(
    message
) {

    const container =
        document.getElementById(
            "officeClients"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="clients-error">

            <strong>
                Unable to load clients
            </strong>

            <span>
                ${escapeHtml(message)}
            </span>

            <button
                type="button"
                onclick="loadClients()"
            >
                Retry
            </button>

        </div>

    `;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}

/* =========================================================
   LIVE TAX & REGISTRATION COUNTS
========================================================= */

function updateRegistrationCounters(clients) {

    const fields = {
        pan: "dashboardPanCount",
        cin: "dashboardCinCount",
        fssai: "dashboardFssaiCount",
        gst: "dashboardGstCount",
        udyam: "dashboardUdyamCount",
        ptec: "dashboardPtecCount",
        ptrc: "dashboardPtrcCount",
        tan: "dashboardTanCount"
    };

    Object.entries(fields).forEach(
        ([field, elementId]) => {

            const element =
                document.getElementById(elementId);

            if (!element) return;

            element.textContent =
                clients.filter(client =>
                    String(client?.[field] ?? "").trim() !== ""
                ).length;
        }
    );

    const incomeTaxElement =
        document.getElementById(
            "dashboardIncomeTaxCount"
        );

    if (incomeTaxElement) {
        incomeTaxElement.textContent =
            clients.filter(client =>
                String(client?.pan ?? "").trim() !== ""
            ).length;
    }
}
