document.addEventListener("DOMContentLoaded", () => {

    const clientList =
        document.getElementById("clientList");

    const searchInput =
        document.getElementById("clientSearch");

    const errorBox =
        document.getElementById("clientError");


    let clients = [];


    /* =========================================================
       LOAD CLIENTS
    ========================================================= */

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
                "Client loading error:",
                error
            );


            showError(
                error.message ||
                "Unable to load client information."
            );

        }

    }


    /* =========================================================
       RENDER CLIENTS
    ========================================================= */

    function renderClients(
        clientData
    ) {

        clientList.innerHTML = "";


        if (
            !clientData ||
            clientData.length === 0
        ) {

            clientList.innerHTML = `

                <div class="empty-client">

                    <strong>
                        No clients found
                    </strong>

                    <span>
                        Client records added by the administrator will appear here.
                    </span>

                </div>

            `;

            return;

        }


        clientData.forEach(
            client => {

                const card =
                    createClientCard(
                        client
                    );


                clientList.appendChild(
                    card
                );

            }
        );

    }


    /* =========================================================
       CREATE CLIENT CARD
    ========================================================= */

    function createClientCard(
        client
    ) {

        const card =
            document.createElement(
                "div"
            );


        card.className =
            "client-card";


        const firstName =
            client.first_name ||
            "";


        const middleName =
            client.middle_name ||
            "";


        const lastName =
            client.last_name ||
            "";


        const fullName =
            [
                firstName,
                middleName,
                lastName
            ]
                .filter(Boolean)
                .join(" ");


        const initials =
            getInitials(
                fullName ||
                "Client"
            );


        const clientType =
            client.client_type ||
            client.type ||
            "Not specified";


        card.innerHTML = `

            <div class="client-card-header">

                <div class="client-name-area">

                    <div class="client-avatar">
                        ${escapeHtml(initials)}
                    </div>

                    <div>

                        <h2>
                            ${escapeHtml(
                                fullName ||
                                "Unnamed Client"
                            )}
                        </h2>

                        <span>
                            ${escapeHtml(
                                client.location_name ||
                                client.location ||
                                "Location not specified"
                            )}
                        </span>

                    </div>

                </div>


                <span class="client-type">
                    ${escapeHtml(clientType)}
                </span>

            </div>


            <div class="client-information">


                <!-- BASIC INFORMATION -->

                <div class="client-section">
                    Basic Information
                </div>


                ${field(
                    "First Name",
                    client.first_name
                )}

                ${field(
                    "Middle Name",
                    client.middle_name
                )}

                ${field(
                    "Last Name",
                    client.last_name
                )}

                ${field(
                    "Gender",
                    client.gender
                )}


                ${field(
                    "Date of Birth / Registration",
                    client.date_of_birth ||
                    client.date_of_registration ||
                    client.registration_date
                )}


                ${field(
                    "Location",
                    client.location_name ||
                    client.location
                )}


                ${field(
                    "Client Type",
                    clientType
                )}


                ${field(
                    "Address",
                    client.address,
                    true
                )}


                <!-- TAX INFORMATION -->

                <div class="client-section">
                    Tax & Registration Information
                </div>


                ${field(
                    "PAN Number",
                    client.pan_number
                )}

                ${field(
                    "Aadhaar Number",
                    client.adhar_number ||
                    client.aadhaar_number
                )}

                ${field(
                    "TAN Number",
                    client.tan_number
                )}

                ${field(
                    "GST Number",
                    client.gst_number
                )}

                ${field(
                    "MSME / Udyam Number",
                    client.msme_udhyam_number ||
                    client.udyam_number
                )}

                ${field(
                    "CIN Number",
                    client.cin_number
                )}

                ${field(
                    "FSSAI Number",
                    client.fssai_number
                )}

                ${field(
                    "PTEC Number",
                    client.ptec_number
                )}

                ${field(
                    "PTRC Number",
                    client.ptrc_number
                )}


                <!-- CONTACT -->

                <div class="client-section">
                    Contact Information
                </div>


                ${field(
                    "Contact Number",
                    client.contact_number ||
                    client.phone
                )}

                ${field(
                    "Email",
                    client.email
                )}


                <!-- AUTHORISED PERSON -->

                <div class="client-section">
                    Authorised Person
                </div>


                ${field(
                    "Authorised Person",
                    client.authorised_person_name ||
                    client.authorized_person_name
                )}

                ${field(
                    "Authorised Person Contact",
                    client.authorised_person_contact ||
                    client.authorized_person_contact
                )}

            </div>

        `;


        return card;

    }


    /* =========================================================
       FIELD
    ========================================================= */

    function field(
        label,
        value,
        fullWidth = false
    ) {

        const displayValue =
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
                ? String(value)
                : "—";


        return `

            <div
                class="client-field ${
                    fullWidth
                        ? "full"
                        : ""
                }"
            >

                <span class="client-field-label">
                    ${escapeHtml(label)}
                </span>

                <span class="client-field-value">
                    ${escapeHtml(displayValue)}
                </span>

            </div>

        `;

    }


    /* =========================================================
       SEARCH
    ========================================================= */

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                const query =
                    searchInput.value
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

                            const searchableText =
                                [

                                    client.first_name,

                                    client.middle_name,

                                    client.last_name,

                                    client.email,

                                    client.phone,

                                    client.contact_number,

                                    client.pan_number,

                                    client.gst_number,

                                    client.location_name,

                                    client.location,

                                    client.client_type,

                                    client.type

                                ]
                                    .filter(Boolean)
                                    .join(" ")
                                    .toLowerCase();


                            return searchableText
                                .includes(query);

                        }
                    );


                renderClients(
                    filtered
                );

            }
        );

    }


    /* =========================================================
       ERROR
    ========================================================= */

    function showError(
        message
    ) {

        if (!errorBox) {
            return;
        }


        errorBox.textContent =
            message;


        errorBox.style.display =
            "block";

    }


    /* =========================================================
       INITIALS
    ========================================================= */

    function getInitials(
        name
    ) {

        return name
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

    }


    /* =========================================================
       HTML ESCAPE
    ========================================================= */

    function escapeHtml(
        value
    ) {

        return String(value ?? "")
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
       START
    ========================================================= */

    loadClients();

});