(() => {

    'use strict';

    const form =
        document.getElementById('taskForm');

    const taskNameInput =
        document.getElementById('taskName');

    const workTypeSelect =
        document.getElementById('workType');

    const clientSelect =
        document.getElementById('taskClient');

    const assignedEmployeeSelect =
        document.getElementById('assignedEmployee');

    const assignedDateInput =
        document.getElementById('assignedDate');

    const completionDateInput =
        document.getElementById('completionDate');

    const billableSelect =
        document.getElementById('billable');

    const statusSelect =
        document.getElementById('taskStatus');

    const saveButton =
        document.getElementById('saveTaskButton');

    const searchInput =
        document.getElementById('taskSearch');

    const statusFilter =
        document.getElementById('taskStatusFilter');

    const workTypeFilter =
        document.getElementById('taskWorkTypeFilter');

    const billableFilter =
        document.getElementById('taskBillableFilter');

    const dateFromFilter =
        document.getElementById('taskDateFrom');

    const dateToFilter =
        document.getElementById('taskDateTo');

    const monthFilter =
        document.getElementById('taskMonthFilter');

    const tableBody =
        document.getElementById('tasksTableBody');

    const totalCount =
        document.getElementById('taskTotal');

    const visibleCount =
        document.getElementById('taskVisible');

    const errorBox =
        document.getElementById('taskError');

    const successBox =
        document.getElementById('taskSuccess');

    const resetFiltersButton =
        document.getElementById('resetTaskFilters');

    const cancelEditButton =
        document.getElementById('cancelTaskEdit');

    let tasks = [];
    let clients = [];
    let employees = [];
    let editingTaskId = null;


    function clean(value) {
        return String(value ?? '').trim();
    }


    function escapeHtml(value) {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    function formatDate(value) {

        if (!value) {
            return '—';
        }

        const date =
            new Date(`${value}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString('en-IN');
    }


    function todayString() {

        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('-');
    }


    function currentMonthString() {

        const now = new Date();

        return `${now.getFullYear()}-${String(
            now.getMonth() + 1
        ).padStart(2, '0')}`;
    }


    function daysFromAssignment(
        assignedDate,
        completionDate,
        status
    ) {

        if (!assignedDate) {
            return 0;
        }

        const start =
            new Date(`${assignedDate}T00:00:00`);

        const end =
            status === 'completed' &&
            completionDate
                ? new Date(`${completionDate}T00:00:00`)
                : new Date();

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())
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
                (24 * 60 * 60 * 1000)
            )
        );
    }


    function showError(message) {

        if (!errorBox) return;

        errorBox.textContent = message;
        errorBox.style.display = 'block';

        if (successBox) {
            successBox.style.display = 'none';
        }
    }


    function showSuccess(message) {

        if (!successBox) return;

        successBox.textContent = message;
        successBox.style.display = 'block';

        if (errorBox) {
            errorBox.style.display = 'none';
        }
    }


    function hideMessages() {

        if (errorBox) {
            errorBox.style.display = 'none';
        }

        if (successBox) {
            successBox.style.display = 'none';
        }
    }


    function setDefaultAssignedDate() {

        if (
            assignedDateInput &&
            !assignedDateInput.value
        ) {
            assignedDateInput.value =
                todayString();
        }
    }


    function setDefaultCurrentMonth() {

        if (monthFilter) {
            monthFilter.value =
                currentMonthString();
        }
    }


    function populateClients() {

        if (!clientSelect) return;

        clientSelect.innerHTML = `
            <option value="">
                Select client
            </option>
        `;

        clients.forEach(client => {

            const option =
                document.createElement('option');

            option.value =
                client.id;

            option.textContent =
                client.pan
                    ? `${client.name} — ${client.pan}`
                    : client.name;

            clientSelect.appendChild(option);
        });
    }


    function populateEmployees() {

        if (!assignedEmployeeSelect) {
            return;
        }

        assignedEmployeeSelect.innerHTML = `
            <option value="">
                Select employee
            </option>
        `;

        employees.forEach(employee => {

            const option =
                document.createElement('option');

            option.value =
                employee.id;

            option.textContent =
                employee.name;

            assignedEmployeeSelect.appendChild(option);
        });
    }


    function updateClientRequirement() {

        if (!workTypeSelect || !clientSelect) {
            return;
        }

        const isMisc =
            workTypeSelect.value === 'miscellaneous';

        clientSelect.disabled = isMisc;

        if (isMisc) {
            clientSelect.value = '';
        }

        const label =
            document.getElementById('taskClientLabel');

        if (label) {
            label.innerHTML =
                isMisc
                    ? 'Name of Client'
                    : 'Name of Client <span class="required">*</span>';
        }

        const help =
            document.getElementById('taskClientHelp');

        if (help) {
            help.textContent =
                isMisc
                    ? 'Client is automatically left empty for Miscellaneous work.'
                    : 'Select the client this work is assigned to.';
        }
    }


    function updateCompletionRequirement() {

        if (!completionDateInput) {
            return;
        }

        /*
         * Date of Completion is an EDIT-ONLY field.
         * It must never appear while creating a new task.
         */
        const editing =
            Boolean(editingTaskId);

        const group =
            completionDateInput.closest('.form-group');

        if (group) {
            group.style.display =
                editing ? '' : 'none';
        }

        completionDateInput.disabled =
            !editing;

        completionDateInput.required =
            false;

        const help =
            document.getElementById('completionDateHelp');

        if (help) {
            help.textContent =
                editing
                    ? 'Optional. Enter the actual completion date when available.'
                    : 'Available only while editing a task.';
        }
    }

    function getFilteredTasks() {

        const search =
            clean(searchInput?.value).toLowerCase();

        const status =
            clean(statusFilter?.value).toLowerCase();

        const workType =
            clean(workTypeFilter?.value).toLowerCase();

        const billable =
            clean(billableFilter?.value).toLowerCase();

        const from =
            clean(dateFromFilter?.value);

        const to =
            clean(dateToFilter?.value);

        const month =
            clean(monthFilter?.value);

        return tasks.filter(task => {

            if (
                search &&
                ![
                    task.taskName,
                    task.clientName,
                    task.clientPan,
                    task.assignedByName,
                    task.workType
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(search)
            ) {
                return false;
            }

            if (
                status &&
                task.status !== status
            ) {
                return false;
            }

            if (
                workType &&
                task.workType !== workType
            ) {
                return false;
            }

            if (
                billable &&
                String(Boolean(task.billable)) !== billable
            ) {
                return false;
            }

            /*
             * The explicit date range takes priority over the monthly
             * default. This lets users search previous months without
             * having to manually clear the month field first.
             */
            if (
                !from &&
                !to &&
                month &&
                !task.assignedDate.startsWith(month)
            ) {
                return false;
            }

            if (
                from &&
                task.assignedDate < from
            ) {
                return false;
            }

            if (
                to &&
                task.assignedDate > to
            ) {
                return false;
            }

            return true;
        });
    }


    function statusLabel(status) {

        if (status === 'completed') {
            return 'Complete';
        }

        return 'W.I.P';
    }


    function renderTasks() {

        const rows =
            getFilteredTasks();

        if (totalCount) {
            totalCount.textContent =
                tasks.length;
        }

        if (visibleCount) {
            visibleCount.textContent =
                rows.length;
        }

        if (!tableBody) {
            return;
        }

        if (!rows.length) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="11"
                        class="tasks-empty-cell"
                    >
                        No task records found for the selected filters.
                    </td>
                </tr>
            `;

            return;
        }

        tableBody.innerHTML =
            rows.map(task => {

                const status =
                    statusLabel(task.status);

                const billing =
                    task.billable
                        ? 'Billable'
                        : 'Non-billable';

                const assignedEmployee =
                    task.assignedEmployeeName
                        ? task.assignedEmployeeName
                        : '—';

                const client =
                    task.clientName
                        ? task.clientName
                        : '—';

                const assignedBy =
                    task.assignedByName
                        ? task.assignedByName
                        : '—';

                const assignedDate =
                    formatDate(task.assignedDate);

                const completionDate =
                    formatDate(task.completionDate);

                const numberOfDays =
                    Number(task.numberOfDays) || 0;

                const dayLabel =
                    numberOfDays === 1
                        ? 'day'
                        : 'days';

                /*
                 * IMPORTANT:
                 * These 11 TDs MUST stay in exactly the same
                 * order as the 11 TH elements in tasks.html.
                 */
                return `
                    <tr data-task-id="${escapeHtml(task.id)}">

                        <!-- 1. Task / Work -->
                        <td data-column="task">
                            <strong>
                                ${escapeHtml(task.taskName)}
                            </strong>
                        </td>

                        <!-- 2. Work Type -->
                        <td data-column="work-type">
                            <span class="work-type-badge work-${escapeHtml(task.workType)}">
                                ${
                                    task.workType === 'miscellaneous'
                                        ? 'Miscellaneous'
                                        : 'Office Work'
                                }
                            </span>
                        </td>

                        <!-- 3. Client -->
                        <td data-column="client">
                            ${escapeHtml(client)}
                        </td>

                        <!-- 4. Assigned Employee -->
                        <td data-column="assigned-employee">
                            ${escapeHtml(assignedEmployee)}
                        </td>

                        <!-- 5. Date of Assigning -->
                        <td data-column="assigned-date">
                            ${escapeHtml(assignedDate)}
                        </td>

                        <!-- 6. Date of Completion -->
                        <td data-column="completion-date">
                            <input
                                type="date"
                                class="inline-completion-date"
                                data-task-id="${escapeHtml(task.id)}"
                                value="${escapeHtml(task.completionDate || '')}"
                                title="Edit date of completion"
                                aria-label="Date of Completion"
                            >
                        </td>

                        <!-- 7. Billing -->
                        <td data-column="billing">
                            ${escapeHtml(billing)}
                        </td>

                        <!-- 8. No. of Days -->
                        <td data-column="days">
                            <span class="task-days">
                                <strong>
                                    ${escapeHtml(numberOfDays)}
                                </strong>
                                <span>
                                    ${dayLabel}
                                </span>
                            </span>
                        </td>

                        <!-- 9. Status -->
                        <td data-column="status">
                            <span class="status-badge status-${escapeHtml(task.status)}">
                                ${escapeHtml(status)}
                            </span>
                        </td>

                        <!-- 10. Assigned By -->
                        <td data-column="assigned-by">
                            ${escapeHtml(assignedBy)}
                        </td>

                        <!-- 11. Action -->
                        <td data-column="action">
                            <button
                                type="button"
                                class="task-edit-button"
                                data-task-id="${escapeHtml(task.id)}"
                            >
                                Edit
                            </button>
                        </td>

                    </tr>
                `;

            }).join('');
    }


    async function saveInlineCompletionDate(input) {

        const taskId =
            clean(input?.dataset?.taskId);

        if (!taskId) {
            return;
        }

        const task =
            tasks.find(
                item => String(item.id) === String(taskId)
            );

        if (!task) {
            return;
        }

        const completionDate =
            clean(input.value);

        /*
         * Empty is valid: clearing the date removes the completion date.
         */
        if (
            completionDate &&
            task.assignedDate &&
            completionDate < task.assignedDate
        ) {
            showError(
                'Date of completion cannot be earlier than date of assigning.'
            );

            input.value =
                task.completionDate || '';

            return;
        }

        const originalValue =
            task.completionDate || '';

        input.disabled = true;
        input.classList.add('is-saving');

        try {

            const data = {
                taskName:
                    clean(task.taskName),

                workType:
                    clean(task.workType),

                clientId:
                    clean(task.clientId || ''),

                assignedEmployeeId:
                    clean(task.assignedEmployeeId || ''),

                assignedDate:
                    clean(task.assignedDate),

                completionDate:
                    completionDate,

                billable:
                    Boolean(task.billable),

                status:
                    clean(task.status)
            };

            const response =
                await fetch(
                    `/api/tasks/${encodeURIComponent(taskId)}`,
                    {
                        method: 'PATCH',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type':
                                'application/json',
                            'Accept':
                                'application/json'
                        },
                        body:
                            JSON.stringify(data)
                    }
                );

            const result =
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    'Unable to update date of completion.'
                );
            }

            /*
             * Replace the local task with the server response so
             * No. of Days and all live calculations immediately use
             * the new completion date.
             */
            if (result.task) {

                const index =
                    tasks.findIndex(
                        item =>
                            String(item.id) ===
                            String(taskId)
                    );

                if (index !== -1) {
                    tasks[index] =
                        result.task;
                }
            } else {
                task.completionDate =
                    completionDate;
            }

            renderTasks();

            showSuccess(
                completionDate
                    ? 'Date of completion updated.'
                    : 'Date of completion cleared.'
            );

        } catch (error) {

            console.error(
                'Inline completion date error:',
                error
            );

            input.value =
                originalValue;

            showError(
                error.message ||
                'Unable to update date of completion.'
            );

        } finally {

            input.disabled = false;
            input.classList.remove('is-saving');
        }
    }


    async function loadClients() {

        try {

            const response =
                await fetch(
                    '/api/tasks/clients',
                    {
                        credentials: 'same-origin'
                    }
                );

            const result =
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    'Unable to load clients.'
                );
            }

            clients =
                Array.isArray(result.clients)
                    ? result.clients
                    : [];

            populateClients();

        } catch (error) {

            console.error(
                'Task clients error:',
                error
            );

            showError(
                error.message ||
                'Unable to load clients.'
            );
        }
    }


    async function loadEmployees() {

        try {

            const response =
                await fetch(
                    '/api/tasks/employees',
                    {
                        credentials: 'same-origin'
                    }
                );

            const result =
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    'Unable to load employees.'
                );
            }

            employees =
                Array.isArray(result.employees)
                    ? result.employees
                    : [];

            populateEmployees();

        } catch (error) {

            console.error(
                'Task employees error:',
                error
            );

            showError(
                error.message ||
                'Unable to load employees.'
            );
        }
    }


    async function loadTasks() {

        try {

            const response =
                await fetch(
                    '/api/tasks',
                    {
                        credentials: 'same-origin'
                    }
                );

            const result =
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    'Unable to load tasks.'
                );
            }

            tasks =
                Array.isArray(result.tasks)
                    ? result.tasks
                    : [];

            renderTasks();

        } catch (error) {

            console.error(
                'Load tasks error:',
                error
            );

            showError(
                error.message ||
                'Unable to load tasks.'
            );
        }
    }


    function resetForm() {

        editingTaskId = null;

        form?.reset();

        if (statusSelect) {
            statusSelect.value = 'wip';
        }

        setDefaultAssignedDate();

        if (cancelEditButton) {
            cancelEditButton.style.display =
                'none';
        }

        if (saveButton) {
            saveButton.textContent =
                'Save Task';
        }

        updateClientRequirement();
        updateCompletionRequirement();
    }


    function fillEditForm(task) {

        editingTaskId =
            task.id;

        taskNameInput.value =
            task.taskName;

        workTypeSelect.value =
            task.workType;

        clientSelect.value =
            task.clientId || '';

        assignedEmployeeSelect.value =
            task.assignedEmployeeId || '';

        assignedDateInput.value =
            task.assignedDate || '';

        completionDateInput.value =
            task.completionDate || '';

        billableSelect.value =
            task.billable
                ? 'billable'
                : 'non_billable';

        statusSelect.value =
            task.status || 'incomplete';

        updateClientRequirement();
        updateCompletionRequirement();

        if (cancelEditButton) {
            cancelEditButton.style.display =
                'inline-flex';
        }

        if (saveButton) {
            saveButton.textContent =
                'Update Task';
        }

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }


    async function saveTask(event) {

        event.preventDefault();

        hideMessages();

        const data = {

            taskName:
                clean(taskNameInput?.value),

            workType:
                clean(workTypeSelect?.value),

            clientId:
                clean(clientSelect?.value),

            assignedEmployeeId:
                clean(assignedEmployeeSelect?.value),

            assignedDate:
                clean(assignedDateInput?.value),

            completionDate:
                clean(completionDateInput?.value),

            billable:
                billableSelect?.value === 'billable',

            status:
                clean(statusSelect?.value)
        };

        if (!data.taskName) {
            showError(
                'Please enter the task / work description.'
            );
            return;
        }

        if (!data.workType) {
            showError(
                'Please select Office Work or Miscellaneous.'
            );
            return;
        }

        if (
            !data.assignedEmployeeId
        ) {
            showError(
                'Please select the employee assigned to this task.'
            );
            return;
        }

        if (
            data.workType === 'office' &&
            !data.clientId
        ) {
            showError(
                'Please select a client for Office Work.'
            );
            return;
        }

        if (!['wip', 'completed'].includes(data.status)) {
            showError(
                'Please select W.I.P or Complete.'
            );
            return;
        }

        if (!data.assignedDate) {
            showError(
                'Please select the date of assigning.'
            );
            return;
        }

        if (
            data.completionDate &&
            data.completionDate < data.assignedDate
        ) {
            showError(
                'Date of completion cannot be earlier than date of assigning.'
            );
            return;
        }

        /*
         * Status is only W.I.P or Complete.
         * Completion date is optional and is available from Edit Task.
         */

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent =
                editingTaskId
                    ? 'Updating...'
                    : 'Saving...';
        }

        try {

            const url =
                editingTaskId
                    ? `/api/tasks/${encodeURIComponent(editingTaskId)}`
                    : '/api/tasks';

            const response =
                await fetch(
                    url,
                    {
                        method:
                            editingTaskId
                                ? 'PATCH'
                                : 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type':
                                'application/json',
                            'Accept':
                                'application/json'
                        },
                        body:
                            JSON.stringify(data)
                    }
                );

            const result =
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    'Unable to save task.'
                );
            }

            showSuccess(
                editingTaskId
                    ? 'Task updated successfully.'
                    : 'Task created successfully.'
            );

            resetForm();

            await loadTasks();

        } catch (error) {

            console.error(
                'Save task error:',
                error
            );

            showError(
                error.message ||
                'Unable to save task.'
            );

        } finally {

            if (saveButton) {
                saveButton.disabled = false;

                saveButton.textContent =
                    editingTaskId
                        ? 'Update Task'
                        : 'Save Task';
            }
        }
    }


    function exportRows() {

        return getFilteredTasks()
            .map(task => ({
                'Task / Work':
                    task.taskName,

                'Work Type':
                    task.workType === 'miscellaneous'
                        ? 'Miscellaneous'
                        : 'Office Work',

                'Client':
                    task.clientName || '',

                'Assigned Employee':
                    task.assignedEmployeeName || '',

                'Date of Assigning':
                    formatDate(task.assignedDate),

                'Date of Completion':
                    formatDate(task.completionDate),

                'Billable':
                    task.billable
                        ? 'Billable'
                        : 'Non-billable',

                'No. of Days':
                    task.numberOfDays,

                'Status':
                    statusLabel(task.status),

                'Assigned By':
                    task.assignedByName
            }));
    }


    function exportExcel() {

        const rows =
            exportRows();

        if (!rows.length) {
            showError(
                'There are no tasks to export for the current filters.'
            );
            return;
        }

        if (!window.XLSX) {
            showError(
                'Excel export library is not available.'
            );
            return;
        }

        const worksheet =
            XLSX.utils.json_to_sheet(rows);

        worksheet['!cols'] = [
            { wch: 30 },
            { wch: 18 },
            { wch: 28 },
            { wch: 20 },
            { wch: 20 },
            { wch: 16 },
            { wch: 14 },
            { wch: 16 },
            { wch: 24 }
        ];

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            'Tasks'
        );

        XLSX.writeFile(
            workbook,
            `tasks-${todayString()}.xlsx`
        );

        showSuccess(
            `${rows.length} task(s) exported to Excel.`
        );
    }


    function exportPdf() {

        const rows =
            exportRows();

        if (!rows.length) {
            showError(
                'There are no tasks to export for the current filters.'
            );
            return;
        }

        const JsPDF =
            window.jspdf?.jsPDF;

        if (!JsPDF) {
            showError(
                'PDF export library is not available.'
            );
            return;
        }

        const pdf =
            new JsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

        pdf.setFontSize(16);
        pdf.text(
            'CA Office - Task Register',
            10,
            14
        );

        pdf.setFontSize(8);
        pdf.text(
            `Generated: ${new Date().toLocaleString('en-IN')}`,
            10,
            20
        );

        const body =
            rows.map(row => [
                row['Task / Work'],
                row['Work Type'],
                row['Client'],
                row['Assigned Employee'],
                row['Date of Assigning'],
                row['Date of Completion'],
                row['Billable'],
                row['No. of Days'],
                row['Status'],
                row['Assigned By']
            ]);

        pdf.autoTable({
            startY: 25,
            head: [[
                'Task / Work',
                'Work Type',
                'Client',
                'Assigned Employee',
                'Assigned',
                'Completed',
                'Billable',
                'Days',
                'Status',
                'Assigned By'
            ]],
            body,
            styles: {
                fontSize: 7,
                cellPadding: 2,
                overflow: 'linebreak'
            },
            headStyles: {
                fontSize: 7
            },
            margin: {
                left: 7,
                right: 7
            }
        });

        pdf.save(
            `tasks-${todayString()}.pdf`
        );

        showSuccess(
            `${rows.length} task(s) exported to PDF.`
        );
    }


    function resetFilters() {

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (workTypeFilter) workTypeFilter.value = '';
        if (billableFilter) billableFilter.value = '';
        if (dateFromFilter) dateFromFilter.value = '';
        if (dateToFilter) dateToFilter.value = '';

        setDefaultCurrentMonth();

        renderTasks();
    }


    workTypeSelect?.addEventListener(
        'change',
        updateClientRequirement
    );

    statusSelect?.addEventListener(
        'change',
        updateCompletionRequirement
    );

    form?.addEventListener(
        'submit',
        saveTask
    );

    cancelEditButton?.addEventListener(
        'click',
        () => {
            resetForm();
            hideMessages();
        }
    );

    [
        searchInput,
        statusFilter,
        workTypeFilter,
        billableFilter,
        dateFromFilter,
        dateToFilter,
        monthFilter
    ].forEach(element => {

        element?.addEventListener(
            'input',
            () => {

                if (
                    (
                        element === dateFromFilter ||
                        element === dateToFilter
                    ) &&
                    (element.value)
                ) {
                    if (monthFilter) {
                        monthFilter.value = '';
                    }
                }

                renderTasks();
            }
        );

        element?.addEventListener(
            'change',
            () => {

                if (
                    (
                        element === dateFromFilter ||
                        element === dateToFilter
                    ) &&
                    (element.value)
                ) {
                    if (monthFilter) {
                        monthFilter.value = '';
                    }
                }

                renderTasks();
            }
        );
    });


    resetFiltersButton?.addEventListener(
        'click',
        resetFilters
    );


    tableBody?.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    '.task-edit-button'
                );

            if (!button) {
                return;
            }

            const id =
                button.dataset.taskId;

            const task =
                tasks.find(
                    item => item.id === id
                );

            if (task) {
                fillEditForm(task);
            }
        }
    );


    tableBody?.addEventListener(
        'change',
        event => {

            const input =
                event.target.closest(
                    '.inline-completion-date'
                );

            if (!input) {
                return;
            }

            saveInlineCompletionDate(input);
        }
    );


    document.getElementById('exportExcelButton')
        ?.addEventListener(
            'click',
            exportExcel
        );

    document.getElementById('exportPdfButton')
        ?.addEventListener(
            'click',
            exportPdf
        );


    setDefaultAssignedDate();
    setDefaultCurrentMonth();
    updateClientRequirement();
    updateCompletionRequirement();

    loadClients();
    loadEmployees();
    loadTasks();

    /*
     * Refresh live day counts every minute without changing data.
     * The calculation is based on complete 24-hour periods.
     */
    setInterval(
        renderTasks,
        60 * 1000
    );

})();
