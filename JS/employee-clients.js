document.addEventListener("DOMContentLoaded", () => {

    let allClients = [];
    let filteredClients = [];
    let loadingClients = false;


    /* =========================================================
       PAGE TYPE
    ========================================================= */

    const isEmployeePage =
        window.location.pathname
            .toLowerCase()
            .includes("/employee/");


    const detailsBase =
        isEmployeePage
            ? "/employee/client-details.html?id="
            : "/admin/client-details.html?id=";


    /* =========================================================
       ELEMENTS
    ========================================================= */

    const tableBody =
        document.getElementById("clientsTableBody");


    const tableContainer =
        document.getElementById(
            "clientsTableContainer"
        );


    const loadingElement =
        document.getElementById(
            "clientsLoading"
        );


    const emptyElement =
        document.getElementById(
            "clientsEmpty"
        );


    const errorElement =
        document.getElementById(
            "clientsError"
        );


    const clientCountElement =
        document.getElementById(
            "clientCount"
        );


    const visibleCountElement =
        document.getElementById(
            "visibleClientCount"
        );


    const searchInput =
        document.getElementById(
            "clientSearch"
        );


    const typeFilter =
        document.getElementById(
            "filterClientType"
        );


    const stateFilter =
        document.getElementById(
            "filterState"
        );


    const districtFilter =
        document.getElementById(
            "filterDistrict"
        );


    const cityFilter =
        document.getElementById(
            "filterCity"
        );


    const statusFilter =
        document.getElementById(
            "filterStatus"
        );


    const locationFilter =
        document.getElementById(
            "filterLocation"
        );


    const clearFiltersButton =
        document.getElementById(
            "clearClientFilters"
        );


    const excelButton =
        document.getElementById(
            "exportClientsExcel"
        );


    const pdfButton =
        document.getElementById(
            "exportClientsPdf"
        );


    /* =========================================================
       LIVE REGISTRATION COUNT ELEMENTS
       
       Supports:
       
       id="cinCount"
       id="fssaiCount"
       id="gstCount"
       id="udyamCount"
       id="ptecCount"
       id="ptrcCount"
       id="tanCount"
       
       AND:
       
       data-registration-count="cin"
       data-registration-count="fssai"
       data-registration-count="gst"
       data-registration-count="udyam"
       data-registration-count="ptec"
       data-registration-count="ptrc"
       data-registration-count="tan"
    ========================================================= */

    const registrationFields = {

        cin: "cin",

        fssai: "fssai",

        gst: "gst",

        udyam: "udyam",

        ptec: "ptec",

        ptrc: "ptrc",

        tan: "tan"

    };


    /* =========================================================
       UPDATE LIVE REGISTRATION COUNTS
       
       Counts ONLY clients where the relevant field
       contains a value.
    ========================================================= */

    function updateRegistrationCounts() {

        Object.entries(
            registrationFields
        ).forEach(
            ([registration, field]) => {

                const count =
                    allClients.filter(
                        client =>
                            String(
                                client[field] ?? ""
                            ).trim() !== ""
                    ).length;


                /*
                 * Normal ID:
                 *
                 * <span id="gstCount"></span>
                 */
                const idElement =
                    document.getElementById(
                        registration + "Count"
                    );


                if (idElement) {

                    idElement.textContent =
                        count;
                }


                /*
                 * Data attribute:
                 *
                 * <span
                 *   data-registration-count="gst"
                 * ></span>
                 */
                document
                    .querySelectorAll(
                        `[data-registration-count="${registration}"]`
                    )
                    .forEach(
                        element => {

                            element.textContent =
                                count;

                        }
                    );

            }
        );

    }


    /* =========================================================
       NORMALIZE
    ========================================================= */

    function normalize(value) {

        return String(value ?? "")
            .trim()
            .toLowerCase();

    }


    /* =========================================================
       FULL NAME
    ========================================================= */

    function fullName(client) {

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

    function formatClientType(type) {

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
            "—"
        );

    }


    /* =========================================================
       ESCAPE HTML
    ========================================================= */

    function escapeHtml(value) {

        return String(value ?? "")

            .replaceAll(
                "&",
                "&amp;"
            )

            .replaceAll(
                "<",
                "&lt;"
            )

            .replaceAll(
                ">",
                "&gt;"
            )

            .replaceAll(
                '"',
                "&quot;"
            )

            .replaceAll(
                "'",
                "&#039;"
            );

    }


    /* =========================================================
       LOCATION TEXT
    ========================================================= */

    function locationText(client) {

        return [

            client.city,

            client.district,

            client.state

        ]
            .filter(Boolean)
            .join(", ") || "—";

    }


    /* =========================================================
       ASSIGNED EMPLOYEES
    ========================================================= */

    function assignedEmployeesText(client) {

        const employees =

            Array.isArray(
                client.assignedEmployees
            )

                ? client.assignedEmployees

                : [];


        if (!employees.length) {

            return "—";

        }


        return employees

            .map(employee => {

                if (
                    typeof employee ===
                    "string"
                ) {

                    return employee;

                }


                return (

                    employee.name ||

                    employee.fullName ||

                    employee.username ||

                    employee.email ||

                    ""

                );

            })

            .filter(Boolean)

            .join(", ");

    }


    /* =========================================================
       UNIQUE VALUES
    ========================================================= */

    function getUniqueValues(field) {

        const values =
            new Set();


        allClients.forEach(
            client => {

                if (

                    client[field] !==
                        undefined &&

                    client[field] !==
                        null &&

                    String(
                        client[field]
                    ).trim()

                ) {

                    values.add(

                        String(
                            client[field]
                        ).trim()

                    );

                }

            }
        );


        return [

            ...values

        ].sort(
            (a, b) =>
                a.localeCompare(b)
        );

    }


    /* =========================================================
       STATE FILTER
    ========================================================= */

    function populateStateFilter() {

        if (!stateFilter) {

            return;

        }


        const previous =
            stateFilter.value;


        stateFilter.innerHTML =
            '<option value="">All states</option>';


        getUniqueValues(
            "state"
        ).forEach(
            state => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    state;


                option.textContent =
                    state;


                stateFilter.appendChild(
                    option
                );

            }
        );


        if (

            [
                ...stateFilter.options
            ].some(
                option =>
                    option.value ===
                    previous
            )

        ) {

            stateFilter.value =
                previous;

        }

    }


    /* =========================================================
       DISTRICT FILTER
    ========================================================= */

    function populateDistrictFilter() {

        if (!districtFilter) {

            return;

        }


        const state =
            stateFilter?.value ||
            "";


        const previous =
            districtFilter.value;


        const values =
            new Set();


        allClients.forEach(
            client => {

                if (

                    (
                        !state ||

                        client.state ===
                            state
                    ) &&

                    client.district

                ) {

                    values.add(

                        String(
                            client.district
                        ).trim()

                    );

                }

            }
        );


        districtFilter.innerHTML =
            '<option value="">All districts</option>';


        [
            ...values
        ]

            .sort(
                (a, b) =>
                    a.localeCompare(b)
            )

            .forEach(
                district => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        district;


                    option.textContent =
                        district;


                    districtFilter.appendChild(
                        option
                    );

                }
            );


        districtFilter.disabled =
            values.size === 0;


        if (

            [
                ...districtFilter.options
            ].some(
                option =>
                    option.value ===
                    previous
            )

        ) {

            districtFilter.value =
                previous;

        }

    }


    /* =========================================================
       CITY FILTER
    ========================================================= */

    function populateCityFilter() {

        if (!cityFilter) {

            return;

        }


        const state =
            stateFilter?.value ||
            "";


        const district =
            districtFilter?.value ||
            "";


        const previous =
            cityFilter.value;


        const values =
            new Set();


        allClients.forEach(
            client => {

                if (

                    (
                        !state ||

                        client.state ===
                            state
                    ) &&

                    (
                        !district ||

                        client.district ===
                            district
                    ) &&

                    client.city

                ) {

                    values.add(

                        String(
                            client.city
                        ).trim()

                    );

                }

            }
        );


        cityFilter.innerHTML =
            '<option value="">All cities</option>';


        [
            ...values
        ]

            .sort(
                (a, b) =>
                    a.localeCompare(b)
            )

            .forEach(
                city => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        city;


                    option.textContent =
                        city;


                    cityFilter.appendChild(
                        option
                    );

                }
            );


        cityFilter.disabled =
            values.size === 0;


        if (

            [
                ...cityFilter.options
            ].some(
                option =>
                    option.value ===
                    previous
            )

        ) {

            cityFilter.value =
                previous;

        }

    }


    /* =========================================================
       OFFICE LOCATION FILTER
    ========================================================= */

    function populateLocationFilter() {

        if (!locationFilter) {

            return;

        }


        const previous =
            locationFilter.value;


        const locations =
            new Map();


        allClients.forEach(
            client => {

                const id =
                    client.locationId ??
                    "";


                const name =
                    client.locationName ||

                    client.location ||

                    id ||

                    "";


                if (
                    id ||
                    name
                ) {

                    locations.set(

                        String(
                            id ||
                            name
                        ),

                        String(
                            name
                        )

                    );

                }

            }
        );


        locationFilter.innerHTML =
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
                ([id, name]) => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        id;


                    option.textContent =
                        name;


                    locationFilter.appendChild(
                        option
                    );

                }
            );


        if (

            [
                ...locationFilter.options
            ].some(
                option =>
                    option.value ===
                    previous
            )

        ) {

            locationFilter.value =
                previous;

        }

    }


    /* =========================================================
       LOAD CLIENTS
    ========================================================= */

    async function loadClients() {

        if (loadingClients) {

            return;

        }


        loadingClients =
            true;


        try {

            if (loadingElement) {

                loadingElement.style.display =
                    "block";

            }


            const response =
                await fetch(
                    "/api/clients",
                    {

                        method:
                            "GET",

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

                    "Unable to load clients."

                );

            }


            allClients =

                Array.isArray(
                    result.clients
                )

                    ? result.clients

                    : [];


            /* =================================================
               UPDATE TOTAL CLIENT COUNT
            ================================================= */

            if (clientCountElement) {

                clientCountElement.textContent =
                    allClients.length;

            }


            /* =================================================
               UPDATE TAX / REGISTRATION LIVE COUNTS
            ================================================= */

            updateRegistrationCounts();


            /* =================================================
               UPDATE FILTERS
            ================================================= */

            populateStateFilter();

            populateDistrictFilter();

            populateCityFilter();

            populateLocationFilter();


            /* =================================================
               APPLY EXISTING CLIENT FILTERS
            ================================================= */

            applyFilters();


            if (errorElement) {

                errorElement.style.display =
                    "none";

                errorElement.textContent =
                    "";

            }

        }

        catch (error) {

            console.error(
                "Client loading error:",
                error
            );


            if (errorElement) {

                errorElement.textContent =

                    error.message ||

                    "Unable to load clients.";


                errorElement.style.display =
                    "block";

            }

        }

        finally {

            loadingClients =
                false;


            if (loadingElement) {

                loadingElement.style.display =
                    "none";

            }

        }

    }


    /* =========================================================
       APPLY FILTERS
    ========================================================= */

    function applyFilters() {

        const search =
            normalize(
                searchInput?.value
            );


        const type =
            typeFilter?.value ||
            "";


        const state =
            stateFilter?.value ||
            "";


        const district =
            districtFilter?.value ||
            "";


        const city =
            cityFilter?.value ||
            "";


        const status =
            statusFilter?.value ||
            "";


        const location =
            locationFilter?.value ||
            "";


        filteredClients =
            allClients.filter(
                client => {

                    const searchable = [

                        client.id,

                        fullName(
                            client
                        ),

                        client.firstName,

                        client.middleName,

                        client.lastName,

                        client.clientType,

                        client.pan,

                        client.aadhaar,

                        client.tan,

                        client.gst,

                        client.udyam,

                        client.cin,

                        client.fssai,

                        client.ptec,

                        client.ptrc,

                        client.contact,

                        client.contactNumber,

                        client.email,

                        client.address,

                        client.state,

                        client.district,

                        client.city,

                        client.locationName,

                        assignedEmployeesText(
                            client
                        )

                    ]

                        .filter(Boolean)

                        .join(" ")

                        .toLowerCase();


                    if (

                        search &&

                        !searchable.includes(
                            search
                        )

                    ) {

                        return false;

                    }


                    if (

                        type &&

                        client.clientType !==
                            type

                    ) {

                        return false;

                    }


                    if (

                        state &&

                        client.state !==
                            state

                    ) {

                        return false;

                    }


                    if (

                        district &&

                        client.district !==
                            district

                    ) {

                        return false;

                    }


                    if (

                        city &&

                        client.city !==
                            city

                    ) {

                        return false;

                    }


                    const clientStatus =
                        client.status ||
                        "active";


                    if (

                        status &&

                        clientStatus !==
                            status

                    ) {

                        return false;

                    }


                    if (location) {

                        const clientLocation =

                            String(

                                client.locationId ??

                                client.locationName ??

                                ""

                            );


                        if (

                            clientLocation !==
                                String(location)

                        ) {

                            return false;

                        }

                    }


                    return true;

                }
            );


        if (visibleCountElement) {

            visibleCountElement.textContent =
                filteredClients.length;

        }


        renderClients();

    }


    /* =========================================================
       RENDER CLIENTS
    ========================================================= */

    function renderClients() {

        if (!tableBody) {

            return;

        }


        tableBody.innerHTML =
            "";


        if (
            !filteredClients.length
        ) {

            if (tableContainer) {

                tableContainer.style.display =
                    "none";

            }


            if (emptyElement) {

                emptyElement.style.display =
                    "block";

            }


            return;

        }


        if (emptyElement) {

            emptyElement.style.display =
                "none";

        }


        if (tableContainer) {

            tableContainer.style.display =
                "block";

        }


        filteredClients.forEach(
            client => {

                const row =
                    document.createElement(
                        "tr"
                    );


                const name =
                    fullName(
                        client
                    );


                const assigned =
                    assignedEmployeesText(
                        client
                    );


                const status =
                    client.status ||
                    "active";


                const viewUrl =

                    detailsBase +

                    encodeURIComponent(
                        client.id
                    );


                row.innerHTML = `

                    <td style="padding:14px;">

                        <strong>
                            ${escapeHtml(
                                name
                            )}
                        </strong>

                        ${
                            client.pan

                                ? `

                                    <div
                                        style="
                                            margin-top:4px;
                                            font-size:12px;
                                            color:#777;
                                        "
                                    >
                                        PAN:
                                        ${escapeHtml(
                                            client.pan
                                        )}
                                    </div>

                                `

                                : ""
                        }

                    </td>


                    <td style="padding:14px;">

                        ${escapeHtml(

                            formatClientType(
                                client.clientType
                            )

                        )}

                    </td>


                    <td style="padding:14px;">

                        ${escapeHtml(

                            locationText(
                                client
                            )

                        )}

                        ${
                            client.locationName

                                ? `

                                    <div
                                        style="
                                            margin-top:4px;
                                            font-size:12px;
                                            color:#777;
                                        "
                                    >
                                        Office:
                                        ${escapeHtml(
                                            client.locationName
                                        )}
                                    </div>

                                `

                                : ""
                        }

                    </td>


                    <td style="padding:14px;">

                        ${escapeHtml(

                            client.contactNumber ||

                            client.contact ||

                            "—"

                        )}

                    </td>


                    <td style="padding:14px;">

                        ${escapeHtml(
                            assigned
                        )}

                    </td>


                    <td style="padding:14px;">

                        ${escapeHtml(
                            status
                        )}

                    </td>


                    <td style="padding:14px;">

                        <a
                            href="${viewUrl}"
                            class="primary-button"
                            style="
                                display:inline-flex;
                                width:auto;
                                padding:0 14px;
                            "
                        >
                            View
                        </a>

                    </td>

                `;


                tableBody.appendChild(
                    row
                );

            }
        );

    }


    /* =========================================================
       CLEAR FILTERS
    ========================================================= */

    function clearFilters() {

        if (searchInput) {

            searchInput.value =
                "";

        }


        if (typeFilter) {

            typeFilter.value =
                "";

        }


        if (stateFilter) {

            stateFilter.value =
                "";

        }


        if (districtFilter) {

            districtFilter.value =
                "";

        }


        if (cityFilter) {

            cityFilter.value =
                "";

        }


        if (statusFilter) {

            statusFilter.value =
                "";

        }


        if (locationFilter) {

            locationFilter.value =
                "";

        }


        populateDistrictFilter();

        populateCityFilter();

        applyFilters();

    }


    /* =========================================================
       FILTER SUMMARY
    ========================================================= */

    function currentFilterSummary() {

        const filters =
            [];


        const search =
            searchInput?.value.trim();


        const type =
            typeFilter?.value;


        const state =
            stateFilter?.value;


        const district =
            districtFilter?.value;


        const city =
            cityFilter?.value;


        const status =
            statusFilter?.value;


        const locationText =

            locationFilter
                ?.selectedOptions
                ?. [0]
                ?.textContent ||
            "";


        if (search) {

            filters.push(
                "Search: " +
                search
            );

        }


        if (type) {

            filters.push(

                "Type: " +

                formatClientType(
                    type
                )

            );

        }


        if (state) {

            filters.push(
                "State: " +
                state
            );

        }


        if (district) {

            filters.push(
                "District: " +
                district
            );

        }


        if (city) {

            filters.push(
                "City: " +
                city
            );

        }


        if (status) {

            filters.push(
                "Status: " +
                status
            );

        }


        if (

            locationText &&

            locationFilter?.value

        ) {

            filters.push(

                "Office: " +

                locationText

            );

        }


        return filters;

    }


    /* =========================================================
       EXPORT EXCEL
    ========================================================= */

    function exportExcel() {

        if (
            typeof XLSX ===
            "undefined"
        ) {

            alert(
                "Excel export library is not loaded."
            );

            return;

        }


        if (
            !filteredClients.length
        ) {

            alert(
                "No clients match the current filters."
            );

            return;

        }


        const rows =

            filteredClients.map(
                client => ({

                    "Client ID":
                        client.id || "",

                    "Full Name":
                        fullName(client),

                    "Client Type":
                        formatClientType(
                            client.clientType
                        ),

                    "Gender":
                        client.gender || "",

                    "State":
                        client.state || "",

                    "District":
                        client.district || "",

                    "City / Town":
                        client.city || "",

                    "Complete Address":
                        client.address || "",

                    "Office Location":
                        client.locationName || "",

                    "PAN":
                        client.pan || "",

                    "Aadhaar":
                        client.aadhaar || "",

                    "TAN":
                        client.tan || "",

                    "GST":
                        client.gst || "",

                    "MSME Udyam":
                        client.udyam || "",

                    "CIN":
                        client.cin || "",

                    "FSSAI":
                        client.fssai || "",

                    "PTEC":
                        client.ptec || "",

                    "PTRC":
                        client.ptrc || "",

                    "Contact":
                        client.contactNumber ||
                        client.contact ||
                        "",

                    "Email":
                        client.email || "",

                    "Date of Birth":
                        client.dateOfBirth || "",

                    "Date of Registration":
                        client.dateOfRegistration || "",

                    "Authorised Same As Client":
                        client.authorisedSameAsClient
                            ? "Yes"
                            : "No",

                    "Authorised Person":
                        client.authorisedPersonName ||
                        "",

                    "Authorised Contact":
                        client.authorisedPersonContact ||
                        "",

                    "Authorised Email":
                        client.authorisedPersonEmail ||
                        "",

                    "Assigned Employees":
                        assignedEmployeesText(
                            client
                        ),

                    "Status":
                        client.status ||
                        "active",

                    "Created By":
                        client.createdBy ||
                        "",

                    "Created At":
                        client.createdAt ||
                        "",

                    "Updated At":
                        client.updatedAt ||
                        ""

                })

            );


        const worksheet =
            XLSX.utils.json_to_sheet(
                rows
            );


        worksheet["!cols"] = [

            { wch: 18 },

            { wch: 28 },

            { wch: 24 },

            { wch: 12 },

            { wch: 20 },

            { wch: 20 },

            { wch: 20 },

            { wch: 40 },

            { wch: 25 },

            { wch: 16 },

            { wch: 18 },

            { wch: 16 },

            { wch: 20 },

            { wch: 20 },

            { wch: 20 },

            { wch: 18 },

            { wch: 16 },

            { wch: 16 },

            { wch: 18 },

            { wch: 30 },

            { wch: 18 },

            { wch: 22 },

            { wch: 25 },

            { wch: 22 },

            { wch: 30 },

            { wch: 35 }

        ];


        const workbook =
            XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(

            workbook,

            worksheet,

            "Client Records"

        );


        XLSX.writeFile(

            workbook,

            "client-records-" +

            getDateStamp() +

            ".xlsx"

        );

    }


    /* =========================================================
       EXPORT PDF
    ========================================================= */

    function exportPdf() {

        if (

            !window.jspdf ||

            !window.jspdf.jsPDF

        ) {

            alert(
                "PDF export library is not loaded."
            );

            return;

        }


        if (
            !filteredClients.length
        ) {

            alert(
                "No clients match the current filters."
            );

            return;

        }


        const jsPDF =
            window.jspdf.jsPDF;


        const doc =
            new jsPDF({

                orientation:
                    "landscape",

                unit:
                    "mm",

                format:
                    "a4"

            });


        doc.setFontSize(
            18
        );


        doc.text(

            "CA Office - Client Records",

            14,

            15

        );


        doc.setFontSize(
            9
        );


        doc.text(

            "Generated: " +

            new Date()
                .toLocaleString(),

            14,

            22

        );


        doc.text(

            "Filtered records: " +

            filteredClients.length,

            14,

            27

        );


        const filters =
            currentFilterSummary();


        let tableStartY =
            33;


        if (
            filters.length
        ) {

            const filterString =
                filters.join(
                    " | "
                );


            const wrapped =
                doc.splitTextToSize(

                    "Filters: " +
                    filterString,

                    270

                );


            doc.text(

                wrapped,

                14,

                32

            );


            tableStartY =

                32 +

                (
                    wrapped.length *
                    4
                ) +

                3;

        }


        const rows =

            filteredClients.map(
                client => [

                    fullName(client),

                    formatClientType(
                        client.clientType
                    ),

                    client.state || "",

                    client.district || "",

                    client.city || "",

                    client.pan || "",

                    client.gst || "",

                    client.contactNumber ||

                    client.contact ||

                    "",

                    client.email || "",

                    client.status ||
                    "active"

                ]
            );


        if (

            typeof doc.autoTable !==
            "function"

        ) {

            alert(
                "PDF table library is not loaded."
            );

            return;

        }


        doc.autoTable({

            startY:
                tableStartY,

            head: [[

                "Client",

                "Type",

                "State",

                "District",

                "City",

                "PAN",

                "GST",

                "Contact",

                "Email",

                "Status"

            ]],

            body:
                rows,

            styles: {

                fontSize:
                    7,

                cellPadding:
                    2,

                overflow:
                    "linebreak"

            },

            headStyles: {

                fontSize:
                    7

            },

            margin: {

                left:
                    8,

                right:
                    8

            }

        });


        doc.save(

            "client-records-" +

            getDateStamp() +

            ".pdf"

        );

    }


    /* =========================================================
       DATE STAMP
    ========================================================= */

    function getDateStamp() {

        const date =
            new Date();


        return (

            date.getFullYear() +

            "-" +

            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            ) +

            "-" +

            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            )

        );

    }


    /* =========================================================
       EVENTS
    ========================================================= */

    searchInput?.addEventListener(

        "input",

        applyFilters

    );


    typeFilter?.addEventListener(

        "change",

        applyFilters

    );


    stateFilter?.addEventListener(

        "change",

        () => {

            populateDistrictFilter();

            populateCityFilter();

            applyFilters();

        }

    );


    districtFilter?.addEventListener(

        "change",

        () => {

            populateCityFilter();

            applyFilters();

        }

    );


    cityFilter?.addEventListener(

        "change",

        applyFilters

    );


    statusFilter?.addEventListener(

        "change",

        applyFilters

    );


    locationFilter?.addEventListener(

        "change",

        applyFilters

    );


    clearFiltersButton?.addEventListener(

        "click",

        clearFilters

    );


    excelButton?.addEventListener(

        "click",

        exportExcel

    );


    pdfButton?.addEventListener(

        "click",

        exportPdf

    );


    /* =========================================================
       INITIAL LOAD
    ========================================================= */

    loadClients();


    /* =========================================================
       LIVE REFRESH
       
       Existing 10-second refresh preserved.
       
       This also refreshes the registration counts.
    ========================================================= */

    setInterval(

        loadClients,

        10000

    );

});