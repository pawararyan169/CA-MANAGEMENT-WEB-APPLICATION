document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "addEmployeeForm"
            );


        const message =
            document.getElementById(
                "employeeMessage"
            );


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const button =
                    form.querySelector(
                        'button[type="submit"]'
                    );


                const data = {

                    firstName:
                        document.getElementById(
                            "firstName"
                        ).value.trim(),

                    middleName:
                        document.getElementById(
                            "middleName"
                        ).value.trim(),

                    lastName:
                        document.getElementById(
                            "lastName"
                        ).value.trim(),

                    designation:
                        document.getElementById(
                            "designation"
                        ).value.trim(),

                    email:
                        document.getElementById(
                            "email"
                        ).value.trim(),

                    phone:
                        document.getElementById(
                            "phone"
                        ).value.trim(),

                    username:
                        document.getElementById(
                            "username"
                        ).value.trim(),

                    password:
                        document.getElementById(
                            "password"
                        ).value

                };


                button.disabled =
                    true;

                button.textContent =
                    "Creating...";


                try {

                    const response =
                        await fetch(
                            "/api/employees",
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


                    if (!response.ok) {

                        throw new Error(
                            result.message ||
                            "Unable to create employee."
                        );

                    }


                    message.className =
                        "task-success-message";

                    message.style.display =
                        "block";

                    message.textContent =
                        "Employee created successfully. Username: " +
                        result.employee.username;


                    form.reset();


                }

                catch (error) {

                    message.className =
                        "task-success-message";

                    message.style.display =
                        "block";

                    message.style.background =
                        "#fff1f1";

                    message.style.borderColor =
                        "#ffd5d5";

                    message.style.color =
                        "#c93636";

                    message.textContent =
                        error.message;

                }

                finally {

                    button.disabled =
                        false;

                    button.textContent =
                        "Create employee";

                }

            }
        );

    }
);