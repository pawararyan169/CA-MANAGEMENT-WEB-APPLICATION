document.addEventListener(
    "DOMContentLoaded",
    () => {

        /* =====================================================
           FORM
        ===================================================== */

        const form =
            document.getElementById(
                "clientForm"
            );


        const saveButton =
            document.getElementById(
                "saveClientButton"
            );


        const errorBox =
            document.getElementById(
                "clientError"
            );


        const successBox =
            document.getElementById(
                "clientSuccess"
            );


        /* =====================================================
           LOCATION ELEMENTS

           Supports:
           clientState / state
           clientDistrict / district
           clientCity / city
        ===================================================== */

        const stateSelect =
            document.getElementById(
                "clientState"
            ) ||
            document.getElementById(
                "state"
            );


        const districtSelect =
            document.getElementById(
                "clientDistrict"
            ) ||
            document.getElementById(
                "district"
            );


        const citySelect =
            document.getElementById(
                "clientCity"
            ) ||
            document.getElementById(
                "city"
            );


        const locationSelect =
            document.getElementById(
                "locationId"
            );


        const authorisedSame =
            document.getElementById(
                "authorisedPersonSameAsClient"
            ) ||
            document.getElementById(
                "authorisedSameAsClient"
            );


        /* =====================================================
           CHECK LOCATION SCRIPT
        ===================================================== */

        if (
            typeof initializeClientLocation ===
            "function"
        ) {

            /*
             * location-data.js already
             * initializes the dropdowns.
             */

        } else {

            console.error(
                "location-data.js is not loaded."
            );

        }


        /* =====================================================
           VALUE HELPER
        ===================================================== */

        function value(id) {

            const element =
                document.getElementById(
                    id
                );


            if (!element) {
                return "";
            }


            return String(
                element.value || ""
            ).trim();

        }


        /* =====================================================
           CLIENT NAME
        ===================================================== */

        function getClientName() {

            const first =
                value(
                    "firstName"
                );


            const middle =
                value(
                    "middleName"
                );


            const last =
                value(
                    "lastName"
                );


            return [
                first,
                middle,
                last
            ]
                .filter(Boolean)
                .join(" ");

        }


        /* =====================================================
           AUTHORISED PERSON
        ===================================================== */

        function copyClientToAuthorisedPerson() {

            const name =
                document.getElementById(
                    "authorisedPersonName"
                );


            const contact =
                document.getElementById(
                    "authorisedPersonContact"
                );


            const email =
                document.getElementById(
                    "authorisedPersonEmail"
                );


            if (name) {

                name.value =
                    getClientName();

            }


            if (contact) {

                contact.value =
                    value(
                        "contact"
                    );

            }


            if (email) {

                email.value =
                    value(
                        "email"
                    );

            }

        }


        function setAuthorisedDisabled(
            disabled
        ) {

            [
                "authorisedPersonName",
                "authorisedPersonContact",
                "authorisedPersonEmail"
            ]
            .forEach(
                id => {

                    const element =
                        document.getElementById(
                            id
                        );


                    if (element) {

                        element.disabled =
                            disabled;

                    }

                }
            );

        }


        if (authorisedSame) {

            authorisedSame.addEventListener(
                "change",
                function () {

                    if (
                        this.checked
                    ) {

                        copyClientToAuthorisedPerson();

                        setAuthorisedDisabled(
                            true
                        );

                    } else {

                        setAuthorisedDisabled(
                            false
                        );

                    }

                }
            );

        }


        /* =====================================================
           KEEP AUTHORISED PERSON UPDATED
        ===================================================== */

        [
            "firstName",
            "middleName",
            "lastName",
            "contact",
            "email"
        ]
        .forEach(
            id => {

                const element =
                    document.getElementById(
                        id
                    );


                if (!element) {
                    return;
                }


                element.addEventListener(
                    "input",
                    () => {

                        if (
                            authorisedSame &&
                            authorisedSame.checked
                        ) {

                            copyClientToAuthorisedPerson();

                        }

                    }
                );

            }
        );


        /* =====================================================
           OFFICE LOCATIONS
        ===================================================== */

        async function loadOfficeLocations() {

            if (!locationSelect) {
                return;
            }


            locationSelect.innerHTML =
                `<option value="">
                    Loading office locations...
                </option>`;


            try {

                const response =
                    await fetch(
                        "/api/locations"
                    );


                const result =
                    await response.json();


                if (
                    !response.ok ||
                    !result.success
                ) {

                    throw new Error(
                        result.message ||
                        "Unable to load office locations."
                    );

                }


                locationSelect.innerHTML =
                    `<option value="">
                        Select office location
                    </option>`;


                const locations =
                    result.locations ||
                    [];


                locations.forEach(
                    location => {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            location.id;


                        let label =
                            location.name ||
                            "Office";


                        if (
                            location.city
                        ) {

                            label +=
                                " — " +
                                location.city;

                        }


                        if (
                            location.state
                        ) {

                            label +=
                                ", " +
                                location.state;

                        }


                        option.textContent =
                            label;


                        locationSelect.appendChild(
                            option
                        );

                    }
                );


            } catch (error) {

                console.error(
                    "Office location error:",
                    error
                );


                locationSelect.innerHTML =
                    `<option value="">
                        Unable to load office locations
                    </option>`;

            }

        }


        loadOfficeLocations();


        /* =====================================================
           MESSAGES
        ===================================================== */

        function hideMessages() {

            if (errorBox) {

                errorBox.style.display =
                    "none";

                errorBox.textContent =
                    "";

            }


            if (successBox) {

                successBox.style.display =
                    "none";

                successBox.textContent =
                    "";

            }

        }


        function showError(
            message
        ) {

            if (!errorBox) {

                alert(message);

                return;

            }


            errorBox.textContent =
                message;

            errorBox.style.display =
                "block";


            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }


        function showSuccess(
            message
        ) {

            if (!successBox) {

                alert(message);

                return;

            }


            successBox.textContent =
                message;

            successBox.style.display =
                "block";

        }


        /* =====================================================
           FORM SUBMIT
        ===================================================== */

        if (!form) {

            console.error(
                "Employee Add Client: #clientForm not found."
            );

            return;

        }


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                hideMessages();


                /* =============================================
                   COLLECT DATA
                ============================================= */

                const formData =
                    new FormData(
                        form
                    );


                const data =
                    Object.fromEntries(
                        formData.entries()
                    );


                /* =============================================
                   NORMALIZE
                ============================================= */

                Object.keys(
                    data
                ).forEach(
                    key => {

                        if (
                            typeof data[key] ===
                            "string"
                        ) {

                            data[key] =
                                data[key].trim();

                        }

                    }
                );


                data.pan =
                    data.pan
                        ?.toUpperCase() ||
                    "";


                data.tan =
                    data.tan
                        ?.toUpperCase() ||
                    "";


                data.gst =
                    data.gst
                        ?.toUpperCase() ||
                    "";


                data.udyam =
                    data.udyam
                        ?.toUpperCase() ||
                    "";


                data.cin =
                    data.cin
                        ?.toUpperCase() ||
                    "";


                data.ptec =
                    data.ptec
                        ?.toUpperCase() ||
                    "";


                data.ptrc =
                    data.ptrc
                        ?.toUpperCase() ||
                    "";


                data.aadhaar =
                    data.aadhaar
                        ?.replace(
                            /\s/g,
                            ""
                        ) ||
                    "";


                /* =============================================
                   FORCE LOCATION VALUES

                   This avoids FormData problems when
                   select elements don't have name attributes.
                ============================================= */

                if (stateSelect) {

                    data.state =
                        stateSelect.value.trim();

                }


                if (districtSelect) {

                    data.district =
                        districtSelect.value.trim();

                }


                if (citySelect) {

                    data.city =
                        citySelect.value.trim();

                }


                if (locationSelect) {

                    data.locationId =
                        locationSelect.value.trim();

                }


                /* =============================================
                   VALIDATION
                ============================================= */

                if (
                    !data.firstName ||
                    !data.lastName
                ) {

                    showError(
                        "First name and last name are required."
                    );

                    return;

                }


                if (
                    !data.clientType
                ) {

                    showError(
                        "Please select the client type."
                    );

                    return;

                }


                if (
                    !data.state
                ) {

                    showError(
                        "Please select a state."
                    );

                    return;

                }


                if (
                    data.state.toLowerCase() ===
                    "gujarat"
                ) {

                    if (
                        !data.district
                    ) {

                        showError(
                            "Please select the district."
                        );

                        return;

                    }


                    if (
                        !data.city
                    ) {

                        showError(
                            "Please select the city / town."
                        );

                        return;

                    }

                }


                if (
                    !data.locationId
                ) {

                    showError(
                        "Please select the office location."
                    );

                    return;

                }


                if (
                    !data.contact ||
                    !/^[6-9][0-9]{9}$/.test(
                        data.contact
                    )
                ) {

                    showError(
                        "Enter a valid 10-digit Indian mobile number."
                    );

                    return;

                }


                if (
                    data.email &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                        .test(
                            data.email
                        )
                ) {

                    showError(
                        "Enter a valid email address."
                    );

                    return;

                }


                /* =============================================
                   SAVE
                ============================================= */

                if (saveButton) {

                    saveButton.disabled =
                        true;

                    saveButton.textContent =
                        "Saving...";

                }


                try {

                    const response =
                        await fetch(
                            "/api/clients",
                            {
                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        data
                                    )
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
                            "Unable to create client."
                        );

                    }


                    showSuccess(
                        "Client created successfully."
                    );


                    setTimeout(
                        () => {

                            window.location.href =
                                "/employee/clients.html";

                        },
                        1000
                    );


                } catch (error) {

                    console.error(
                        "Employee Add Client Error:",
                        error
                    );


                    showError(
                        error.message ||
                        "Unable to create client."
                    );


                } finally {

                    if (saveButton) {

                        saveButton.disabled =
                            false;

                        saveButton.textContent =
                            "Save Client";

                    }

                }

            }
        );


        /* =====================================================
           LOGOUT
        ===================================================== */

        const logoutButton =
            document.getElementById(
                "logoutButton"
            );


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

    }
);