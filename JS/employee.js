document.addEventListener("DOMContentLoaded", () => {

    console.log("Employee dashboard JS loaded.");

    loadEmployeeDashboard();
    window.setInterval(loadEmployeeDashboardStats, 10000);

});


/* =========================================================
   DASHBOARD
========================================================= */

async function loadEmployeeDashboardStats() {
    try {
        const response = await fetch("/api/dashboard/stats", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: { "Accept": "application/json" }
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to load employee dashboard statistics.");
        }

        const counts = result.counts || {};
        const set = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = Number(value || 0);
        };

        set("clientCount", counts.clients);
        set("taskCount", counts.tasks);
        set("completedTaskCount", counts.completedTasks);
        set("pendingTaskCount", counts.pendingTasks);
    } catch (error) {
        console.error("Employee live dashboard count error:", error);
    }
}

async function loadEmployeeDashboard() {

    try {

        await loadClients();
        await loadEmployeeDashboardStats();

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

function renderOfficeClients(clients) {
    let container = document.getElementById("officeClients");

    // Fallback: create the container if an older/cached dashboard is served.
    if (!container) {
        const dashboardContent =
            document.querySelector(".employee-dashboard-content") ||
            document.querySelector(".dashboard-main") ||
            document.querySelector("main");

        if (!dashboardContent) {
            console.error("Unable to create #officeClients.");
            return;
        }

        const section = document.createElement("section");
        section.className = "dashboard-panel employee-office-clients";
        section.innerHTML = `
            <div class="employee-clients-header">
                <div>
                    <h2>Office Clients</h2>
                    <p>All active clients in the office.</p>
                </div>
                <a href="/employee/clients.html" class="employee-view-all">View All</a>
            </div>
            <div id="officeClients" class="office-clients-list"></div>
        `;

        dashboardContent.appendChild(section);
        container = document.getElementById("officeClients");
    }

    if (!container) {
        console.error("ERROR: #officeClients could not be created.");
        return;
    }

    container.innerHTML = "";

    if (clients.length === 0) {
        container.innerHTML = `
            <div class="clients-empty">
                <div class="clients-empty-icon">◉</div>
                <strong>No active clients</strong>
                <span>There are currently no active clients in the office.</span>
            </div>
        `;
        return;
    }

    clients.forEach(client => {
        const name =
            client.name ||
            [client.firstName, client.middleName, client.lastName]
                .filter(Boolean)
                .join(" ") ||
            "Unnamed Client";

        const initial = name.charAt(0).toUpperCase();
        const type = formatClientType(client.clientType);

        const location =
            [client.city, client.district, client.state]
                .filter(Boolean)
                .join(", ");

        const row = document.createElement("div");
        row.className = "office-client-row";

        row.innerHTML = `
            <div class="office-client-main">
                <div class="office-client-avatar">${escapeHtml(initial)}</div>
                <div class="office-client-information">
                    <strong>${escapeHtml(name)}</strong>
                    <span>${escapeHtml(type)}</span>
                    ${
                        location
                            ? `<small>${escapeHtml(location)}</small>`
                            : ""
                    }
                </div>
            </div>

            <a
                href="/employee/client-details.html?id=${encodeURIComponent(client.id)}"
                class="office-client-view"
            >View</a>
        `;

        container.appendChild(row);
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