document.addEventListener("DOMContentLoaded", () => {


    /* =========================================================
       LOAD ADMIN DASHBOARD COUNTS
    ========================================================= */

    async function loadDashboardStats() {

        try {

            const response =
                await fetch(
                    "/api/admin/clients",
                    {
                        credentials: "include"
                    }
                );


            const result =
                await response.json();


            if (
                response.ok &&
                result.success
            ) {

                const clients =
                    Array.isArray(
                        result.clients
                    )
                        ? result.clients
                        : [];


                const clientCount =
                    document.getElementById(
                        "clientCount"
                    );


                if (clientCount) {

                    clientCount.textContent =
                        clients.length;

                }

            }

        }

        catch (error) {

            console.error(
                "Dashboard client count error:",
                error
            );

        }

    }



    /* =========================================================
       ADMIN PROFILE
    ========================================================= */

    const storedUser =
        localStorage.getItem(
            "caOfficeUser"
        );


    if (storedUser) {

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
                .join(" ") ||
                "Administrator";


            const name =
                document.getElementById(
                    "adminName"
                );


            const role =
                document.getElementById(
                    "adminRole"
                );


            const avatar =
                document.getElementById(
                    "adminAvatar"
                );


            if (name) {

                name.textContent =
                    displayName;

            }


            if (role) {

                role.textContent =
                    "Administrator";

            }


            if (avatar) {

                avatar.textContent =
                    displayName
                        .charAt(0)
                        .toUpperCase();

            }

        }

        catch (error) {

            console.error(
                "Admin profile error:",
                error
            );

        }

    }



    /* =========================================================
       LOGOUT
    ========================================================= */

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



    /* =========================================================
       INITIAL LOAD
    ========================================================= */

    loadDashboardStats();


});