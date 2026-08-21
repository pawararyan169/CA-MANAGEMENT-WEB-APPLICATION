document.addEventListener(
    "DOMContentLoaded",
    () => {


        const employeeSelect =
            document.getElementById(
                "taskEmployee"
            );


        const clientSelect =
            document.getElementById(
                "taskClient"
            );


        const taskForm =
            document.getElementById(
                "taskForm"
            );


        const taskList =
            document.getElementById(
                "taskList"
            );


        const taskCount =
            document.getElementById(
                "taskCount"
            );


        const taskError =
            document.getElementById(
                "taskError"
            );


        const taskSuccess =
            document.getElementById(
                "taskSuccess"
            );


        /* =====================================================
           LOAD EMPLOYEES
        ===================================================== */

        async function loadEmployees() {

            try {

                const response =
                    await fetch(
                        "/api/admin/task-employees"
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.message ||
                        "Unable to load employees."
                    );

                }


                employeeSelect.innerHTML =
                    `
                    <option value="">
                        Select employee
                    </option>
                    `;


                result.employees.forEach(
                    employee => {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            employee.id;


                        option.textContent =
                            employee.name +
                            (
                                employee.designation
                                    ? " — " +
                                      employee.designation
                                    : ""
                            );


                        employeeSelect.appendChild(
                            option
                        );

                    }
                );

            }

            catch (error) {

                console.error(error);

                employeeSelect.innerHTML =
                    `
                    <option value="">
                        Unable to load employees
                    </option>
                    `;

            }

        }



        /* =====================================================
           LOAD CLIENTS
        ===================================================== */

        async function loadClients() {

            try {

                const response =
                    await fetch(
                        "/api/admin/task-clients"
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.message ||
                        "Unable to load clients."
                    );

                }


                clientSelect.innerHTML =
                    `
                    <option value="">
                        No client selected
                    </option>
                    `;


                result.clients.forEach(
                    client => {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            client.id;


                        option.textContent =
                            client.name +
                            (
                                client.pan
                                    ? " — " +
                                      client.pan
                                    : ""
                            );


                        clientSelect.appendChild(
                            option
                        );

                    }
                );

            }

            catch (error) {

                console.error(error);

                clientSelect.innerHTML =
                    `
                    <option value="">
                        No clients available
                    </option>
                    `;

            }

        }



        /* =====================================================
           CREATE TASK
        ===================================================== */

        taskForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                taskError.textContent =
                    "";

                taskSuccess.style.display =
                    "none";


                const title =
                    document.getElementById(
                        "taskTitle"
                    ).value.trim();


                const description =
                    document.getElementById(
                        "taskDescription"
                    ).value.trim();


                const assignedTo =
                    employeeSelect.value;


                const clientId =
                    clientSelect.value;


                const priority =
                    document.getElementById(
                        "taskPriority"
                    ).value;


                const dueDate =
                    document.getElementById(
                        "taskDueDate"
                    ).value;


                if (!title) {

                    taskError.textContent =
                        "Enter a task title.";

                    return;

                }


                if (!assignedTo) {

                    taskError.textContent =
                        "Select an employee.";

                    return;

                }


                const button =
                    document.getElementById(
                        "assignTaskButton"
                    );


                button.disabled =
                    true;

                button.textContent =
                    "Assigning...";


                try {

                    const response =
                        await fetch(
                            "/api/admin/tasks",
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({

                                        title,

                                        description,

                                        assigned_to:
                                            assignedTo,

                                        client_id:
                                            clientId ||
                                            null,

                                        priority,

                                        due_date:
                                            dueDate ||
                                            null

                                    })

                            }
                        );


                    const result =
                        await response.json();


                    if (!response.ok) {

                        throw new Error(
                            result.message ||
                            "Unable to create task."
                        );

                    }


                    taskSuccess.textContent =
                        "Task assigned successfully.";


                    taskSuccess.style.display =
                        "block";


                    taskForm.reset();


                    await loadTasks();


                }

                catch (error) {

                    console.error(error);

                    taskError.textContent =
                        error.message ||
                        "Unable to assign task.";

                }

                finally {

                    button.disabled =
                        false;

                    button.textContent =
                        "Assign task";

                }

            }
        );



        /* =====================================================
           LOAD TASKS
        ===================================================== */

        async function loadTasks() {

            try {

                const response =
                    await fetch(
                        "/api/admin/tasks"
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.message ||
                        "Unable to load tasks."
                    );

                }


                const tasks =
                    result.tasks || [];


                taskCount.textContent =
                    tasks.length +
                    (
                        tasks.length === 1
                            ? " task"
                            : " tasks"
                    );


                if (!tasks.length) {

                    taskList.innerHTML =
                        `
                        <div class="empty-state">

                            <strong>
                                No tasks assigned yet
                            </strong>

                            <span>
                                Create a task above to assign work.
                            </span>

                        </div>
                        `;

                    return;

                }


                taskList.innerHTML =
                    "";


                tasks.forEach(
                    task => {

                        const card =
                            document.createElement(
                                "article"
                            );


                        card.className =
                            "work-card";


                        const progress =
                            task.status ===
                            "completed"
                                ? 100
                                : task.status ===
                                  "in_progress"
                                    ? 50
                                    : 0;


                        card.innerHTML =
                            `

                            <div class="work-card-top">

                                <div>

                                    <span class="work-id">
                                        ${escapeHtml(task.id)}
                                    </span>

                                    <h3>
                                        ${escapeHtml(task.title)}
                                    </h3>

                                </div>

                                <span
                                    class="priority-badge ${escapeHtml(task.priority || "medium")}"
                                >
                                    ${escapeHtml(
                                        (task.priority || "medium")
                                            .toUpperCase()
                                    )}
                                </span>

                            </div>


                            <p class="work-description">
                                ${escapeHtml(
                                    task.description ||
                                    "No description provided."
                                )}
                            </p>


                            <div class="work-meta">

                                <div>

                                    <span>
                                        Assigned to
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            task.employee_name
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Status
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            formatStatus(
                                                task.status
                                            )
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Due date
                                    </span>

                                    <strong>
                                        ${
                                            task.due_date
                                                ? escapeHtml(
                                                    formatDate(
                                                        task.due_date
                                                    )
                                                )
                                                : "No due date"
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Created
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            formatDate(
                                                task.created_at
                                            )
                                        )}
                                    </strong>

                                </div>

                            </div>


                            <div class="progress-area">

                                <div class="progress-header">

                                    <span>
                                        Progress
                                    </span>

                                    <strong>
                                        ${progress}%
                                    </strong>

                                </div>


                                <div class="progress-track">

                                    <div
                                        class="progress-fill"
                                        style="width:${progress}%"
                                    ></div>

                                </div>

                            </div>

                            `;


                        taskList.appendChild(
                            card
                        );

                    }
                );

            }

            catch (error) {

                console.error(error);


                taskList.innerHTML =
                    `
                    <div class="empty-state">

                        <strong>
                            Unable to load tasks
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
           HELPERS
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


        function formatStatus(
            status
        ) {

            if (!status) {
                return "Pending";
            }


            return String(status)
                .replace(
                    /_/g,
                    " "
                )
                .replace(
                    /\b\w/g,
                    character =>
                        character.toUpperCase()
                );

        }


        function formatDate(
            value
        ) {

            if (!value) {
                return "—";
            }


            const date =
                new Date(value);


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return value;

            }


            return date.toLocaleDateString(
                "en-IN",
                {

                    day:
                        "2-digit",

                    month:
                        "short",

                    year:
                        "numeric"

                }
            );

        }



        /* =====================================================
           INITIAL LOAD
        ===================================================== */

        loadEmployees();

        loadClients();

        loadTasks();

    }
);