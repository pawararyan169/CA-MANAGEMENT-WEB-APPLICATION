document.addEventListener(
    "DOMContentLoaded",
    () => {

        const clientList =
            document.getElementById(
                "clientList"
            );


        const clientCount =
            document.getElementById(
                "clientCount"
            );


        const search =
            document.getElementById(
                "clientSearch"
            );


        let clients = [];


        /* =====================================================
           LOAD CLIENTS
        ===================================================== */

        async function loadClients() {

            try {

                const response =
                    await fetch(
                        "/api/clients"
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.message ||
                        "Unable to load clients."
                    );

                }


                clients =
                    result.clients ||
                    [];


                renderClients(
                    clients
                );

            }

            catch (error) {

                console.error(
                    error
                );


                clientList.innerHTML =
                    `
                    <div class="empty-state">

                        <strong>
                            Unable to load clients
                        </strong>

                        <span>
                            ${escapeHtml(
                                error.message
                            )}
                        </span>

                    </div>
                    `;

            }

        }


        /* =====================================================
           RENDER
        ===================================================== */

        function renderClients(
            data
        ) {

            clientCount.textContent =
                data.length +
                (
                    data.length === 1
                        ? " client"
                        : " clients"
                );


            if (!data.length) {

                clientList.innerHTML =
                    `
                    <div class="empty-state">

                        <strong>
                            No clients found
                        </strong>

                        <span>
                            Add a client from the admin dashboard.
                        </span>

                    </div>
                    `;

                return;

            }


            clientList.innerHTML =
                "";


            data.forEach(
                client => {

                    const name =
                        [
                            client.first_name,
                            client.middle_name,
                            client.last_name
                        ]
                            .filter(Boolean)
                            .join(" ") ||
                        client.name ||
                        client.business_name ||
                        "Unnamed Client";


                    const initials =
                        name
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map(
                                part =>
                                    part
                                        .charAt(0)
                                        .toUpperCase()
                            )
                            .join("");


                    const card =
                        document.createElement(
                            "article"
                        );


                    card.className =
                        "client-card";


                    card.innerHTML =
                        `

                        <div class="client-card-top">

                            <div class="client-main">

                                <div class="client-avatar">
                                    ${escapeHtml(
                                        initials ||
                                        "C"
                                    )}
                                </div>


                                <div>

                                    <div class="client-name">
                                        ${escapeHtml(
                                            name
                                        )}
                                    </div>


                                    <div class="client-type">
                                        ${escapeHtml(
                                            client.type ||
                                            "Client"
                                        )}
                                    </div>

                                </div>

                            </div>


                            <span class="client-status">
                                Active
                            </span>

                        </div>


                        <div class="client-details">


                            <div class="client-detail">

                                <span>
                                    PAN
                                </span>

                                <strong class="client-pan">
                                    ${escapeHtml(
                                        client.pan_number ||
                                        "—"
                                    )}
                                </strong>

                            </div>


                            <div class="client-detail">

                                <span>
                                    Contact
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        client.contact_number ||
                                        client.phone ||
                                        "—"
                                    )}
                                </strong>

                            </div>


                            <div class="client-detail">

                                <span>
                                    Email
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        client.email ||
                                        "—"
                                    )}
                                </strong>

                            </div>


                            <div class="client-detail">

                                <span>
                                    Location
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        client.location_name ||
                                        client.location ||
                                        "—"
                                    )}
                                </strong>

                            </div>


                            <div class="client-detail">

                                <span>
                                    GST
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        client.gst_number ||
                                        "—"
                                    )}
                                </strong>

                            </div>


                        </div>

                        `;


                    clientList.appendChild(
                        card
                    );

                }
            );

        }


        /* =====================================================
           SEARCH
        ===================================================== */

        search.addEventListener(
            "input",
            () => {

                const query =
                    search.value
                        .trim()
                        .toLowerCase();


                if (!query) {

                    renderClients(
                        clients
                    );

                    return;

                }


                const filtered =
                    clients.filter(
                        client => {

                            const searchable =
                                [

                                    client.first_name,

                                    client.middle_name,

                                    client.last_name,

                                    client.name,

                                    client.business_name,

                                    client.pan_number,

                                    client.gst_number,

                                    client.email,

                                    client.contact_number

                                ]
                                    .filter(Boolean)
                                    .join(" ")
                                    .toLowerCase();


                            return searchable.includes(
                                query
                            );

                        }
                    );


                renderClients(
                    filtered
                );

            }
        );


        /* =====================================================
           HTML ESCAPE
        ===================================================== */

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


        async function loadLiveStats() {
            try {
                const response = await fetch("/api/dashboard/stats", {
                    method: "GET",
                    credentials: "include",
                    headers: { Accept: "application/json" },
                    cache: "no-store"
                });

                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || "Unable to load live dashboard counts.");
                }

                // The dashboard-stats API returns its values under `counts`.
                // Keep a fallback to `stats` so older backend responses still work.
                const stats = result.counts || result.stats || {};

                setLiveCount(
                    "clientCountLive",
                    stats.clients ?? stats.activeClients
                );
                setLiveCount(
                    "clientTaskCount",
                    stats.tasks ?? stats.totalTasks
                );
                setLiveCount("clientCompletedTaskCount", stats.completedTasks);
                setLiveCount("clientPendingTaskCount", stats.pendingTasks);

                const registrations = stats.registrations || {
                    cin: stats.cin,
                    fssai: stats.fssai,
                    gst: stats.gst,
                    udyam: stats.udyam,
                    ptec: stats.ptec,
                    ptrc: stats.ptrc,
                    tan: stats.tan
                };
                setLiveCount("clientCinCount", registrations.cin);
                setLiveCount("clientFssaiCount", registrations.fssai);
                setLiveCount("clientGstCount", registrations.gst);
                setLiveCount("clientUdyamCount", registrations.udyam);
                setLiveCount("clientPtecCount", registrations.ptec);
                setLiveCount("clientPtrcCount", registrations.ptrc);
                setLiveCount("clientTanCount", registrations.tan);
            } catch (error) {
                console.error("Client live dashboard count error:", error);
            }
        }

        function setLiveCount(id, value) {
            const element = document.getElementById(id);
            if (element) element.textContent = Number(value || 0);
        }

        loadClients();
        loadLiveStats();
        const liveStatsTimer = window.setInterval(loadLiveStats, 10000);
        window.addEventListener("beforeunload", () => window.clearInterval(liveStatsTimer));

    }
);