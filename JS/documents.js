(() => {
    "use strict";

    let documents = [];
    let filteredDocuments = [];

    const REFRESH_INTERVAL = 10000; // 10 seconds
    let refreshTimer = null;
    let isLoading = false;

    /* =========================================================
       HELPERS
    ========================================================= */

    function $(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char])
        );
    }

    async function api(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            cache: "no-store",
            ...options
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                `Server returned ${response.status}`
            );
        }

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message ||
                `Request failed (${response.status})`
            );
        }

        return data;
    }

    function showError(message) {
        console.error(message);

        const errorBox =
            $("documentError");

        if (!errorBox) return;

        errorBox.textContent =
            message || "Something went wrong.";

        errorBox.style.display =
            "block";
    }

    function hideError() {
        const errorBox =
            $("documentError");

        if (errorBox) {
            errorBox.style.display =
                "none";
        }
    }

    function showSuccess(message) {
        const box =
            $("documentSuccess");

        if (!box) return;

        box.textContent =
            message;

        box.style.display =
            "block";

        setTimeout(() => {
            box.style.display =
                "none";
        }, 2500);
    }

    /* =========================================================
       STATUS
    ========================================================= */

    function getStatus(documentRecord) {

        if (
            documentRecord.completionDate
        ) {
            return "COMPLETE";
        }

        return "W.I.P";
    }

    function getStatusClass(documentRecord) {

        if (
            documentRecord.completionDate
        ) {
            return "complete";
        }

        return "wip";
    }

    /* =========================================================
       DAYS
    ========================================================= */

    function calculateDays(
        receiptDate,
        completionDate
    ) {

        if (!receiptDate) {
            return "";
        }

        const start =
            new Date(
                receiptDate +
                "T00:00:00"
            );

        const end =
            completionDate
                ? new Date(
                    completionDate +
                    "T00:00:00"
                )
                : new Date();

        const difference =
            end.getTime() -
            start.getTime();

        return Math.max(
            0,
            Math.floor(
                difference /
                86400000
            )
        );
    }

    /* =========================================================
       NORMALIZE API DOCUMENT
    ========================================================= */

    function normalizeDocument(record) {
        const r = record || {};

        return {
            ...r,
            id: r.id ?? r.document_id ?? "",
            serialNumber: r.serialNumber ?? r.serial_no ?? "",
            serialLabel: r.serialLabel ?? r.serial_label ?? "",
            clientId: r.clientId ?? r.client_id ?? "",
            clientName: r.clientName ?? r.client_name ?? r.client ?? "",
            clientPan: r.clientPan ?? r.client_pan ?? r.pan ?? "",
            purpose: r.purpose ?? "",
            mode: String(r.mode ?? "").toLowerCase(),
            receiptDate: r.receiptDate ?? r.receipt_date ?? "",
            dispatchDate: r.dispatchDate ?? r.dispatch_date ?? "",
            completionDate: r.completionDate ?? r.completion_date ?? "",
            receivingStaff:
                r.receivingStaff ??
                r.receivingStaffName ??
                r.receiving_staff_name ??
                r.receiving_staff ??
                "",
            receivingStaffName:
                r.receivingStaffName ??
                r.receivingStaff ??
                r.receiving_staff_name ??
                r.receiving_staff ??
                "",
            deliveringStaff:
                r.deliveringStaff ??
                r.deliveringStaffName ??
                r.delivering_staff_name ??
                r.delivering_staff ??
                "",
            deliveringStaffName:
                r.deliveringStaffName ??
                r.deliveringStaff ??
                r.delivering_staff_name ??
                r.delivering_staff ??
                "",
            assignedEmployee:
                r.assignedEmployee ??
                r.assignedEmployeeName ??
                r.assigned_employee_name ??
                r.assigned_employee ??
                "",
            assignedEmployeeName:
                r.assignedEmployeeName ??
                r.assignedEmployee ??
                r.assigned_employee_name ??
                r.assigned_employee ??
                "",
            assignedEmployeeId:
                r.assignedEmployeeId ??
                r.assigned_employee_id ??
                "",
            status: r.status ?? ""
        };
    }

    /* =========================================================
       LOAD DOCUMENTS
    ========================================================= */

    async function loadDocuments(
        silent = false
    ) {

        if (isLoading) {
            return;
        }

        isLoading = true;

        try {

            const data =
                await api(
                    "/api/documents"
                );

            const incoming =
                Array.isArray(data.documents)
                    ? data.documents
                    : Array.isArray(data.data)
                        ? data.data
                        : Array.isArray(data.rows)
                            ? data.rows
                            : [];

            documents =
                incoming.map(normalizeDocument);

            applyFilters();

            if (!silent) {
                hideError();
            }

        } catch (error) {

            console.error(
                "Live Document Register load error:",
                error
            );

            if (!silent) {
                showError(
                    "Unable to load document records: " +
                    error.message
                );
            }

        } finally {

            isLoading = false;
        }
    }

    /* =========================================================
       FILTERS
    ========================================================= */

    function applyFilters() {

        const search =
            (
                $("documentSearch")?.value ||
                ""
            )
                .trim()
                .toLowerCase();

        const mode =
            $("documentModeFilter")
                ?.value ||
            "";

        const status =
            $("documentStatusFilter")
                ?.value ||
            "";

        const fromDate =
            $("receiptDateFromFilter")
                ?.value ||
            "";

        const toDate =
            $("receiptDateToFilter")
                ?.value ||
            "";

        filteredDocuments =
            documents.filter(
                documentRecord => {

                    /*
                     * SEARCH
                     */

                    if (search) {

                        const searchableText = [

                            documentRecord.serialLabel,

                            documentRecord.serialNumber,

                            documentRecord.clientName,

                            documentRecord.clientPan,

                            documentRecord.purpose,

                            documentRecord.mode,

                            documentRecord.receiptDate,

                            documentRecord.dispatchDate,

                            documentRecord.completionDate,

                            documentRecord.receivingStaffName,

                            documentRecord.deliveringStaffName,

                            documentRecord.assignedEmployeeName

                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();

                        if (
                            !searchableText.includes(
                                search
                            )
                        ) {
                            return false;
                        }
                    }

                    /*
                     * MODE
                     */

                    if (
                        mode &&
                        String(
                            documentRecord.mode ||
                            ""
                        ).toLowerCase() !==
                        mode.toLowerCase()
                    ) {
                        return false;
                    }

                    /*
                     * STATUS
                     */

                    if (status) {

                        const currentStatus =
                            getStatus(
                                documentRecord
                            ).toLowerCase();

                        const normalizedFilter =
                            status.toLowerCase();

                        if (
                            normalizedFilter === "wip" &&
                            currentStatus !== "w.i.p"
                        ) {
                            return false;
                        }

                        if (
                            normalizedFilter === "complete" &&
                            currentStatus !== "complete"
                        ) {
                            return false;
                        }

                        if (
                            normalizedFilter === "received" &&
                            !documentRecord.receiptDate
                        ) {
                            return false;
                        }

                        if (
                            normalizedFilter === "dispatched" &&
                            !documentRecord.dispatchDate
                        ) {
                            return false;
                        }
                    }

                    /*
                     * RECEIPT DATE FROM
                     */

                    if (
                        fromDate &&
                        (
                            !documentRecord.receiptDate ||
                            documentRecord.receiptDate <
                            fromDate
                        )
                    ) {
                        return false;
                    }

                    /*
                     * RECEIPT DATE TO
                     */

                    if (
                        toDate &&
                        (
                            !documentRecord.receiptDate ||
                            documentRecord.receiptDate >
                            toDate
                        )
                    ) {
                        return false;
                    }

                    return true;
                }
            );

        renderDocuments();
    }

    /* =========================================================
       RENDER LIVE DOCUMENT REGISTER
    ========================================================= */

    function renderDocuments() {

        const tableBody =
            $("documentsTableBody");

        if (!tableBody) {
            return;
        }

        tableBody.innerHTML = "";

        const totalElement =
            $("documentTotal");

        const visibleElement =
            $("documentVisible");

        if (totalElement) {
            totalElement.textContent = documents.length;
        }

        if (visibleElement) {
            visibleElement.textContent = filteredDocuments.length;
        }

        const emptyElement =
            $("documentsEmpty");

        if (filteredDocuments.length === 0) {
            if (emptyElement) {
                emptyElement.style.display = "block";
            }
            return;
        }

        if (emptyElement) {
            emptyElement.style.display = "none";
        }

        filteredDocuments.forEach(
            (documentRecord, index) => {

                const row =
                    document.createElement("tr");

                row.dataset.id =
                    documentRecord.id;

                const status =
                    getStatus(documentRecord);

                const statusClass =
                    getStatusClass(documentRecord);

                const serial =
                    documentRecord.serialLabel ||
                    documentRecord.serialNumber ||
                    index + 1;

                const days =
                    calculateDays(
                        documentRecord.receiptDate,
                        documentRecord.completionDate
                    );

                const receivingStaff =
                    documentRecord.receivingStaffName ||
                    documentRecord.receivingStaff ||
                    "—";

                const deliveringStaff =
                    documentRecord.deliveringStaffName ||
                    documentRecord.deliveringStaff ||
                    "—";

                const assignedEmployee =
                    documentRecord.assignedEmployeeName ||
                    documentRecord.assignedEmployee ||
                    "—";

                row.innerHTML = `

                    <td class="serial-cell">
                        ${escapeHtml(serial)}
                    </td>

                    <td class="client-cell">
                        <strong>
                            ${escapeHtml(
                                documentRecord.clientName || "—"
                            )}
                        </strong>

                        ${
                            documentRecord.clientPan
                                ? `
                                    <div class="client-pan">
                                        PAN: ${escapeHtml(
                                            documentRecord.clientPan
                                        )}
                                    </div>
                                  `
                                : ""
                        }
                    </td>

                    <td class="purpose-cell">
                        ${escapeHtml(
                            documentRecord.purpose || "—"
                        )}
                    </td>

                    <td class="mode-cell">
                        ${escapeHtml(
                            documentRecord.mode || "—"
                        )}
                    </td>

                    <td class="date-cell">
                        ${escapeHtml(
                            documentRecord.receiptDate || "—"
                        )}
                    </td>

                    <td class="date-cell">
                        ${escapeHtml(
                            documentRecord.dispatchDate || "—"
                        )}
                    </td>

                    <td class="completion-cell">
                        <input
                            type="date"
                            class="completion-date-input"
                            value="${escapeHtml(
                                documentRecord.completionDate || ""
                            )}"
                            data-id="${escapeHtml(
                                documentRecord.id
                            )}"
                        >
                    </td>

                    <td class="days-cell">
                        ${escapeHtml(days)}
                    </td>

                    <td class="status-cell">
                        <span
                            class="document-status ${statusClass}"
                        >
                            ${escapeHtml(status)}
                        </span>
                    </td>

                    <td class="staff-cell">
                        ${escapeHtml(receivingStaff)}
                    </td>

                    <td class="staff-cell">
                        ${escapeHtml(deliveringStaff)}
                    </td>

                    <td class="staff-cell">
                        ${escapeHtml(assignedEmployee)}
                    </td>

                `;

                tableBody.appendChild(row);
            }
        );

        attachCompletionHandlers();
    }

    /* =========================================================
       COMPLETION DATE
    ========================================================= */

    function attachCompletionHandlers() {

        document
            .querySelectorAll(
                ".completion-date-input"
            )
            .forEach(input => {

                input.addEventListener(
                    "change",
                    async function () {

                        const id =
                            this.dataset.id;

                        const completionDate =
                            this.value;

                        if (!id) {
                            return;
                        }

                        const record =
                            documents.find(
                                item =>
                                    String(
                                        item.id
                                    ) ===
                                    String(id)
                            );

                        if (!record) {
                            return;
                        }

                        /*
                         * Completion cannot be
                         * before receipt.
                         */

                        if (
                            completionDate &&
                            record.receiptDate &&
                            completionDate <
                            record.receiptDate
                        ) {

                            alert(
                                "Date of completion cannot be earlier than date of receipt."
                            );

                            this.value =
                                record.completionDate ||
                                "";

                            return;
                        }

                        /*
                         * Completion cannot be
                         * before dispatch.
                         */

                        if (
                            completionDate &&
                            record.dispatchDate &&
                            completionDate <
                            record.dispatchDate
                        ) {

                            alert(
                                "Date of completion cannot be earlier than date of dispatch."
                            );

                            this.value =
                                record.completionDate ||
                                "";

                            return;
                        }

                        try {

                            this.disabled =
                                true;

                            const data =
                                await api(
                                    `/api/documents/${encodeURIComponent(
                                        id
                                    )}/completion-date`,
                                    {
                                        method:
                                            "PATCH",

                                        headers: {
                                            "Content-Type":
                                                "application/json"
                                        },

                                        body:
                                            JSON.stringify({
                                                completionDate:
                                                    completionDate
                                            })
                                    }
                                );

                            /*
                             * Update local record.
                             */

                            const index =
                                documents.findIndex(
                                    item =>
                                        String(
                                            item.id
                                        ) ===
                                        String(id)
                                );

                            if (
                                index !== -1 &&
                                data.document
                            ) {

                                documents[index] =
                                    data.document;
                            }

                            /*
                             * Immediately refresh
                             * the register.
                             */

                            applyFilters();

                            showSuccess(
                                completionDate
                                    ? "Document marked COMPLETE."
                                    : "Document returned to W.I.P."
                            );

                        } catch (error) {

                            console.error(
                                "Completion update error:",
                                error
                            );

                            showError(
                                error.message
                            );

                            this.value =
                                record.completionDate ||
                                "";

                        } finally {

                            this.disabled =
                                false;
                        }
                    }
                );
            });
    }

    /* =========================================================
       CLEAR FILTERS
    ========================================================= */

    function clearFilters() {

        const fields = [

            "documentSearch",

            "documentModeFilter",

            "documentStatusFilter",

            "receiptDateFromFilter",

            "receiptDateToFilter"

        ];

        fields.forEach(id => {

            const element =
                $(id);

            if (!element) {
                return;
            }

            element.value = "";
        });

        applyFilters();

        /*
         * Reload from database after
         * clearing the filters.
         */

        loadDocuments(true);
    }

    /* =========================================================
       DISPATCH DATE
    ========================================================= */

    async function updateDispatchDate(
        id,
        dispatchDate
    ) {

        try {

            const data =
                await api(
                    `/api/documents/${encodeURIComponent(
                        id
                    )}/dispatch-date`,
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                dispatchDate:
                                    dispatchDate
                            })
                    }
                );

            const index =
                documents.findIndex(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (
                index !== -1 &&
                data.document
            ) {

                documents[index] =
                    normalizeDocument(data.document);
            }

            applyFilters();

        } catch (error) {

            console.error(
                "Dispatch date update error:",
                error
            );

            showError(
                error.message
            );
        }
    }

    /* =========================================================
       DELETE DOCUMENT
    ========================================================= */

    async function deleteDocument(
        id
    ) {

        if (!id) {
            return;
        }

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this document record?"
            );

        if (!confirmed) {
            return;
        }

        try {

            await api(
                `/api/documents/${encodeURIComponent(
                    id
                )}`,
                {
                    method:
                        "DELETE"
                }
            );

            /*
             * Remove immediately from
             * the visible register.
             */

            documents =
                documents.filter(
                    item =>
                        String(item.id) !==
                        String(id)
                );

            applyFilters();

            showSuccess(
                "Document deleted successfully."
            );

        } catch (error) {

            console.error(
                "Delete document error:",
                error
            );

            showError(
                error.message
            );
        }
    }

    /* =========================================================
       AUTO REFRESH
    ========================================================= */

    function startLiveRefresh() {

        if (refreshTimer) {
            clearInterval(
                refreshTimer
            );
        }

        refreshTimer =
            setInterval(
                () => {

                    /*
                     * Silent refresh means
                     * no annoying error popup
                     * every 10 seconds.
                     */

                    loadDocuments(true);

                },
                REFRESH_INTERVAL
            );
    }

    /* =========================================================
       FORM
    ========================================================= */

    async function saveDocument(
        event
    ) {

        event.preventDefault();

        const button =
            $("saveDocumentButton");

        if (button) {

            button.disabled =
                true;

            button.textContent =
                "Saving...";
        }

        try {

            const payload = {

                clientId:
                    $("clientId")?.value ||
                    "",

                purpose:
                    $("purpose")?.value ||
                    "",

                mode:
                    $("mode")?.value ||
                    "",

                receiptDate:
                    $("receiptDate")?.value ||
                    "",

                dispatchDate:
                    $("dispatchDate")?.value ||
                    "",

                completionDate:
                    $("completionDate")?.value ||
                    "",

                receivingStaffId:
                    $("receivingStaffId")?.value ||
                    "",

                deliveringStaffId:
                    $("deliveringStaffId")?.value ||
                    "",

                assignedEmployeeId:
                    $("assignedEmployeeId")?.value ||
                    ""

            };

            const data =
                await api(
                    "/api/documents",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );

            /*
             * Immediately insert newly
             * created document.
             */

            if (data.document) {

                documents.unshift(
                    normalizeDocument(data.document)
                );
            }

            applyFilters();

            showSuccess(
                "Document saved successfully."
            );

            const form =
                $("documentForm");

            if (form) {
                form.reset();
            }

            await loadSerial();

            /*
             * Reload from database to make
             * sure the register is exactly
             * synchronized.
             */

            await loadDocuments(true);

        } catch (error) {

            console.error(
                "Save document error:",
                error
            );

            showError(
                error.message
            );

        } finally {

            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    "Save Document";
            }
        }
    }

    /* =========================================================
       SERIAL NUMBER
    ========================================================= */

    async function loadSerial() {

        const serialInput =
            $("serialNumber");

        if (!serialInput) {
            return;
        }

        try {

            const data =
                await api(
                    "/api/documents/next-serial"
                );

            serialInput.value =
                data.serialLabel ||
                data.serialNumber ||
                "";

        } catch (error) {

            console.error(
                "Serial number error:",
                error
            );
        }
    }

    /* =========================================================
       CLIENTS
    ========================================================= */

    async function loadClients() {

        const select =
            $("clientId");

        if (!select) {
            return;
        }

        try {

            const data =
                await api(
                    "/api/documents/clients"
                );

            select.innerHTML =
                `<option value="">
                    Select client
                </option>`;

            (
                data.clients ||
                []
            ).forEach(client => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    client.id;

                option.textContent =
                    client.pan
                        ? `${client.name} • ${client.pan}`
                        : client.name;

                select.appendChild(
                    option
                );
            });

        } catch (error) {

            console.error(
                "Client loading error:",
                error
            );

            showError(
                error.message
            );
        }
    }

    /* =========================================================
       STAFF
    ========================================================= */

    async function loadStaff() {

        try {

            const data =
                await api(
                    "/api/documents/staff"
                );

            const staff =
                data.staff ||
                [];

            const receiving =
                $("receivingStaffId");

            const delivering =
                $("deliveringStaffId");

            const assigned =
                $("assignedEmployeeId");

            if (receiving) {

                receiving.innerHTML =
                    `<option value="">
                        Select receiving staff
                    </option>`;

                staff.forEach(person => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        person.id;

                    option.textContent =
                        person.name ||
                        person.username ||
                        "Staff";

                    receiving.appendChild(
                        option
                    );
                });
            }

            if (delivering) {

                delivering.innerHTML =
                    `<option value="">
                        Select delivering staff
                    </option>`;

                staff.forEach(person => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        person.id;

                    option.textContent =
                        person.name ||
                        person.username ||
                        "Staff";

                    delivering.appendChild(
                        option
                    );
                });
            }

            if (assigned) {

                assigned.innerHTML =
                    `<option value="">
                        Select employee
                    </option>`;

                staff
                    .filter(
                        person =>
                            String(
                                person.role ||
                                ""
                            ).toLowerCase() ===
                            "employee"
                    )
                    .forEach(person => {

                        const option =
                            document.createElement(
                                "option"
                            );

                        option.value =
                            person.id;

                        option.textContent =
                            person.name ||
                            person.username ||
                            "Employee";

                        assigned.appendChild(
                            option
                        );
                    });
            }

        } catch (error) {

            console.error(
                "Staff loading error:",
                error
            );

            showError(
                error.message
            );
        }
    }

    /* =========================================================
       MODE
    ========================================================= */

    function setupMode() {

        const mode =
            $("mode");

        const dispatch =
            $("dispatchDate");

        if (!mode || !dispatch) {
            return;
        }

        function update() {

            const isOffline =
                mode.value ===
                "offline";

            dispatch.disabled =
                !isOffline;

            if (!isOffline) {
                dispatch.value = "";
            }
        }

        mode.addEventListener(
            "change",
            update
        );

        update();
    }

    /* =========================================================
       EXPORT EXCEL
    ========================================================= */

    function exportExcel() {

        if (
            !filteredDocuments.length
        ) {

            alert(
                "No document records match the current filters."
            );

            return;
        }

        if (!window.XLSX) {

            alert(
                "Excel export library is not available."
            );

            return;
        }

        const rows =
            filteredDocuments.map(
                documentRecord => ({

                    "SERIAL NUMBER":
                        documentRecord.serialLabel ||
                        documentRecord.serialNumber,

                    "CLIENT":
                        documentRecord.clientName ||
                        "",

                    "PAN":
                        documentRecord.clientPan ||
                        "",

                    "PURPOSE":
                        documentRecord.purpose ||
                        "",

                    "MODE":
                        documentRecord.mode ||
                        "",

                    "DATE OF RECEIPT":
                        documentRecord.receiptDate ||
                        "",

                    "DATE OF DISPATCH":
                        documentRecord.dispatchDate ||
                        "",

                    "DATE OF COMPLETION":
                        documentRecord.completionDate ||
                        "",

                    "NO. OF DAYS":
                        calculateDays(
                            documentRecord.receiptDate,
                            documentRecord.completionDate
                        ),

                    "STATUS":
                        getStatus(
                            documentRecord
                        ),

                    "RECEIVING STAFF":
                        documentRecord.receivingStaffName ||
                        documentRecord.receivingStaff ||
                        "",

                    "DELIVERING STAFF":
                        documentRecord.deliveringStaffName ||
                        documentRecord.deliveringStaff ||
                        "",

                    "ASSIGNED EMPLOYEE":
                        documentRecord.assignedEmployeeName ||
                        documentRecord.assignedEmployee ||
                        ""

                })
            );

        const worksheet =
            XLSX.utils.json_to_sheet(
                rows
            );

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Documents"
        );

        XLSX.writeFile(
            workbook,
            "Office-Document-Register.xlsx"
        );
    }

    /* =========================================================
       EXPORT PDF
    ========================================================= */

    function exportPdf() {

        if (
            !filteredDocuments.length
        ) {

            alert(
                "No document records match the current filters."
            );

            return;
        }

        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {

            alert(
                "PDF export library is not available."
            );

            return;
        }

        const pdf =
            new window.jspdf.jsPDF({
                orientation:
                    "landscape",
                unit:
                    "mm",
                format:
                    "a4"
            });

        pdf.setFontSize(15);

        pdf.text(
            "Office Document Register",
            10,
            12
        );

        if (
            typeof pdf.autoTable !==
            "function"
        ) {

            alert(
                "PDF table library is not available."
            );

            return;
        }

        pdf.autoTable({

            startY: 18,

            head: [[
                "SERIAL",
                "CLIENT",
                "PURPOSE",
                "MODE",
                "RECEIPT",
                "DISPATCH",
                "COMPLETION",
                "DAYS",
                "STATUS"
            ]],

            body:
                filteredDocuments.map(
                    documentRecord => [

                        documentRecord.serialLabel ||
                            documentRecord.serialNumber,

                        documentRecord.clientName ||
                            "",

                        documentRecord.purpose ||
                            "",

                        documentRecord.mode ||
                            "",

                        documentRecord.receiptDate ||
                            "",

                        documentRecord.dispatchDate ||
                            "",

                        documentRecord.completionDate ||
                            "",

                        calculateDays(
                            documentRecord.receiptDate,
                            documentRecord.completionDate
                        ),

                        getStatus(
                            documentRecord
                        )
                    ]
                ),

            styles: {
                fontSize: 7,
                cellPadding: 2
            }
        });

        pdf.save(
            "Office-Document-Register.pdf"
        );
    }

    /* =========================================================
       INITIALIZE
    ========================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        async () => {

            /*
             * SAVE
             */

            const form =
                $("documentForm");

            if (form) {

                form.addEventListener(
                    "submit",
                    saveDocument
                );
            }

            /*
             * SEARCH
             */

            $("documentSearch")
                ?.addEventListener(
                    "input",
                    applyFilters
                );

            /*
             * FILTERS
             */

            $("documentModeFilter")
                ?.addEventListener(
                    "change",
                    applyFilters
                );

            $("documentStatusFilter")
                ?.addEventListener(
                    "change",
                    applyFilters
                );

            $("receiptDateFromFilter")
                ?.addEventListener(
                    "change",
                    applyFilters
                );

            $("receiptDateToFilter")
                ?.addEventListener(
                    "change",
                    applyFilters
                );

            /*
             * CLEAR FILTERS
             */

            $("clearDocumentFilters")
                ?.addEventListener(
                    "click",
                    clearFilters
                );

            /*
             * EXPORT
             */

            $("exportExcelButton")
                ?.addEventListener(
                    "click",
                    exportExcel
                );

            $("exportPdfButton")
                ?.addEventListener(
                    "click",
                    exportPdf
                );

            /*
             * MODE
             */

            setupMode();

            /*
             * INITIAL LOAD
             */

            await Promise.all([

                loadClients(),

                loadStaff(),

                loadSerial(),

                loadDocuments()

            ]);

            /*
             * START LIVE REGISTER
             *
             * Every 10 seconds the page
             * asks the database for the
             * latest document records.
             */

            startLiveRefresh();
        }
    );

    /*
     * Make useful functions available
     * to existing HTML onclick handlers.
     */

    window.loadDocuments =
        loadDocuments;

    window.applyDocumentFilters =
        applyFilters;

    window.clearDocumentFilters =
        clearFilters;

    window.updateDocumentDispatchDate =
        updateDispatchDate;

    window.deleteDocument =
        deleteDocument;

})();