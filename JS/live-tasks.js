(() => {
    "use strict";

    /*
    =========================================================
    LIVE TASK REGISTER

    Uses the existing /api/tasks endpoint.

    IMPORTANT:
    - The real database table is office_tasks.
    - /api/tasks already reads office_tasks.
    - ALL tasks assigned to employees are displayed.
    - Completed tasks remain visible with "Complete".
    - W.I.P tasks remain visible with "W.I.P".
    - The count therefore reflects the actual assigned-task
      records in office_tasks.
    - Refreshes automatically every 5 seconds.
    =========================================================
    */

    let liveTasks = [];
    let loading = false;

    const REFRESH_INTERVAL = 5000;

    function get(id) {
        return document.getElementById(id);
    }

    const countElement =
        get("liveTasksCount");

    const emptyElement =
        get("liveTasksEmpty");

    const tableBody =
        get("liveTasksTableBody");

    /*
     * Do nothing on pages that do not contain the
     * Live Task Register.
     */
    if (!countElement || !tableBody) {
        return;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[character])
        );
    }

    function clean(value) {
        return String(value ?? "").trim();
    }

    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date =
            new Date(
                `${value}T00:00:00`
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return value;
        }

        return date.toLocaleDateString(
            "en-IN"
        );
    }

    function calculateDays(
        assignedDate,
        completionDate
    ) {

        if (!assignedDate) {
            return 0;
        }

        const start =
            new Date(
                `${assignedDate}T00:00:00`
            );

        const end =
            completionDate
                ? new Date(
                    `${completionDate}T00:00:00`
                )
                : new Date();

        if (
            Number.isNaN(
                start.getTime()
            ) ||
            Number.isNaN(
                end.getTime()
            )
        ) {
            return 0;
        }

        return Math.max(
            0,
            Math.floor(
                (
                    end.getTime() -
                    start.getTime()
                ) /
                86400000
            )
        );
    }

    function normalizeTask(task) {

        const completionDate =
            clean(
                task.completionDate ??
                task.completion_date
            );

        return {

            id:
                task.id || "",

            taskName:
                task.taskName ??
                task.task_name ??
                "",

            workType:
                clean(
                    task.workType ??
                    task.work_type
                ),

            clientId:
                task.clientId ??
                task.client_id ??
                "",

            clientName:
                task.clientName ??
                task.client_name ??
                "",

            clientPan:
                task.clientPan ??
                task.client_pan ??
                "",

            assignedEmployeeId:
                task.assignedEmployeeId ??
                task.assigned_employee_id ??
                "",

            assignedEmployeeName:
                task.assignedEmployeeName ??
                task.assigned_employee_name ??
                "",

            assignedDate:
                task.assignedDate ??
                task.assigned_date ??
                "",

            completionDate,

            assignedByName:
                task.assignedByName ??
                task.assigned_by_name ??
                "",

            billable:
                Boolean(
                    task.billable
                ),

            numberOfDays:
                Number.isFinite(
                    Number(
                        task.numberOfDays
                    )
                )
                    ? Number(
                        task.numberOfDays
                    )
                    : calculateDays(
                        task.assignedDate ??
                            task.assigned_date,
                        completionDate
                    )
        };
    }

    function getStatus(task) {

        return clean(
            task.completionDate
        )
            ? "completed"
            : "wip";
    }

    function getStatusLabel(task) {

        return getStatus(task) ===
            "completed"
                ? "Complete"
                : "W.I.P";
    }

    function showLoading() {

        if (!emptyElement) {
            return;
        }

        emptyElement.style.display =
            "block";

        emptyElement.textContent =
            "Loading live tasks...";
    }

    function showEmpty(message) {

        if (!emptyElement) {
            return;
        }

        emptyElement.style.display =
            "block";

        emptyElement.textContent =
            message;
    }

    function hideEmpty() {

        if (!emptyElement) {
            return;
        }

        emptyElement.style.display =
            "none";
    }

    function renderLiveTasks() {

        const tasks =
            Array.isArray(
                liveTasks
            )
                ? liveTasks
                : [];

        /*
         * THIS IS THE LIVE COUNT.
         *
         * It is NOT based on a hard-coded value.
         * It is NOT based on the old "tasks" table.
         * It is based on office_tasks through /api/tasks.
         */

        countElement.textContent =
            String(
                tasks.length
            );

        tableBody.innerHTML =
            "";

        if (!tasks.length) {

            showEmpty(
                "No task records have been assigned to employees yet."
            );

            return;
        }

        hideEmpty();

        /*
         * Determine whether the HTML has a
         * Date of Completion column.
         */

        const headers =
            document.querySelectorAll(
                ".live-task-table thead th"
            );

        const hasCompletionColumn =
            headers.length >= 8;

        tasks.forEach(
            task => {

                const row =
                    document.createElement(
                        "tr"
                    );

                const status =
                    getStatus(task);

                const statusLabel =
                    getStatusLabel(task);

                const statusClass =
                    status ===
                    "completed"
                        ? "live-task-completed"
                        : "live-task-wip";

                const workType =
                    task.workType ===
                    "miscellaneous"
                        ? "Miscellaneous"
                        : "Office Work";

                const client =
                    task.clientName ||
                    "—";

                const employee =
                    task.assignedEmployeeName ||
                    "—";

                const days =
                    Number(
                        task.numberOfDays
                    ) ||
                    calculateDays(
                        task.assignedDate,
                        task.completionDate
                    );

                let cells = "";

                /*
                 * Task / Work
                 */

                cells += `
                    <td>
                        <strong>
                            ${escapeHtml(
                                task.taskName ||
                                "Untitled Task"
                            )}
                        </strong>
                    </td>
                `;

                /*
                 * Work Type
                 */

                cells += `
                    <td>
                        ${escapeHtml(
                            workType
                        )}
                    </td>
                `;

                /*
                 * Client
                 */

                cells += `
                    <td>
                        ${escapeHtml(
                            client
                        )}

                        ${
                            task.clientPan
                                ? `
                                    <div
                                        style="
                                            margin-top:3px;
                                            font-size:11px;
                                            color:#777;
                                        "
                                    >
                                        PAN:
                                        ${escapeHtml(
                                            task.clientPan
                                        )}
                                    </div>
                                  `
                                : ""
                        }
                    </td>
                `;

                /*
                 * Assigned Employee
                 */

                cells += `
                    <td>
                        <strong>
                            ${escapeHtml(
                                employee
                            )}
                        </strong>
                    </td>
                `;

                /*
                 * Date of Assigning
                 */

                cells += `
                    <td>
                        ${escapeHtml(
                            formatDate(
                                task.assignedDate
                            )
                        )}
                    </td>
                `;

                /*
                 * Optional Date of Completion.
                 *
                 * Your newer documents page has this column.
                 */

                if (
                    hasCompletionColumn
                ) {

                    cells += `
                        <td>
                            ${escapeHtml(
                                formatDate(
                                    task.completionDate
                                )
                            )}
                        </td>
                    `;
                }

                /*
                 * Number of Days
                 */

                cells += `
                    <td>
                        <strong>
                            ${escapeHtml(
                                days
                            )}
                        </strong>

                        <span
                            class="live-task-days"
                        >
                            ${
                                days === 1
                                    ? "day"
                                    : "days"
                            }
                        </span>
                    </td>
                `;

                /*
                 * Status
                 */

                cells += `
                    <td>
                        <span
                            class="
                                live-task-status
                                ${statusClass}
                            "
                        >
                            ${escapeHtml(
                                statusLabel
                            )}
                        </span>
                    </td>
                `;

                row.innerHTML =
                    cells;

                tableBody.appendChild(
                    row
                );
            }
        );
    }

    async function loadLiveTasks(
        silent = false
    ) {

        if (loading) {
            return;
        }

        loading = true;

        if (!silent) {
            showLoading();
        }

        try {

            /*
             * Existing backend endpoint.
             *
             * routes/tasks.js:
             * GET /api/tasks
             *
             * That endpoint reads office_tasks.
             */

            const response =
                await fetch(
                    "/api/tasks",
                    {
                        method:
                            "GET",

                        credentials:
                            "same-origin",

                        cache:
                            "no-store",

                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );

            let result;

            try {

                result =
                    await response.json();

            } catch {

                throw new Error(
                    `Server returned ${response.status}`
                );
            }

            if (
                !response.ok ||
                !result.success
            ) {

                throw new Error(
                    result.message ||
                    `Unable to load tasks (${response.status})`
                );
            }

            const allTasks =
                Array.isArray(
                    result.tasks
                )
                    ? result.tasks
                    : [];

            /*
             * The register is specifically for tasks
             * assigned to employees.
             *
             * Do NOT filter out completed tasks.
             *
             * This is important because your current
             * database contains 5 completed tasks.
             * The register should therefore show 5.
             */

            liveTasks =
                allTasks
                    .map(
                        normalizeTask
                    )
                    .filter(
                        task =>
                            Boolean(
                                clean(
                                    task.assignedEmployeeId
                                )
                            )
                    );

            renderLiveTasks();

        } catch (error) {

            console.error(
                "LIVE TASK REGISTER ERROR:",
                error
            );

            countElement.textContent =
                "0";

            tableBody.innerHTML =
                "";

            showEmpty(
                "Unable to load live task records. " +
                error.message
            );

        } finally {

            loading = false;
        }
    }

    /*
    =========================================================
    START
    =========================================================
    */

    function start() {

        loadLiveTasks();

        setInterval(
            () => {
                loadLiveTasks(true);
            },
            REFRESH_INTERVAL
        );
    }

    /*
     * The script is loaded at the bottom of the HTML,
     * but DOMContentLoaded is still safe.
     */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start
        );

    } else {

        start();
    }

    /*
     * Manual refresh available from console:
     *
     * loadLiveTasks()
     */

    window.loadLiveTasks =
        loadLiveTasks;

})();
