document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =========================================================
       REGISTRATION TYPES
       DO NOT CHANGE THE CLIENT FIELD NAMES.
       THESE MATCH THE EXISTING CLIENT RECORDS.
    ========================================================= */

    const REGISTRATIONS = [
        {
            key: "cin",
            label: "CIN",
            field: "cin",
            description:
                "Corporate Identification Number"
        },

        {
            key: "fssai",
            label: "FSSAI",
            field: "fssai",
            description:
                "Food Safety and Standards Authority of India"
        },

        {
            key: "gst",
            label: "GST",
            field: "gst",
            description:
                "Goods and Services Tax"
        },

        {
            key: "udyam",
            label: "MSME Udyam",
            field: "udyam",
            description:
                "MSME Udyam Registration"
        },

        {
            key: "ptec",
            label: "PTEC",
            field: "ptec",
            description:
                "Professional Tax Enrollment Certificate"
        },

        {
            key: "ptrc",
            label: "PTRC",
            field: "ptrc",
            description:
                "Professional Tax Registration Certificate"
        },

        {
            key: "tan",
            label: "TAN",
            field: "tan",
            description:
                "Tax Deduction and Collection Account Number"
        }
    ];


    /* =========================================================
       ELEMENT HELPER
    ========================================================= */

    const $ = id =>
        document.getElementById(id);


    /* =========================================================
       PAGE STATE
    ========================================================= */

    const state = {

        clients: [],

        current: null,

        filtered: []

    };


    /* =========================================================
       HTML ESCAPE
    ========================================================= */

    function esc(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    /* =========================================================
       CLEAN VALUE
    ========================================================= */

    function clean(value) {

        return String(value ?? "").trim();
    }


    /* =========================================================
       CLIENT NAME
    ========================================================= */

    function getName(client) {

        return (
            client.name ||

            [
                client.firstName,
                client.middleName,
                client.lastName
            ]
                .filter(Boolean)
                .join(" ") ||

            "Unnamed Client"
        );
    }


    /* =========================================================
       CLIENT TYPE
    ========================================================= */

    function getType(value) {

        const map = {

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
            map[value] ||
            value ||
            "—"
        );
    }


    /* =========================================================
       LOCATION
    ========================================================= */

    function getLocation(client) {

        return [

            client.locationName,

            client.city,

            client.district,

            client.state

        ]
            .filter(Boolean)
            .join(" • ") || "—";
    }


    /* =========================================================
       ASSIGNED EMPLOYEES
    ========================================================= */

    function getEmployees(client) {

        if (client.assignedEmployeeNames) {

            return String(
                client.assignedEmployeeNames
            )
                .split(",")
                .map(x => x.trim())
                .filter(Boolean)
                .join(", ");
        }


        if (
            Array.isArray(
                client.assignedEmployees
            )
        ) {

            return (
                client.assignedEmployees.join(", ") ||
                "—"
            );
        }


        return "—";
    }


    /* =========================================================
       DATE FORMAT
    ========================================================= */

    function formatDate(value) {

        if (!value) {
            return "—";
        }


        const date =
            new Date(value);


        return Number.isNaN(
            date.getTime()
        )

            ? String(value)

            : date.toLocaleDateString(
                "en-IN"
            );
    }


    /* =========================================================
       DETERMINE CURRENT REGISTRATION
       
       SUPPORTS BOTH:
       
       1. OLD:
          /registrations.html?type=gst

       2. NEW:
          /admin/gst.html
          /employee/gst.html
    ========================================================= */

    function currentRegistration() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        /*
         * First priority:
         * Existing ?type=... URL.
         */
        const queryType =
            clean(
                params.get("type")
            ).toLowerCase();


        if (queryType) {

            const queryRegistration =
                REGISTRATIONS.find(
                    item =>
                        item.key ===
                        queryType
                );


            if (queryRegistration) {

                return queryRegistration;
            }
        }


        /*
         * Second priority:
         * Read registration name
         * directly from the filename.
         *
         * Example:
         * gst.html -> gst
         */
        const pathname =
            window.location.pathname;


        const filename =
            pathname
                .split("/")
                .pop()
                .toLowerCase();


        const keyFromFilename =
            filename.replace(
                /\.html?$/i,
                ""
            );


        const fileRegistration =
            REGISTRATIONS.find(
                item =>
                    item.key ===
                    keyFromFilename
            );


        if (fileRegistration) {

            return fileRegistration;
        }


        /*
         * Backwards-compatible fallback.
         */
        return REGISTRATIONS[0];
    }


    /* =========================================================
       SET ACTIVE REGISTRATION
    ========================================================= */

    function setActiveRegistration() {

        const reg =
            currentRegistration();


        /*
         * Highlight sidebar/menu links.
         */
        document
            .querySelectorAll(
                "[data-registration]"
            )
            .forEach(link => {

                link.classList.toggle(

                    "active",

                    link.dataset.registration ===
                    reg.key

                );

            });


        /*
         * Update page heading if the
         * elements exist.
         */
        const title =
            $("registrationTitle");


        if (title) {

            title.textContent =
                reg.label;
        }


        const description =
            $("registrationDescription");


        if (description) {

            description.textContent =
                reg.description;
        }


        const fieldLabel =
            $("registrationFieldLabel");


        if (fieldLabel) {

            fieldLabel.textContent =
                reg.label +
                " Number";
        }


        const countLabel =
            $("registrationCountLabel");


        if (countLabel) {

            countLabel.textContent =
                "Total clients with " +
                reg.label;
        }


        /*
         * Browser title.
         */
        document.title =
            `${reg.label} Clients | CA Office`;


        state.current =
            reg;


        renderFromCurrentData();
    }


    /* =========================================================
       POPULATE OFFICE LOCATIONS
       
       USES THE EXISTING CLIENT LOCATION DATA.
       
       NO NEW LOCATION API.
       NO CHANGE TO LOCATION-DATA.JS.
    ========================================================= */

    function populateLocations(clients) {

        const select =
            $("registrationLocation");


        /*
         * Some pages may not contain
         * the filter. Do not crash.
         */
        if (!select) {
            return;
        }


        const current =
            select.value;


        const locations =
            new Map();


        clients.forEach(client => {

            const id =
                clean(
                    client.locationId
                );


            const name =
                clean(
                    client.locationName
                ) ||

                (
                    id
                        ? `Office ${id}`
                        : "Unassigned"
                );


            /*
             * Preserve the same location
             * value logic used by the
             * existing project.
             */
            locations.set(
                id || name,
                name
            );

        });


        select.innerHTML =
            '<option value="">All office locations</option>';


        [
            ...locations.entries()
        ]
            .sort(
                (a, b) =>
                    a[1].localeCompare(
                        b[1]
                    )
            )
            .forEach(
                ([value, label]) => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        value;


                    option.textContent =
                        label;


                    select.appendChild(
                        option
                    );

                }
            );


        /*
         * Restore previous selection
         * where possible.
         */
        if (
            [
                ...select.options
            ].some(
                option =>
                    option.value ===
                    current
            )
        ) {

            select.value =
                current;
        }
    }


    /* =========================================================
       RENDER CURRENT DATA
    ========================================================= */

    function renderFromCurrentData() {

        if (!state.current) {
            return;
        }


        const field =
            state.current.field;


        /*
         * Only clients who actually
         * provided the selected
         * registration number.
         */
        const registeredClients =
            state.clients.filter(
                client =>
                    clean(
                        client[field]
                    ).length > 0
            );


        populateLocations(
            registeredClients
        );


        const searchElement =
            $("registrationSearch");


        const locationElement =
            $("registrationLocation");


        const search =
            searchElement
                ? clean(
                    searchElement.value
                ).toLowerCase()
                : "";


        const selectedLocation =
            locationElement
                ? locationElement.value
                : "";


        state.filtered =
            registeredClients.filter(
                client => {

                    /*
                     * LOCATION FILTER
                     */
                    if (selectedLocation) {

                        const location =
                            clean(
                                client.locationId
                            ) ||

                            clean(
                                client.locationName
                            ) ||

                            "Unassigned";


                        if (
                            location !==
                            selectedLocation
                        ) {

                            return false;
                        }
                    }


                    /*
                     * SEARCH FILTER
                     */
                    if (!search) {

                        return true;
                    }


                    const searchable = [

                        client.id,

                        getName(client),

                        client[field],

                        client.pan,

                        client.gst,

                        client.fssai,

                        client.cin,

                        client.tan,

                        client.ptec,

                        client.ptrc,

                        client.udyam,

                        client.aadhaar,

                        client.contactNumber,

                        client.contact,

                        client.email,

                        client.state,

                        client.district,

                        client.city,

                        client.locationName,

                        client.address,

                        getEmployees(client)

                    ]
                        .join(" ")
                        .toLowerCase();


                    return searchable.includes(
                        search
                    );
                }
            );


        const total =
            $("registrationTotal");


        if (total) {

            total.textContent =
                registeredClients.length;
        }


        const visible =
            $("registrationVisible");


        if (visible) {

            visible.textContent =
                state.filtered.length;
        }


        renderTable();
    }


    /* =========================================================
       RENDER TABLE
    ========================================================= */

    function renderTable() {

        const tbody =
            $("registrationTableBody");


        /*
         * If the page has not been
         * loaded with the expected
         * registration table, simply
         * stop instead of breaking
         * the entire page.
         */
        if (!tbody) {
            return;
        }


        tbody.innerHTML = "";


        const table =
            $("registrationTable");


        const empty =
            $("registrationEmpty");


        if (table) {

            table.style.display =
                state.filtered.length
                    ? "table"
                    : "none";
        }


        if (empty) {

            empty.style.display =
                state.filtered.length
                    ? "none"
                    : "block";
        }


        state.filtered.forEach(
            client => {

                const tr =
                    document.createElement(
                        "tr"
                    );


                tr.innerHTML = `

                    <td>

                        <strong>
                            ${esc(
                                getName(client)
                            )}
                        </strong>

                        <div class="muted">
                            ID:
                            ${esc(
                                client.id
                            )}
                        </div>

                    </td>


                    <td>

                        <strong
                            class="registration-number"
                        >
                            ${esc(
                                client[
                                    state.current.field
                                ]
                            )}
                        </strong>

                    </td>


                    <td>
                        ${esc(
                            getType(
                                client.clientType
                            )
                        )}
                    </td>


                    <td>
                        ${esc(
                            getLocation(
                                client
                            )
                        )}
                    </td>


                    <td>
                        ${esc(
                            client.pan ||
                            "—"
                        )}
                    </td>


                    <td>
                        ${esc(
                            client.contactNumber ||
                            client.contact ||
                            "—"
                        )}
                    </td>


                    <td>
                        ${esc(
                            client.email ||
                            "—"
                        )}
                    </td>


                    <td>

                        <button
                            type="button"
                            class="view-button"
                            data-client-id="${esc(
                                client.id
                            )}"
                        >
                            View Details
                        </button>

                    </td>

                `;


                tbody.appendChild(
                    tr
                );

            }
        );


        /*
         * VIEW DETAILS BUTTONS
         */
        tbody
            .querySelectorAll(
                ".view-button"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const client =
                            state.filtered.find(
                                item =>
                                    String(
                                        item.id
                                    ) ===
                                    String(
                                        button.dataset
                                            .clientId
                                    )
                            );


                        if (client) {

                            openDetails(
                                client
                            );
                        }

                    }
                );

            });
    }


    /* =========================================================
       DETAIL ITEM
    ========================================================= */

    function detail(
        label,
        value
    ) {

        return `

            <div class="detail-item">

                <span>
                    ${esc(label)}
                </span>

                <strong>
                    ${esc(
                        value || "—"
                    )}
                </strong>

            </div>

        `;
    }


    /* =========================================================
       OPEN CLIENT DETAILS
    ========================================================= */

    function openDetails(client) {

        const title =
            $("detailsTitle");


        if (title) {

            title.textContent =
                `${state.current.label} — ${getName(client)}`;
        }


        const body =
            $("detailsBody");


        if (!body) {
            return;
        }


        body.innerHTML = `

            <div class="registration-highlight">

                <span>
                    ${esc(
                        state.current.label
                    )}
                    Number
                </span>

                <strong>
                    ${esc(
                        client[
                            state.current.field
                        ]
                    )}
                </strong>

            </div>


            <h3>
                Client Information
            </h3>


            <div class="detail-grid">

                ${detail(
                    "Client ID",
                    client.id
                )}

                ${detail(
                    "Client Name",
                    getName(client)
                )}

                ${detail(
                    "Client Type",
                    getType(
                        client.clientType
                    )
                )}

                ${detail(
                    "PAN",
                    client.pan
                )}

                ${detail(
                    "Aadhaar",
                    client.aadhaar
                )}

                ${detail(
                    "Contact",
                    client.contactNumber ||
                    client.contact
                )}

                ${detail(
                    "Email",
                    client.email
                )}

                ${detail(
                    "Gender",
                    client.gender
                )}

                ${detail(
                    "Date of Birth",
                    formatDate(
                        client.dateOfBirth
                    )
                )}

                ${detail(
                    "Date of Registration",
                    formatDate(
                        client.dateOfRegistration
                    )
                )}

            </div>


            <h3>
                Location
            </h3>


            <div class="detail-grid">

                ${detail(
                    "Office Location",
                    client.locationName
                )}

                ${detail(
                    "State",
                    client.state
                )}

                ${detail(
                    "District",
                    client.district
                )}

                ${detail(
                    "City / Town",
                    client.city
                )}

            </div>


            <h3>
                All Tax & Registration Details
            </h3>


            <div class="detail-grid">

                ${detail(
                    "CIN",
                    client.cin
                )}

                ${detail(
                    "FSSAI",
                    client.fssai
                )}

                ${detail(
                    "GST",
                    client.gst
                )}

                ${detail(
                    "MSME Udyam",
                    client.udyam
                )}

                ${detail(
                    "PTEC",
                    client.ptec
                )}

                ${detail(
                    "PTRC",
                    client.ptrc
                )}

                ${detail(
                    "TAN",
                    client.tan
                )}

            </div>


            <h3>
                Authorised Person
            </h3>


            <div class="detail-grid">

                ${detail(
                    "Same as Client",
                    client.authorisedSameAsClient
                        ? "Yes"
                        : "No"
                )}

                ${detail(
                    "Name",
                    client.authorisedPersonName
                )}

                ${detail(
                    "Contact",
                    client.authorisedPersonContact
                )}

                ${detail(
                    "Email",
                    client.authorisedPersonEmail
                )}

            </div>


            <h3>
                Record Information
            </h3>


            <div class="detail-grid">

                ${detail(
                    "Status",
                    client.status ||
                    "active"
                )}

                ${detail(
                    "Assigned Employees",
                    getEmployees(client)
                )}

                ${detail(
                    "Created By",
                    client.createdBy
                )}

                ${detail(
                    "Created At",
                    client.createdAt
                )}

                ${detail(
                    "Updated At",
                    client.updatedAt
                )}

            </div>


            <div class="address-box">

                <span>
                    Complete Address
                </span>

                <p>
                    ${esc(
                        client.address ||
                        "—"
                    )}
                </p>

            </div>

        `;


        const modal =
            $("detailsModal");


        if (modal) {

            modal.classList.add(
                "open"
            );

            document.body.classList.add(
                "modal-open"
            );
        }
    }


    /* =========================================================
       CLOSE DETAILS
    ========================================================= */

    function closeDetails() {

        const modal =
            $("detailsModal");


        if (modal) {

            modal.classList.remove(
                "open"
            );
        }


        document.body.classList.remove(
            "modal-open"
        );
    }


    /* =========================================================
       LOAD CLIENTS
       
       IMPORTANT:
       THIS CONTINUES USING THE EXISTING
       /api/clients ENDPOINT.
       
       NO BACKEND CHANGE.
    ========================================================= */

    async function loadClients() {

        try {

            const response =
                await fetch(
                    "/api/clients",
                    {
                        method: "GET",

                        credentials:
                            "same-origin",

                        cache:
                            "no-store",

                        headers: {

                            "Accept":
                                "application/json",

                            "Cache-Control":
                                "no-cache"
                        }
                    }
                );


            const result =
                await response.json();


            if (
                !response.ok ||
                !result.success
            ) {

                throw new Error(
                    result.message ||
                    "Unable to load client records."
                );
            }


            state.clients =
                Array.isArray(
                    result.clients
                )

                    ? result.clients

                    : [];


            const loading =
                $("registrationLoading");


            if (loading) {

                loading.style.display =
                    "none";
            }


            const error =
                $("registrationError");


            if (error) {

                error.style.display =
                    "none";
            }


            renderFromCurrentData();


        } catch (error) {

            console.error(
                "Registration page error:",
                error
            );


            const loading =
                $("registrationLoading");


            if (loading) {

                loading.style.display =
                    "none";
            }


            const errorBox =
                $("registrationError");


            if (errorBox) {

                errorBox.textContent =
                    error.message ||
                    "Unable to load client records.";

                errorBox.style.display =
                    "block";
            }
        }
    }


    /* =========================================================
       SEARCH
    ========================================================= */

    const search =
        $("registrationSearch");


    if (search) {

        search.addEventListener(
            "input",
            renderFromCurrentData
        );
    }


    /* =========================================================
       LOCATION FILTER
    ========================================================= */

    const location =
        $("registrationLocation");


    if (location) {

        location.addEventListener(
            "change",
            renderFromCurrentData
        );
    }


    /* =========================================================
       CLEAR FILTERS
    ========================================================= */

    const clearFilters =
        $("clearRegistrationFilters");


    if (clearFilters) {

        clearFilters.addEventListener(
            "click",
            () => {

                if (search) {

                    search.value =
                        "";
                }


                if (location) {

                    location.value =
                        "";
                }


                renderFromCurrentData();

            }
        );
    }


    /* =========================================================
       DETAILS CLOSE BUTTON
    ========================================================= */

    const detailsClose =
        $("detailsClose");


    if (detailsClose) {

        detailsClose.addEventListener(
            "click",
            closeDetails
        );
    }


    /* =========================================================
       CLICK OUTSIDE MODAL
    ========================================================= */

    const detailsModal =
        $("detailsModal");


    if (detailsModal) {

        detailsModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    detailsModal
                ) {

                    closeDetails();
                }

            }
        );
    }


    /* =========================================================
       ESCAPE TO CLOSE MODAL
    ========================================================= */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeDetails();
            }

        }
    );


    /* =========================================================
       LOGOUT
       
       SAME EXISTING LOGOUT BEHAVIOUR.
    ========================================================= */

    const logoutButton =
        $("logoutButton");


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            () => {

                localStorage.removeItem(
                    "caOfficeLoggedIn"
                );


                localStorage.removeItem(
                    "caOfficeUser"
                );


                window.location.href =
                    "/login.html";
            }
        );
    }


    /* =========================================================
       INITIALIZE
    ========================================================= */

    setActiveRegistration();


    loadClients();


    /* =========================================================
       LIVE REFRESH
       
       Keeps registration records live
       after clients are added/edited.
    ========================================================= */

    setInterval(
        loadClients,
        15000
    );

});