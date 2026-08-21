document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       PASSWORD VISIBILITY
    ========================================================= */

    document
        .querySelectorAll(".password-toggle")
        .forEach(button => {

            button.addEventListener("click", () => {

                const target =
                    button.dataset.target;

                const input =
                    document.getElementById(target);

                if (!input) {
                    return;
                }

                input.type =
                    input.type === "password"
                        ? "text"
                        : "password";

            });

        });


    /* =========================================================
       LOGIN
       AUTH.JS ONLY HANDLES AUTHENTICATION
    ========================================================= */

    const loginForm =
        document.getElementById("loginForm");


    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const username =
                    document
                        .getElementById("loginUsername")
                        ?.value
                        .trim();


                const password =
                    document
                        .getElementById("loginPassword")
                        ?.value;


                if (!username || !password) {

                    showLoginError(
                        "Enter your username and password."
                    );

                    return;

                }


                const submitButton =
                    loginForm.querySelector(
                        'button[type="submit"]'
                    );


                if (submitButton) {

                    submitButton.disabled = true;

                    submitButton.dataset.originalText =
                        submitButton.innerHTML;

                    submitButton.innerHTML =
                        "<span>Signing in...</span>";

                }


                try {

                    const response =
                        await fetch(
                            "/api/auth/login",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        username,
                                        password
                                    })
                            }
                        );


                    /*
                     * Don't blindly call response.json().
                     * This prevents the "Unexpected end of JSON"
                     * error if the server returns an empty response.
                     */

                    const contentType =
                        response.headers.get(
                            "content-type"
                        ) || "";


                    let result = {};


                    if (
                        contentType.includes(
                            "application/json"
                        )
                    ) {

                        result =
                            await response.json();

                    }


                    if (!response.ok) {

                        showLoginError(
                            result.message ||
                            "Invalid username or password."
                        );

                        return;

                    }


                    if (
                        !result.user ||
                        !result.user.role
                    ) {

                        showLoginError(
                            "Login succeeded but the server did not return a valid user account."
                        );

                        return;

                    }


                    /*
                     * Store authentication state.
                     */

                    localStorage.setItem(
                        "caOfficeLoggedIn",
                        "true"
                    );


                    localStorage.setItem(
                        "caOfficeUser",
                        JSON.stringify(
                            result.user
                        )
                    );


                    /*
                     * IMPORTANT:
                     *
                     * ADMIN -> ADMIN ONLY
                     * EMPLOYEE -> EMPLOYEE ONLY
                     */

                    if (
                        result.user.role ===
                        "admin"
                    ) {

                        window.location.replace(
                            "/admin/dashboard.html"
                        );

                        return;

                    }


                    if (
                        result.user.role ===
                        "employee"
                    ) {

                        window.location.replace(
                            "/employee/dashboard.html"
                        );

                        return;

                    }


                    /*
                     * Unknown role
                     */

                    localStorage.removeItem(
                        "caOfficeLoggedIn"
                    );

                    localStorage.removeItem(
                        "caOfficeUser"
                    );


                    showLoginError(
                        "This account has an unsupported role."
                    );

                }

                catch (error) {

                    console.error(
                        "Login error:",
                        error
                    );


                    showLoginError(
                        "Unable to connect to the server."
                    );

                }

                finally {

                    if (submitButton) {

                        submitButton.disabled =
                            false;


                        submitButton.innerHTML =
                            submitButton.dataset.originalText ||
                            "<span>Sign in</span>";

                    }

                }

            }
        );

    }


    /* =========================================================
       SIGNUP REQUEST
    ========================================================= */

    const signupForm =
        document.getElementById("signupForm");


    if (signupForm) {

        signupForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                /* =============================================
                   GET VALUES
                ============================================= */

                const firstName =
                    document
                        .getElementById("signupFirstName")
                        ?.value
                        .trim();


                const middleName =
                    document
                        .getElementById("signupMiddleName")
                        ?.value
                        .trim() || "";


                const lastName =
                    document
                        .getElementById("signupLastName")
                        ?.value
                        .trim();


                const email =
                    document
                        .getElementById("signupEmail")
                        ?.value
                        .trim();


                const phone =
                    document
                        .getElementById("signupPhone")
                        ?.value
                        .trim();


                const aadhaar =
                    document
                        .getElementById("signupAadhaar")
                        ?.value
                        .replace(/\s/g, "");


                const pan =
                    document
                        .getElementById("signupPan")
                        ?.value
                        .trim()
                        .toUpperCase();


                const message =
                    document
                        .getElementById("signupMessage")
                        ?.value
                        .trim() || "";


                const agreement =
                    document
                        .getElementById("signupAgreement")
                        ?.checked;


                /* =============================================
                   CLEAR ERRORS
                ============================================= */

                clearSignupErrors();


                let hasError = false;


                /* =============================================
                   FIRST NAME
                ============================================= */

                if (!firstName) {

                    showFieldError(
                        "firstNameError",
                        "First name is required."
                    );

                    hasError = true;

                }


                /* =============================================
                   LAST NAME
                ============================================= */

                if (!lastName) {

                    showFieldError(
                        "lastNameError",
                        "Last name is required."
                    );

                    hasError = true;

                }


                /* =============================================
                   EMAIL
                ============================================= */

                if (!email) {

                    showFieldError(
                        "emailError",
                        "Email address is required."
                    );

                    hasError = true;

                }

                else if (
                    !isValidEmail(email)
                ) {

                    showFieldError(
                        "emailError",
                        "Enter a valid email address."
                    );

                    hasError = true;

                }


                /* =============================================
                   PHONE
                ============================================= */

                if (!phone) {

                    showFieldError(
                        "phoneError",
                        "Phone number is required."
                    );

                    hasError = true;

                }

                else if (
                    !/^[6-9]\d{9}$/.test(phone)
                ) {

                    showFieldError(
                        "phoneError",
                        "Enter a valid 10-digit Indian phone number."
                    );

                    hasError = true;

                }


                /* =============================================
                   AADHAAR
                ============================================= */

                if (!aadhaar) {

                    showFieldError(
                        "aadhaarError",
                        "Aadhaar number is required."
                    );

                    hasError = true;

                }

                else if (
                    !/^\d{12}$/.test(aadhaar)
                ) {

                    showFieldError(
                        "aadhaarError",
                        "Aadhaar number must contain 12 digits."
                    );

                    hasError = true;

                }


                /* =============================================
                   PAN
                ============================================= */

                if (!pan) {

                    showFieldError(
                        "panError",
                        "PAN number is required."
                    );

                    hasError = true;

                }

                else if (
                    !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)
                ) {

                    showFieldError(
                        "panError",
                        "Enter a valid PAN number."
                    );

                    hasError = true;

                }


                /* =============================================
                   AGREEMENT
                ============================================= */

                if (!agreement) {

                    showSignupError(
                        "Please confirm that the information provided is accurate."
                    );

                    hasError = true;

                }


                if (hasError) {

                    return;

                }


                /* =============================================
                   SUBMIT BUTTON
                ============================================= */

                const submitButton =
                    signupForm.querySelector(
                        'button[type="submit"]'
                    );


                if (submitButton) {

                    submitButton.disabled =
                        true;

                    submitButton.dataset.originalText =
                        submitButton.innerHTML;

                    submitButton.innerHTML =
                        "<span>Submitting...</span>";

                }


                /* =============================================
                   SEND REQUEST TO SERVER
                ============================================= */

                try {

                    console.log(
                        "Submitting employee signup request..."
                    );


                    const response =
                        await fetch(
                            "/api/signup-request",
                            {

                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({

                                        firstName,

                                        middleName,

                                        lastName,

                                        email,

                                        phone,

                                        aadhaar,

                                        pan,

                                        message

                                    })

                            }
                        );


                    const contentType =
                        response.headers.get(
                            "content-type"
                        ) || "";


                    let result = {};


                    if (
                        contentType.includes(
                            "application/json"
                        )
                    ) {

                        result =
                            await response.json();

                    }


                    console.log(
                        "Signup response:",
                        result
                    );


                    if (!response.ok) {

                        showSignupError(
                            result.message ||
                            "Unable to submit your registration request."
                        );

                        return;

                    }


                    /* =============================================
                       SUCCESS
                    ============================================= */

                    const success =
                        document.getElementById(
                            "signupSuccess"
                        );


                    if (success) {

                        success.textContent =
                            "Your registration request has been sent to the administrator. You will receive your login credentials after approval.";

                        success.style.display =
                            "block";

                    }


                    const errorElement =
                        document.getElementById(
                            "signupError"
                        );


                    if (errorElement) {

                        errorElement.style.display =
                            "none";

                        errorElement.textContent =
                            "";

                    }


                    signupForm.reset();


                    if (success) {

                        success.style.display =
                            "block";

                    }

                }

                catch (error) {

                    console.error(
                        "Signup error:",
                        error
                    );


                    showSignupError(
                        "Unable to connect to the server."
                    );

                }

                finally {

                    if (submitButton) {

                        submitButton.disabled =
                            false;

                        submitButton.innerHTML =
                            submitButton.dataset.originalText ||
                            "<span>Submit access request</span>";

                    }

                }

            }
        );

    }


    /* =========================================================
       HELPERS
    ========================================================= */

    function isValidEmail(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email);

    }


    function showFieldError(
        elementId,
        message
    ) {

        const element =
            document.getElementById(
                elementId
            );


        if (!element) {

            return;

        }


        element.textContent =
            message;

    }


    function clearSignupErrors() {

        const errorIds = [

            "firstNameError",

            "middleNameError",

            "lastNameError",

            "emailError",

            "phoneError",

            "aadhaarError",

            "panError"

        ];


        errorIds.forEach(
            id => {

                const element =
                    document.getElementById(
                        id
                    );


                if (element) {

                    element.textContent =
                        "";

                }

            }
        );


        const signupError =
            document.getElementById(
                "signupError"
            );


        if (signupError) {

            signupError.style.display =
                "none";

            signupError.textContent =
                "";

        }

    }


    function showLoginError(
        message
    ) {

        const element =
            document.getElementById(
                "loginError"
            );


        if (!element) {

            alert(message);

            return;

        }


        element.textContent =
            message;

        element.style.display =
            "block";

    }


    function showSignupError(
        message
    ) {

        const element =
            document.getElementById(
                "signupError"
            );


        if (!element) {

            alert(message);

            return;

        }


        element.textContent =
            message;

        element.style.display =
            "block";

    }

});