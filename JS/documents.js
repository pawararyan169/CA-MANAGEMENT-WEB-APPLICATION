document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const state = {
        documents: [],
        clients: [],
        staff: []
    };


    /* =========================================================
       ELEMENTS
    ========================================================= */

    const form =
        document.getElementById('documentForm');

    const serialInput =
        document.getElementById('serialNumber');

    const clientSelect =
        document.getElementById('clientId');

    const purposeSelect =
        document.getElementById('purpose');

    const modeSelect =
        document.getElementById('mode');

    const receiptDateInput =
        document.getElementById('receiptDate');

    const dispatchDateInput =
        document.getElementById('dispatchDate');

    const dispatchDateHelp =
        document.getElementById('dispatchDateHelp');

    const receivingStaffSelect =
        document.getElementById('receivingStaffId');

    const deliveringStaffSelect =
        document.getElementById('deliveringStaffId');

    const assignedEmployeeSelect =
        document.getElementById('assignedEmployeeId');

    const saveButton =
        document.getElementById('saveDocumentButton');

    const errorBox =
        document.getElementById('documentError');

    const successBox =
        document.getElementById('documentSuccess');

    const tableBody =
        document.getElementById('documentsTableBody');

    const emptyBox =
        document.getElementById('documentsEmpty');

    const searchInput =
        document.getElementById('documentSearch');

    const modeFilter =
        document.getElementById('documentModeFilter');

    const statusFilter =
        document.getElementById('documentStatusFilter');

    const receiptDateFromFilter =
        document.getElementById('receiptDateFromFilter');

    const receiptDateToFilter =
        document.getElementById('receiptDateToFilter');

    const totalCount =
        document.getElementById('documentTotal');

    const visibleCount =
        document.getElementById('documentVisible');

    const exportExcelButton =
        document.getElementById('exportExcelButton');

    const exportPdfButton =
        document.getElementById('exportPdfButton');


    /* =========================================================
       HELPERS
    ========================================================= */

    function esc(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }


    function clean(value) {
        return String(value ?? '').trim();
    }


    function formatDate(value) {

        if (!value) {
            return '—';
        }

        const date =
            new Date(value + 'T00:00:00');

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString('en-IN');
    }


    function getDocumentDays(receiptDate, dispatchDate) {

        if (!receiptDate) {
            return '—';
        }

        const start =
            new Date(receiptDate + 'T00:00:00');

        const end =
            dispatchDate
                ? new Date(dispatchDate + 'T00:00:00')
                : new Date();

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())
        ) {
            return '—';
        }

        const days =
            Math.floor(
                (end.getTime() - start.getTime()) /
                (24 * 60 * 60 * 1000)
            );

        return String(Math.max(0, days));
    }


    function showError(message) {

        if (successBox) {
            successBox.style.display = 'none';
            successBox.textContent = '';
        }

        if (!errorBox) {
            alert(message);
            return;
        }

        errorBox.textContent = message;
        errorBox.style.display = 'block';
    }


    function showSuccess(message) {

        if (errorBox) {
            errorBox.style.display = 'none';
            errorBox.textContent = '';
        }

        if (!successBox) {
            alert(message);
            return;
        }

        successBox.textContent = message;
        successBox.style.display = 'block';
    }


    function hideMessages() {

        if (errorBox) {
            errorBox.style.display = 'none';
            errorBox.textContent = '';
        }

        if (successBox) {
            successBox.style.display = 'none';
            successBox.textContent = '';
        }
    }


    function setDefaultReceiptDate() {

        if (!receiptDateInput || receiptDateInput.value) {
            return;
        }

        const now = new Date();

        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');

        receiptDateInput.value =
            `${yyyy}-${mm}-${dd}`;
    }


    /* =========================================================
       ONLINE / OFFLINE DISPATCH DATE
    ========================================================= */

    function updateDispatchDateForMode() {

        if (!modeSelect || !dispatchDateInput) {
            return;
        }

        const mode =
            String(modeSelect.value || '')
                .trim()
                .toLowerCase();

        /*
         * ENTRY-BASED DISPATCH RULE
         *
         * Online:
         *   - Dispatch Date is disabled.
         *   - Any existing value is cleared.
         *
         * Offline:
         *   - Dispatch Date becomes a normal entry field.
         *   - User can type/select the date.
         *
         * No mode:
         *   - Dispatch Date stays disabled.
         */
        if (mode === 'offline') {

            dispatchDateInput.disabled = false;
            dispatchDateInput.removeAttribute('disabled');
            dispatchDateInput.classList.remove('dispatch-disabled');

            if (dispatchDateHelp) {
                dispatchDateHelp.textContent = '';
            }

        } else {

            dispatchDateInput.value = '';
            dispatchDateInput.disabled = true;
            dispatchDateInput.setAttribute('disabled', 'disabled');
            dispatchDateInput.removeAttribute('required');
            dispatchDateInput.classList.add('dispatch-disabled');

            if (dispatchDateHelp) {
                dispatchDateHelp.textContent =
                    mode === 'online'
                        ? 'Dispatch date is not applicable for online documents.'
                        : 'Select Offline mode to enter a dispatch date.';
            }
        }
    }

    /* =========================================================
       SERIAL NUMBER
    ========================================================= */

    async function loadNextSerial() {

        if (!serialInput) {
            return;
        }

        serialInput.value = 'Loading...';

        try {

            const response =
                await fetch('/api/documents/next-serial', {
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

            const result =
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    'Unable to generate serial number.'
                );
            }

            serialInput.value =
                result.serialLabel ||
                `DOC-${String(result.serialNumber).padStart(6, '0')}`;

        }
        catch (error) {

            console.error(
                'Document serial error:',
                error
            );

            serialInput.value = 'Auto-generated';
        }
    }


    /* =========================================================
       CLIENT DROPDOWN
    ========================================================= */

    async function loadClients() {

        if (!clientSelect) {
            return;
        }

        clientSelect.innerHTML =
            '<option value="">Loading clients...</option>';

        try {

            const response =
                await fetch('/api/documents/clients', {
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

            const result =
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    'Unable to load clients.'
                );
            }

            state.clients =
                Array.isArray(result.clients)
                    ? result.clients
                    : [];

            clientSelect.innerHTML =
                '<option value="">Select client</option>';

            state.clients.forEach(client => {

                const option =
                    document.createElement('option');

                option.value = client.id;

                option.textContent =
                    client.pan
                        ? `${client.name} — PAN: ${client.pan}`
                        : client.name;

                clientSelect.appendChild(option);
            });

        }
        catch (error) {

            console.error(
                'Document clients error:',
                error
            );

            clientSelect.innerHTML =
                '<option value="">Unable to load clients</option>';

            showError(
                error.message ||
                'Unable to load clients.'
            );
        }
    }


    /* =========================================================
       STAFF DROPDOWNS
    ========================================================= */

    async function loadAssignedEmployees() {

        try {

            const response =
                await fetch(
                    '/api/documents/employees',
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

            state.employees =
                Array.isArray(result.employees)
                    ? result.employees
                    : [];

            if (assignedEmployeeSelect) {

                assignedEmployeeSelect.innerHTML = `
                    <option value="">
                        Select employee
                    </option>
                `;

                state.employees.forEach(employee => {

                    const option =
                        document.createElement('option');

                    option.value =
                        employee.id;

                    option.textContent =
                        employee.name;

                    assignedEmployeeSelect.appendChild(option);
                });
            }

        } catch (error) {

            console.error(
                'Assigned document employees error:',
                error
            );

            showError(
                error.message ||
                'Unable to load employees.'
            );
        }
    }


    async function loadStaff() {

        try {

            const response =
                await fetch('/api/documents/staff', {
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

            const result =
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    'Unable to load staff.'
                );
            }

            state.staff =
                Array.isArray(result.staff)
                    ? result.staff
                    : [];

            populateStaffSelect(
                receivingStaffSelect,
                'Select receiving staff'
            );

            populateStaffSelect(
                deliveringStaffSelect,
                'Select delivering staff'
            );

        }
        catch (error) {

            console.error(
                'Document staff error:',
                error
            );

            if (receivingStaffSelect) {
                receivingStaffSelect.innerHTML =
                    '<option value="">Unable to load staff</option>';
            }

            if (deliveringStaffSelect) {
                deliveringStaffSelect.innerHTML =
                    '<option value="">Unable to load staff</option>';
            }

            showError(
                error.message ||
                'Unable to load staff.'
            );
        }
    }


    function populateStaffSelect(select, placeholder) {

        if (!select) {
            return;
        }

        select.innerHTML =
            `<option value="">${esc(placeholder)}</option>`;

        state.staff.forEach(person => {

            const option =
                document.createElement('option');

            option.value = person.id;

            const role =
                person.role === 'admin'
                    ? 'Administrator'
                    : (person.designation || 'Employee');

            option.textContent =
                `${person.name} — ${role}`;

            select.appendChild(option);
        });
    }


    /* =========================================================
       LOAD DOCUMENTS
    ========================================================= */

    async function loadDocuments() {

        try {

            const response =
                await fetch('/api/documents', {
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });

            const result =
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    'Unable to load documents.'
                );
            }

            state.documents =
                Array.isArray(result.documents)
                    ? result.documents
                    : [];

            renderDocuments();

        }
        catch (error) {

            console.error(
                'Load documents error:',
                error
            );

            if (tableBody) {
                tableBody.innerHTML = '';
            }

            if (emptyBox) {
                emptyBox.textContent =
                    error.message ||
                    'Unable to load document records.';
                emptyBox.style.display = 'block';
            }
        }
    }


    /* =========================================================
       FILTER + RENDER
    ========================================================= */

    function getFilteredDocuments() {

        const search =
            clean(searchInput?.value).toLowerCase();

        const mode =
            clean(modeFilter?.value).toLowerCase();

        const status =
            clean(statusFilter?.value).toLowerCase();

        const receiptFrom =
            clean(receiptDateFromFilter?.value);

        const receiptTo =
            clean(receiptDateToFilter?.value);

        return state.documents.filter(doc => {

            if (
                mode &&
                clean(doc.mode).toLowerCase() !== mode
            ) {
                return false;
            }

            const documentStatus =
                doc.dispatchDate
                    ? 'dispatched'
                    : 'received';

            if (
                status &&
                documentStatus !== status
            ) {
                return false;
            }

            const documentReceiptDate =
                clean(doc.receiptDate);

            if (
                receiptFrom &&
                (
                    !documentReceiptDate ||
                    documentReceiptDate < receiptFrom
                )
            ) {
                return false;
            }

            if (
                receiptTo &&
                (
                    !documentReceiptDate ||
                    documentReceiptDate > receiptTo
                )
            ) {
                return false;
            }

            if (!search) {
                return true;
            }

            const searchable = [
                doc.serialLabel,
                doc.clientName,
                doc.clientPan,
                doc.purpose,
                doc.mode,
                doc.receivingStaff,
                doc.deliveringStaff,
                doc.assignedEmployee,
                doc.receiptDate,
                doc.dispatchDate
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchable.includes(search);
        });
    }


    function renderDocuments() {

        if (!tableBody) {
            return;
        }

        const filtered =
            getFilteredDocuments();

        if (totalCount) {
            totalCount.textContent =
                state.documents.length;
        }

        if (visibleCount) {
            visibleCount.textContent =
                filtered.length;
        }

        tableBody.innerHTML = '';

        if (!filtered.length) {

            if (emptyBox) {
                emptyBox.textContent =
                    state.documents.length
                        ? 'No document records match your filters.'
                        : 'No document records have been added yet.';
                emptyBox.style.display = 'block';
            }

            return;
        }

        if (emptyBox) {
            emptyBox.style.display = 'none';
        }

        filtered.forEach(doc => {

            const row =
                document.createElement('tr');

            const status =
                doc.dispatchDate
                    ? 'Dispatched'
                    : 'Received';

            row.innerHTML = `

                <td>
                    <strong>
                        ${esc(doc.serialLabel)}
                    </strong>
                </td>

                <td>
                    <strong>
                        ${esc(doc.clientName)}
                    </strong>
                    ${doc.clientPan ? `
                        <div class="muted-small">
                            PAN: ${esc(doc.clientPan)}
                        </div>
                    ` : ''}
                </td>

                <td>
                    ${esc(doc.purpose)}
                </td>

                <td>
                    <span class="mode-badge ${
                        doc.mode === 'online'
                            ? 'mode-online'
                            : 'mode-offline'
                    }">
                        ${esc(
                            doc.mode.charAt(0).toUpperCase() +
                            doc.mode.slice(1)
                        )}
                    </span>
                </td>

                <td>
                    ${esc(formatDate(doc.receiptDate))}
                </td>

                <td>
                    <div class="dispatch-cell">
                        ${
                            doc.mode === 'offline'
                                ? `
                                    <div
                                        class="dispatch-display"
                                        data-document-id="${esc(doc.id)}"
                                    >
                                        <span class="dispatch-date-value">
                                            ${esc(formatDate(doc.dispatchDate))}
                                        </span>

                                        <button
                                            type="button"
                                            class="edit-dispatch-button"
                                            data-document-id="${esc(doc.id)}"
                                            data-dispatch-date="${esc(doc.dispatchDate || '')}"
                                            data-receipt-date="${esc(doc.receiptDate || '')}"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                `
                                : `
                                    <span class="dispatch-date-value">
                                        —
                                    </span>
                                `
                        }
                    </div>
                </td>

                <td>
                    <strong>
                        ${esc(
                            getDocumentDays(
                                doc.receiptDate,
                                doc.dispatchDate
                            )
                        )}
                    </strong>
                    <span class="days-label">days</span>
                </td>

                <td>
                    ${esc(doc.receivingStaff || '—')}
                </td>

                <td>
                    ${esc(doc.deliveringStaff || '—')}
                </td>

                <td>
                    ${esc(doc.assignedEmployee || '—')}
                </td>

                <td>
                    <span class="status-badge ${
                        doc.dispatchDate
                            ? 'status-dispatched'
                            : 'status-received'
                    }">
                        ${status}
                    </span>
                </td>

            `;

            tableBody.appendChild(row);
        });
    }


    /* =========================================================
       EXPORT HELPERS
    ========================================================= */

    function getExportRows() {

        return getFilteredDocuments().map(doc => ({
            'Serial Number': doc.serialLabel || '',
            'Client': doc.clientName || '',
            'PAN': doc.clientPan || '',
            'Purpose': doc.purpose || '',
            'Mode': doc.mode
                ? doc.mode.charAt(0).toUpperCase() + doc.mode.slice(1)
                : '',
            'Date of Receipt': formatDate(doc.receiptDate),
            'Date of Dispatch': formatDate(doc.dispatchDate),
            'Number of Days': getDocumentDays(doc.receiptDate, doc.dispatchDate),
            'Receiving Staff': doc.receivingStaff || '',
            'Delivering Staff': doc.deliveringStaff || '',
            'Assigned Employee': doc.assignedEmployee || '',
            'Status': doc.dispatchDate ? 'Dispatched' : 'Received'
        }));
    }


    function getExportFileStamp() {

        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('-');
    }


    function exportExcel() {

        const rows = getExportRows();

        if (!rows.length) {
            showError(
                'There are no document records to export for the current filters.'
            );
            return;
        }

        if (!window.XLSX) {
            showError(
                'Excel export library is not available. Please check your internet connection and refresh the page.'
            );
            return;
        }

        const worksheet =
            XLSX.utils.json_to_sheet(rows);

        worksheet['!cols'] = [
            { wch: 18 },
            { wch: 28 },
            { wch: 16 },
            { wch: 18 },
            { wch: 12 },
            { wch: 18 },
            { wch: 18 },
            { wch: 25 },
            { wch: 25 },
            { wch: 25 },
            { wch: 16 }
        ];

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            'Document Register'
        );

        XLSX.writeFile(
            workbook,
            `document-register-${getExportFileStamp()}.xlsx`
        );

        showSuccess(
            `${rows.length} document record(s) exported to Excel.`
        );
    }


    function exportPdf() {

        const rows = getExportRows();

        if (!rows.length) {
            showError(
                'There are no document records to export for the current filters.'
            );
            return;
        }

        const jsPDF =
            window.jspdf?.jsPDF;

        if (!jsPDF) {
            showError(
                'PDF export library is not available. Please check your internet connection and refresh the page.'
            );
            return;
        }

        const doc =
            new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

        doc.setFontSize(16);
        doc.text(
            'CA Office - Document Register',
            12,
            14
        );

        doc.setFontSize(8);
        doc.text(
            `Generated: ${new Date().toLocaleString('en-IN')}`,
            12,
            20
        );

        const search =
            clean(searchInput?.value);

        const mode =
            clean(modeFilter?.value);

        const status =
            clean(statusFilter?.value);

        const receiptFrom =
            clean(receiptDateFromFilter?.value);

        const receiptTo =
            clean(receiptDateToFilter?.value);

        const receiptRange =
            receiptFrom && receiptTo
                ? `Receipt: ${formatDate(receiptFrom)} to ${formatDate(receiptTo)}`
                : receiptFrom
                    ? `Receipt from: ${formatDate(receiptFrom)}`
                    : receiptTo
                        ? `Receipt to: ${formatDate(receiptTo)}`
                        : '';

        const filterText = [
            search ? `Search: ${search}` : '',
            mode ? `Mode: ${mode}` : '',
            status ? `Status: ${status}` : '',
            receiptRange
        ].filter(Boolean).join(' | ');

        doc.text(
            filterText
                ? `Filters: ${filterText} | Records: ${rows.length}`
                : `Records: ${rows.length}`,
            12,
            25
        );

        const body =
            rows.map(row => [
                row['Serial Number'],
                row['Client'],
                row['PAN'],
                row['Purpose'],
                row['Mode'],
                row['Date of Receipt'],
                row['Date of Dispatch'],
                row['Number of Days'],
                row['Receiving Staff'],
                row['Delivering Staff'],
                row['Assigned Employee'],
                row['Status']
            ]);

        if (typeof doc.autoTable !== 'function') {
            showError(
                'PDF table library is not available. Please refresh the page.'
            );
            return;
        }

        doc.autoTable({
            startY: 30,
            head: [[
                'Serial',
                'Client',
                'PAN',
                'Purpose',
                'Mode',
                'Receipt',
                'Dispatch',
                'Days',
                'Receiving Staff',
                'Delivering Staff',
                'Assigned Employee',
                'Status'
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
            columnStyles: {
                0: { cellWidth: 18 },
                1: { cellWidth: 34 },
                2: { cellWidth: 20 },
                3: { cellWidth: 20 },
                4: { cellWidth: 15 },
                5: { cellWidth: 20 },
                6: { cellWidth: 20 },
                7: { cellWidth: 34 },
                8: { cellWidth: 34 },
                9: { cellWidth: 20 }
            },
            margin: {
                left: 8,
                right: 8
            }
        });

        doc.save(
            `document-register-${getExportFileStamp()}.pdf`
        );

        showSuccess(
            `${rows.length} document record(s) exported to PDF.`
        );
    }




    /* =========================================================
       INLINE EDIT DISPATCH DATE
    ========================================================= */

    function startDispatchEdit(button) {

        const cell =
            button.closest('.dispatch-display');

        if (!cell) {
            return;
        }

        const documentId =
            button.dataset.documentId;

        const receiptDate =
            button.dataset.receiptDate || '';

        const currentDate =
            button.dataset.dispatchDate || '';

        cell.innerHTML = `
            <input
                type="date"
                class="dispatch-inline-input"
                value="${esc(currentDate)}"
                min="${esc(receiptDate)}"
                data-document-id="${esc(documentId)}"
                data-receipt-date="${esc(receiptDate)}"
            >

            <button
                type="button"
                class="save-dispatch-button"
                data-document-id="${esc(documentId)}"
            >
                Save
            </button>

            <button
                type="button"
                class="cancel-dispatch-button"
                data-document-id="${esc(documentId)}"
                data-dispatch-date="${esc(currentDate)}"
                data-receipt-date="${esc(receiptDate)}"
            >
                Cancel
            </button>
        `;

        const input =
            cell.querySelector('.dispatch-inline-input');

        input?.focus();

        if (typeof input?.showPicker === 'function') {
            try {
                input.showPicker();
            } catch (_) {
                // Some browsers only allow showPicker after a trusted action.
            }
        }
    }


    async function saveDispatchDateFromCell(button) {

        const cell =
            button.closest('.dispatch-display');

        const input =
            cell?.querySelector('.dispatch-inline-input');

        if (!cell || !input) {
            return;
        }

        const documentId =
            button.dataset.documentId;

        const dispatchDate =
            clean(input.value);

        const receiptDate =
            clean(input.dataset.receiptDate);

        /*
         * Empty is allowed while editing.
         * Saving an empty value clears the dispatch date and changes
         * the record back to Received.
         */
        if (
            dispatchDate &&
            receiptDate &&
            dispatchDate < receiptDate
        ) {
            showError(
                'Date of dispatch cannot be earlier than the date of receipt.'
            );
            input.focus();
            return;
        }

        button.disabled = true;
        button.textContent = 'Saving...';

        try {

            const response =
                await fetch(
                    `/api/documents/${encodeURIComponent(documentId)}/dispatch-date`,
                    {
                        method: 'PATCH',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            dispatchDate
                        })
                    }
                );

            const result =
                await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    'Unable to update dispatch date.'
                );
            }

            showSuccess(
                'Dispatch date updated successfully.'
            );

            await loadDocuments();

        }
        catch (error) {

            console.error(
                'Update dispatch date error:',
                error
            );

            showError(
                error.message ||
                'Unable to update dispatch date.'
            );

            button.disabled = false;
            button.textContent = 'Save';
        }
    }


    function cancelDispatchEdit(button) {

        const cell =
            button.closest('.dispatch-display');

        if (!cell) {
            return;
        }

        const documentId =
            button.dataset.documentId;

        const dispatchDate =
            button.dataset.dispatchDate || '';

        const receiptDate =
            button.dataset.receiptDate || '';

        cell.innerHTML = `
            <span class="dispatch-date-value">
                ${esc(
                    dispatchDate
                        ? formatDate(dispatchDate)
                        : '—'
                )}
            </span>

            <button
                type="button"
                class="edit-dispatch-button"
                data-document-id="${esc(documentId)}"
                data-dispatch-date="${esc(dispatchDate)}"
                data-receipt-date="${esc(receiptDate)}"
            >
                Edit
            </button>
        `;
    }


    tableBody?.addEventListener(
        'click',
        event => {

            const editButton =
                event.target.closest(
                    '.edit-dispatch-button'
                );

            if (editButton) {
                startDispatchEdit(editButton);
                return;
            }

            const saveButton =
                event.target.closest(
                    '.save-dispatch-button'
                );

            if (saveButton) {
                saveDispatchDateFromCell(saveButton);
                return;
            }

            const cancelButton =
                event.target.closest(
                    '.cancel-dispatch-button'
                );

            if (cancelButton) {
                cancelDispatchEdit(cancelButton);
            }
        }
    );


    /* =========================================================
       EXPORT EVENTS
    ========================================================= */

    exportExcelButton?.addEventListener(
        'click',
        exportExcel
    );

    exportPdfButton?.addEventListener(
        'click',
        exportPdf
    );


    /* =========================================================
       SAVE DOCUMENT
    ========================================================= */

    if (form) {

        form.addEventListener('submit', async event => {

            event.preventDefault();

            hideMessages();

            const data = {

                clientId:
                    clean(clientSelect?.value),

                purpose:
                    clean(purposeSelect?.value),

                mode:
                    clean(modeSelect?.value).toLowerCase(),

                receiptDate:
                    clean(receiptDateInput?.value),

                dispatchDate:
                    clean(modeSelect?.value).toLowerCase() === 'online'
                        ? ''
                        : clean(dispatchDateInput?.value),

                receivingStaffId:
                    clean(receivingStaffSelect?.value),

                deliveringStaffId:
                    clean(deliveringStaffSelect?.value),

                assignedEmployeeId:
                    clean(assignedEmployeeSelect?.value)
            };


            if (!data.clientId) {
                showError('Please select a client.');
                return;
            }

            if (!data.purpose) {
                showError('Please select the document purpose.');
                return;
            }

            if (!data.mode) {
                showError('Please select online or offline mode.');
                return;
            }

            if (!data.receiptDate) {
                showError('Date of receipt is required.');
                return;
            }

            if (
                data.dispatchDate &&
                data.dispatchDate < data.receiptDate
            ) {
                showError(
                    'Date of dispatch cannot be earlier than the date of receipt.'
                );
                return;
            }

            if (!data.receivingStaffId) {
                showError('Please select the receiving staff member.');
                return;
            }

            if (!data.assignedEmployeeId) {
                showError('Please select the employee assigned to this document.');
                return;
            }

            if (data.dispatchDate && !data.deliveringStaffId) {
                showError('Please select the delivering staff member when a dispatch date is entered.');
                return;
            }


            if (saveButton) {
                saveButton.disabled = true;
                saveButton.textContent = 'Saving...';
            }


            try {

                const response =
                    await fetch('/api/documents', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(data)
                    });

                const result =
                    await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        'Unable to create document record.'
                    );
                }

                showSuccess(
                    `${result.serialLabel || 'Document'} saved successfully.`
                );

                form.reset();

                setDefaultReceiptDate();

                updateDispatchDateForMode();

                await loadNextSerial();

                await loadDocuments();

            }
            catch (error) {

                console.error(
                    'Save document error:',
                    error
                );

                showError(
                    error.message ||
                    'Unable to create document record.'
                );

            }
            finally {

                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = 'Save Document';
                }
            }
        });
    }


    /* =========================================================
       FILTER EVENTS
    ========================================================= */

    searchInput?.addEventListener(
        'input',
        renderDocuments
    );

    modeFilter?.addEventListener(
        'change',
        renderDocuments
    );

    statusFilter?.addEventListener(
        'change',
        renderDocuments
    );

    /*
     * Document form mode:
     *
     * Online  -> dispatch date disabled + empty
     * Offline -> dispatch date enabled + normal
     * Blank   -> dispatch date disabled + empty
     */
    modeSelect?.addEventListener(
        'change',
        updateDispatchDateForMode
    );

    /*
     * Delegated fallback: guarantees the form mode change updates
     * the dispatch field even if another script replaces/rebinds
     * the mode element.
     */
    form?.addEventListener(
        'change',
        event => {

            if (
                event.target &&
                event.target.id === 'mode'
            ) {
                updateDispatchDateForMode();
            }
        }
    );

    receiptDateFromFilter?.addEventListener(
        'change',
        () => {

            const from =
                clean(receiptDateFromFilter.value);

            const to =
                clean(receiptDateToFilter?.value);

            if (from && to && from > to) {
                showError(
                    'Receipt date From cannot be later than receipt date To.'
                );
                receiptDateFromFilter.value = '';
                return;
            }

            renderDocuments();
        }
    );

    receiptDateToFilter?.addEventListener(
        'change',
        () => {

            const from =
                clean(receiptDateFromFilter?.value);

            const to =
                clean(receiptDateToFilter.value);

            if (from && to && from > to) {
                showError(
                    'Receipt date To cannot be earlier than receipt date From.'
                );
                receiptDateToFilter.value = '';
                return;
            }

            renderDocuments();
        }
    );


    /* =========================================================
       LOGOUT
    ========================================================= */

    const logoutButton =
        document.getElementById('logoutButton');

    if (logoutButton) {

        logoutButton.addEventListener('click', () => {

            localStorage.removeItem(
                'caOfficeLoggedIn'
            );

            localStorage.removeItem(
                'caOfficeUser'
            );

            window.location.href =
                '/login.html';
        });
    }


    /* =========================================================
       INITIALIZE
    ========================================================= */

    setDefaultReceiptDate();

    updateDispatchDateForMode();

    loadNextSerial();

    loadClients();

    loadStaff();

    loadDocuments();


    /* =========================================================
       LIVE DOCUMENT REGISTER
    ========================================================= */

    setInterval(
        loadDocuments,
        10000
    );

    setInterval(
        loadNextSerial,
        10000
    );

});
