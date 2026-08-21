document.addEventListener("DOMContentLoaded", () => {

    /*
     * =========================================================
     * TASK MANAGEMENT SYSTEM
     * =========================================================
     *
     * Temporary storage:
     * localStorage
     *
     * Later:
     * MongoDB + Express API
     * =========================================================
     */


    const STORAGE_KEY = "caOfficeTasks";


    /*
     * =========================================================
     * DEMO EMPLOYEES
     * =========================================================
     */

    const employees = [
        {
            id: "EMP001",
            name: "Priya Sharma",
            role: "Senior Accountant",
            email: "priya@caoffice.com"
        },

        {
            id: "EMP002",
            name: "Rahul Mehta",
            role: "Tax Executive",
            email: "rahul@caoffice.com"
        },

        {
            id: "EMP003",
            name: "Neha Patel",
            role: "Accountant",
            email: "neha@caoffice.com"
        },

        {
            id: "EMP004",
            name: "Amit Shah",
            role: "Audit Associate",
            email: "amit@caoffice.com"
        }
    ];


    /*
     * =========================================================
     * DEMO CLIENTS
     * =========================================================
     */

    const clients = [
        {
            id: "CLI001",
            name: "ABC Trading Pvt. Ltd."
        },

        {
            id: "CLI002",
            name: "Mehta Enterprises"
        },

        {
            id: "CLI003",
            name: "Sharma & Associates"
        },

        {
            id: "CLI004",
            name: "Kumar Enterprises"
        },

        {
            id: "CLI005",
            name: "Patel Industries"
        }
    ];


    /*
     * =========================================================
     * DEFAULT TASKS
     * =========================================================
     */

    function createDefaultTasks() {

        return [
            {
                id: "TASK001",

                title: "GST return preparation",

                description:
                    "Prepare the monthly GST return and verify all purchase and sales invoices.",

                employeeId: "EMP001",

                clientId: "CLI001",

                priority: "High",

                status: "In Progress",

                progress: 60,

                dueDate: "2026-08-20",

                createdAt: new Date().toISOString(),

                updates: [
                    {
                        employeeId: "EMP001",

                        status: "In Progress",

                        progress: 60,

                        note:
                            "Purchase invoices have been reconciled. Sales invoices are being verified.",

                        date: new Date().toISOString()
                    }
                ]
            },

            {
                id: "TASK002",

                title: "ITR document verification",

                description:
                    "Verify client documents and prepare the file for ITR submission.",

                employeeId: "EMP002",

                clientId: "CLI002",

                priority: "Medium",

                status: "Under Review",

                progress: 80,

                dueDate: "2026-08-22",

                createdAt: new Date().toISOString(),

                updates: [
                    {
                        employeeId: "EMP002",

                        status: "Under Review",

                        progress: 80,

                        note:
                            "All major documents have been checked. Form 16 clarification is pending.",

                        date: new Date().toISOString()
                    }
                ]
            },

            {
                id: "TASK003",

                title: "TDS reconciliation",

                description:
                    "Reconcile TDS entries with Form 26AS and accounting records.",

                employeeId: "EMP003",

                clientId: "CLI004",

                priority: "High",

                status: "Assigned",

                progress: 10,

                dueDate: "2026-08-25",

                createdAt: new Date().toISOString(),

                updates: []
            }
        ];

    }


    /*
     * =========================================================
     * GET TASKS
     * =========================================================
     */

    function getTasks() {

        const stored =
            localStorage.getItem(STORAGE_KEY);


        if (!stored) {

            const defaults =
                createDefaultTasks();


            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(defaults)
            );


            return defaults;
        }


        try {

            return JSON.parse(stored);

        } catch (error) {

            console.error(
                "Could not load tasks.",
                error
            );

            return [];
        }

    }


    /*
     * =========================================================
     * SAVE TASKS
     * =========================================================
     */

    function saveTasks(tasks) {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(tasks)
        );

    }


    /*
     * =========================================================
     * GET EMPLOYEE
     * =========================================================
     */

    function getEmployee(employeeId) {

        return employees.find(
            employee =>
                employee.id === employeeId
        );

    }


    /*
     * =========================================================
     * GET CLIENT
     * =========================================================
     */

    function getClient(clientId) {

        return clients.find(
            client =>
                client.id === clientId
        );

    }


    /*
     * =========================================================
     * ADMIN TASK PAGE
     * =========================================================
     */

    const assignForm =
        document.getElementById(
            "assignTaskForm"
        );


    if (assignForm) {

        populateEmployeeSelect();

        populateClientSelect();


        assignForm.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();


                const title =
                    document.getElementById(
                        "taskTitle"
                    ).value.trim();


                const description =
                    document.getElementById(
                        "taskDescription"
                    ).value.trim();


                const employeeId =
                    document.getElementById(
                        "taskEmployee"
                    ).value;


                const clientId =
                    document.getElementById(
                        "taskClient"
                    ).value;


                const priority =
                    document.getElementById(
                        "taskPriority"
                    ).value;


                const dueDate =
                    document.getElementById(
                        "taskDueDate"
                    ).value;


                let valid = true;


                clearTaskFormErrors();


                if (!title) {

                    showTaskError(
                        "taskTitleError",
                        "Enter a task title."
                    );

                    valid = false;
                }


                if (!employeeId) {

                    showTaskError(
                        "taskEmployeeError",
                        "Select an employee."
                    );

                    valid = false;
                }


                if (!clientId) {

                    showTaskError(
                        "taskClientError",
                        "Select a client."
                    );

                    valid = false;
                }


                if (!dueDate) {

                    showTaskError(
                        "taskDueDateError",
                        "Select a deadline."
                    );

                    valid = false;
                }


                if (!valid) {

                    return;
                }


                const tasks =
                    getTasks();


                const newTask = {

                    id:
                        "TASK" +
                        Date.now(),

                    title:

                        title,

                    description:

                        description,

                    employeeId:

                        employeeId,

                    clientId:

                        clientId,

                    priority:

                        priority,

                    status:

                        "Assigned",

                    progress:

                        0,

                    dueDate:

                        dueDate,

                    createdAt:

                        new Date().toISOString(),

                    updates:

                        []

                };


                tasks.unshift(
                    newTask
                );


                saveTasks(tasks);


                showTaskMessage(
                    "Task assigned successfully."
                );


                assignForm.reset();


                renderAdminTasks();

            }
        );

    }


    /*
     * =========================================================
     * EMPLOYEE TASK PAGE
     * =========================================================
     */

    const employeeTaskContainer =
        document.getElementById(
            "employeeTaskList"
        );


    if (employeeTaskContainer) {

        renderEmployeeTasks();

    }


    /*
     * =========================================================
     * ADMIN TASK LIST
     * =========================================================
     */

    const adminTaskContainer =
        document.getElementById(
            "adminTaskList"
        );


    if (adminTaskContainer) {

        renderAdminTasks();

    }


    /*
     * =========================================================
     * POPULATE EMPLOYEE SELECT
     * =========================================================
     */

    function populateEmployeeSelect() {

        const select =
            document.getElementById(
                "taskEmployee"
            );


        if (!select) {

            return;
        }


        employees.forEach(
            employee => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    employee.id;


                option.textContent =
                    `${employee.name} — ${employee.role}`;


                select.appendChild(
                    option
                );

            }
        );

    }


    /*
     * =========================================================
     * POPULATE CLIENT SELECT
     * =========================================================
     */

    function populateClientSelect() {

        const select =
            document.getElementById(
                "taskClient"
            );


        if (!select) {

            return;
        }


        clients.forEach(
            client => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    client.id;


                option.textContent =
                    client.name;


                select.appendChild(
                    option
                );

            }
        );

    }


    /*
     * =========================================================
     * ADMIN TASK LIST
     * =========================================================
     */

    function renderAdminTasks() {

        const container =
            document.getElementById(
                "adminTaskList"
            );


        if (!container) {

            return;
        }


        const tasks =
            getTasks();


        if (tasks.length === 0) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>No tasks yet</strong>
                    <span>Create your first task using the form above.</span>
                </div>
            `;

            return;
        }


        container.innerHTML =
            tasks.map(
                task => {

                    const employee =
                        getEmployee(
                            task.employeeId
                        );


                    const client =
                        getClient(
                            task.clientId
                        );


                    const latestUpdate =
                        task.updates &&
                        task.updates.length
                            ? task.updates[
                                task.updates.length - 1
                            ]
                            : null;


                    return `

                        <div class="work-card">

                            <div class="work-card-top">

                                <div>

                                    <span class="work-id">
                                        ${task.id}
                                    </span>

                                    <h3>
                                        ${escapeHtml(task.title)}
                                    </h3>

                                </div>

                                <span
                                    class="priority-badge ${getPriorityClass(task.priority)}"
                                >
                                    ${task.priority}
                                </span>

                            </div>


                            <p class="work-description">
                                ${escapeHtml(task.description || "No description provided.")}
                            </p>


                            <div class="work-meta">

                                <div>

                                    <span>
                                        Assigned to
                                    </span>

                                    <strong>
                                        ${employee ? escapeHtml(employee.name) : "Unknown"}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Client
                                    </span>

                                    <strong>
                                        ${client ? escapeHtml(client.name) : "Unknown"}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Deadline
                                    </span>

                                    <strong>
                                        ${formatDate(task.dueDate)}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Status
                                    </span>

                                    <strong>
                                        ${escapeHtml(task.status)}
                                    </strong>

                                </div>

                            </div>


                            <div class="progress-area">

                                <div class="progress-header">

                                    <span>
                                        Progress
                                    </span>

                                    <strong>
                                        ${task.progress}%
                                    </strong>

                                </div>

                                <div class="progress-track">

                                    <div
                                        class="progress-fill"
                                        style="width:${task.progress}%"
                                    ></div>

                                </div>

                            </div>


                            ${
                                latestUpdate
                                    ? `
                                    <div class="latest-update">

                                        <span>
                                            Latest employee update
                                        </span>

                                        <p>
                                            ${escapeHtml(latestUpdate.note || "No note provided.")}
                                        </p>

                                        <small>
                                            ${formatDateTime(latestUpdate.date)}
                                        </small>

                                    </div>
                                    `
                                    : `
                                    <div class="no-update">
                                        Employee has not submitted an update yet.
                                    </div>
                                    `
                            }

                        </div>

                    `;

                }
            ).join("");

    }


    /*
     * =========================================================
     * EMPLOYEE TASK LIST
     * =========================================================
     */

    function renderEmployeeTasks() {

        const container =
            document.getElementById(
                "employeeTaskList"
            );


        if (!container) {

            return;
        }


        const storedUser =
            localStorage.getItem(
                "caOfficeUser"
            );


        let employeeId =
            "EMP001";


        if (storedUser) {

            try {

                const user =
                    JSON.parse(
                        storedUser
                    );


                /*
                 * Temporary mapping for demo.
                 */

                if (
                    user.email ===
                    "employee@caoffice.com"
                ) {

                    employeeId =
                        "EMP001";
                }

            } catch (error) {

                console.error(error);

            }

        }


        const tasks =
            getTasks().filter(
                task =>
                    task.employeeId ===
                    employeeId
            );


        if (tasks.length === 0) {

            container.innerHTML = `

                <div class="empty-state">

                    <strong>
                        No assigned work
                    </strong>

                    <span>
                        Your assigned tasks will appear here.
                    </span>

                </div>

            `;

            return;
        }


        container.innerHTML =
            tasks.map(
                task =>
                    createEmployeeTaskCard(
                        task
                    )
            ).join("");


        attachEmployeeTaskEvents();

    }


    /*
     * =========================================================
     * EMPLOYEE TASK CARD
     * =========================================================
     */

    function createEmployeeTaskCard(task) {

        const client =
            getClient(
                task.clientId
            );


        return `

            <div
                class="work-card employee-work-card"
                data-task-id="${task.id}"
            >

                <div class="work-card-top">

                    <div>

                        <span class="work-id">
                            ${task.id}
                        </span>

                        <h3>
                            ${escapeHtml(task.title)}
                        </h3>

                    </div>


                    <span
                        class="priority-badge ${getPriorityClass(task.priority)}"
                    >
                        ${task.priority}
                    </span>

                </div>


                <p class="work-description">
                    ${escapeHtml(task.description || "No description provided.")}
                </p>


                <div class="work-meta">

                    <div>

                        <span>
                            Client
                        </span>

                        <strong>
                            ${client ? escapeHtml(client.name) : "Unknown"}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Deadline
                        </span>

                        <strong>
                            ${formatDate(task.dueDate)}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Status
                        </span>

                        <strong>
                            ${escapeHtml(task.status)}
                        </strong>

                    </div>

                </div>


                <div class="progress-area">

                    <div class="progress-header">

                        <span>
                            Current progress
                        </span>

                        <strong>
                            ${task.progress}%
                        </strong>

                    </div>


                    <div class="progress-track">

                        <div
                            class="progress-fill"
                            style="width:${task.progress}%"
                        ></div>

                    </div>

                </div>


                <div class="task-update-box">

                    <label>
                        Update status
                    </label>


                    <select
                        class="employee-status"
                        data-task-id="${task.id}"
                    >

                        <option
                            value="Assigned"
                            ${task.status === "Assigned" ? "selected" : ""}
                        >
                            Assigned
                        </option>

                        <option
                            value="In Progress"
                            ${task.status === "In Progress" ? "selected" : ""}
                        >
                            In Progress
                        </option>

                        <option
                            value="Under Review"
                            ${task.status === "Under Review" ? "selected" : ""}
                        >
                            Under Review
                        </option>

                        <option
                            value="Completed"
                            ${task.status === "Completed" ? "selected" : ""}
                        >
                            Completed
                        </option>

                        <option
                            value="Need Clarification"
                            ${task.status === "Need Clarification" ? "selected" : ""}
                        >
                            Need Clarification
                        </option>

                    </select>


                    <label>
                        Progress
                    </label>


                    <input
                        type="range"
                        min="0"
                        max="100"
                        value="${task.progress}"
                        class="employee-progress"
                        data-task-id="${task.id}"
                    >


                    <div class="progress-number">
                        <span>
                            Completion
                        </span>

                        <strong
                            id="progressValue-${task.id}"
                        >
                            ${task.progress}%
                        </strong>
                    </div>


                    <label>
                        Progress update
                    </label>


                    <textarea
                        class="employee-note"
                        data-task-id="${task.id}"
                        rows="3"
                        placeholder="Tell the admin what you've completed, what is pending, or if you need clarification..."
                    ></textarea>


                    <button
                        type="button"
                        class="update-task-button"
                        data-task-id="${task.id}"
                    >
                        Submit update
                    </button>


                    <div
                        class="task-update-message"
                        id="updateMessage-${task.id}"
                    ></div>

                </div>

            </div>

        `;

    }


    /*
     * =========================================================
     * EMPLOYEE UPDATE EVENTS
     * =========================================================
     */

    function attachEmployeeTaskEvents() {

        const progressInputs =
            document.querySelectorAll(
                ".employee-progress"
            );


        progressInputs.forEach(
            input => {

                input.addEventListener(
                    "input",
                    () => {

                        const taskId =
                            input.dataset.taskId;


                        const output =
                            document.getElementById(
                                `progressValue-${taskId}`
                            );


                        if (output) {

                            output.textContent =
                                `${input.value}%`;

                        }

                    }
                );

            }
        );


        const updateButtons =
            document.querySelectorAll(
                ".update-task-button"
            );


        updateButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        submitEmployeeUpdate(
                            button.dataset.taskId
                        );

                    }
                );

            }
        );

    }


    /*
     * =========================================================
     * SUBMIT EMPLOYEE UPDATE
     * =========================================================
     */

    function submitEmployeeUpdate(taskId) {

        const tasks =
            getTasks();


        const task =
            tasks.find(
                item =>
                    item.id === taskId
            );


        if (!task) {

            return;
        }


        const statusElement =
            document.querySelector(
                `.employee-status[data-task-id="${taskId}"]`
            );


        const progressElement =
            document.querySelector(
                `.employee-progress[data-task-id="${taskId}"]`
            );


        const noteElement =
            document.querySelector(
                `.employee-note[data-task-id="${taskId}"]`
            );


        if (
            !statusElement ||
            !progressElement ||
            !noteElement
        ) {

            return;
        }


        const status =
            statusElement.value;


        const progress =
            Number(
                progressElement.value
            );


        const note =
            noteElement.value.trim();


        if (!note) {

            showUpdateMessage(
                taskId,
                "Please enter a progress update.",
                true
            );

            return;
        }


        task.status =
            status;


        task.progress =
            progress;


        if (!task.updates) {

            task.updates = [];

        }


        task.updates.push({

            employeeId:
                task.employeeId,

            status:
                status,

            progress:
                progress,

            note:
                note,

            date:
                new Date().toISOString()

        });


        saveTasks(tasks);


        showUpdateMessage(
            taskId,
            "Update submitted successfully.",
            false
        );


        noteElement.value = "";


        setTimeout(
            () => {

                renderEmployeeTasks();

            },
            700
        );

    }


    /*
     * =========================================================
     * MESSAGE
     * =========================================================
     */

    function showUpdateMessage(
        taskId,
        message,
        isError
    ) {

        const element =
            document.getElementById(
                `updateMessage-${taskId}`
            );


        if (!element) {

            return;
        }


        element.textContent =
            message;


        element.className =
            isError
                ? "task-update-message error"
                : "task-update-message success";

    }


    /*
     * =========================================================
     * ADMIN MESSAGE
     * =========================================================
     */

    function showTaskMessage(
        message
    ) {

        const element =
            document.getElementById(
                "taskSuccessMessage"
            );


        if (!element) {

            return;
        }


        element.textContent =
            message;


        element.style.display =
            "block";


        setTimeout(
            () => {

                element.style.display =
                    "none";

            },
            3000
        );

    }


    /*
     * =========================================================
     * FORM ERROR
     * =========================================================
     */

    function showTaskError(
        elementId,
        message
    ) {

        const element =
            document.getElementById(
                elementId
            );


        if (element) {

            element.textContent =
                message;

        }

    }


    function clearTaskFormErrors() {

        document
            .querySelectorAll(
                ".task-field-error"
            )
            .forEach(
                element => {

                    element.textContent =
                        "";

                }
            );

    }


    

    function getPriorityClass(
        priority
    ) {

        return priority
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );

    }


    function formatDate(
        date
    ) {

        if (!date) {

            return "-";

        }


        const parsed =
            new Date(
                `${date}T00:00:00`
            );


        return parsed.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    }


    function formatDateTime(
        date
    ) {

        if (!date) {

            return "-";

        }


        const parsed =
            new Date(date);


        return parsed.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }

    function escapeHtml(
        value
    ) {

        const div =
            document.createElement(
                "div"
            );


        div.textContent =
            value;


        return div.innerHTML;

    }

});