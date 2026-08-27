(() => {
    "use strict";

    let documents = [];
    let filteredDocuments = [];

    const $ = id => document.getElementById(id);

    function esc(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            ch => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[ch])
        );
    }

    function showError(message) {
        const box = $("documentError");
        if (!box) return;
        box.textContent = message || "Something went wrong.";
        box.style.display = "block";
    }

    function showSuccess(message) {
        const box = $("documentSuccess");
        if (!box) return;
        box.textContent = message;
        box.style.display = "block";

        setTimeout(() => {
            box.style.display = "none";
        }, 3000);
    }

    function getStatus(doc) {
        return doc.completionDate
            ? "complete"
            : "wip";
    }

    function statusLabel(doc) {
        return doc.completionDate
            ? "COMPLETE"
            : "W.I.P";
    }

    function daysBetween(start, end) {
        if (!start) return "";

        const a = new Date(start + "T00:00:00");
        const b = new Date(
            (end || new Date().toISOString().slice(0, 10)) +
            "T00:00:00"
        );

        const diff =
            Math.floor(
                (b - a) / 86400000
            );

        return Math.max(0, diff);
    }

    async function getJson(url, options = {}) {
        const response = await fetch(
            url,
            {
                credentials: "same-origin",
                cache: "no-store",
                ...options
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                `Request failed (${response.status})`
            );
        }

        return data;
    }

    async function loadClients() {
        const select = $("clientId");
        if (!select) return;

        try {
            const data =
                await getJson("/api/documents/clients");

            select.innerHTML =
                `<option value="">Select client</option>`;

            (data.clients || []).forEach(client => {
                const option =
                    document.createElement("option");

                option.value = client.id;

                option.textContent =
                    client.pan
                        ? `${client.name} • ${client.pan}`
                        : client.name;

                select.appendChild(option);
            });

        } catch (error) {
            console.error(
                "Document clients error:",
                error
            );

            select.innerHTML =
                `<option value="">Unable to load clients</option>`;

            showError(error.message);
        }
    }

    async function loadStaff() {
        try {
            const data =
                await getJson("/api/documents/staff");

            const staffLists = [
                $("receivingStaffId"),
                $("deliveringStaffId")
            ];

            staffLists.forEach(select => {
                if (!select) return;

                const first =
                    select.id === "receivingStaffId"
                        ? "Select receiving staff"
                        : "Select delivering staff";

                select.innerHTML =
                    `<option value="">${first}</option>`;

                (data.staff || []).forEach(person => {
                    const option =
                        document.createElement("option");

                    option.value = person.id;
                    option.textContent =
                        person.name ||
                        person.username ||
                        "Staff";

                    select.appendChild(option);
                });
            });

            const assigned =
                $("assignedEmployeeId");

            if (assigned) {
                assigned.innerHTML =
                    `<option value="">Select employee</option>`;

                (data.staff || [])
                    .filter(person =>
                        String(person.role || "")
                            .toLowerCase() === "employee"
                    )
                    .forEach(person => {
                        const option =
                            document.createElement("option");

                        option.value = person.id;
                        option.textContent =
                            person.name ||
                            person.username ||
                            "Employee";

                        assigned.appendChild(option);
                    });
            }

        } catch (error) {
            console.error(
                "Document staff error:",
                error
            );

            showError(error.message);
        }
    }

    async function loadSerial() {
        const input =
            $("serialNumber");

        if (!input) return;

        try {
            const data =
                await getJson(
                    "/api/documents/next-serial"
                );

            input.value =
                data.serialLabel ||
                data.serialNumber ||
                "";
        } catch (error) {
            input.value = "";
            console.error(
                "Document serial error:",
                error
            );
        }
    }

    function applyFilters() {
        const search =
            ($("documentSearch")?.value || "")
                .trim()
                .toLowerCase();

        const mode =
            $("documentModeFilter")?.value || "";

        const status =
            $("documentStatusFilter")?.value || "";

        const from =
            $("receiptDateFromFilter")?.value || "";

        const to =
            $("receiptDateToFilter")?.value || "";

        filteredDocuments =
            documents.filter(doc => {

                if (search) {
                    const haystack = [
                        doc.serialLabel,
                        doc.serialNumber,
                        doc.clientName,
                        doc.clientPan,
                        doc.purpose,
                        doc.mode,
                        doc.receivingStaff,
                        doc.deliveringStaff,
                        doc.assignedEmployee
                    ]
                        .join(" ")
                        .toLowerCase();

                    if (!haystack.includes(search)) {
                        return false;
                    }
                }

                if (mode && doc.mode !== mode) {
                    return false;
                }

                if (
                    status === "received" &&
                    doc.dispatchDate
                ) {
                    return false;
                }

                if (
                    status === "dispatched" &&
                    !doc.dispatchDate
                ) {
                    return false;
                }

                if (
                    status === "completed" &&
                    !doc.completionDate
                ) {
                    return false;
                }

                if (
                    from &&
                    (!doc.receiptDate ||
                     doc.receiptDate < from)
                ) {
                    return false;
                }

                if (
                    to &&
                    (!doc.receiptDate ||
                     doc.receiptDate > to)
                ) {
                    return false;
                }

                return true;
            });

        render();
    }

    function render() {
        const body =
            $("documentsTableBody");

        if (!body) return;

        body.innerHTML = "";

        const total =
            $("documentTotal");

        const visible =
            $("documentVisible");

        if (total) {
            total.textContent =
                documents.length;
        }

        if (visible) {
            visible.textContent =
                filteredDocuments.length;
        }

        const empty =
            $("documentsEmpty");

        if (!filteredDocuments.length) {
            if (empty) {
                empty.style.display = "block";
            }
            return;
        }

        if (empty) {
            empty.style.display = "none";
        }

        filteredDocuments.forEach(
            (doc, index) => {

                const tr =
                    document.createElement("tr");

                tr.dataset.id =
                    doc.id;

                tr.innerHTML = `

                    <td>
                        ${esc(
                            doc.serialLabel ||
                            doc.serialNumber ||
                            index + 1
                        )}
                    </td>

                    <td>
                        <strong>
                            ${esc(doc.clientName)}
                        </strong>
                        ${
                            doc.clientPan
                                ? `<div style="font-size:11px;color:#777;margin-top:3px;">
                                    PAN: ${esc(doc.clientPan)}
                                   </div>`
                                : ""
                        }
                    </td>

                    <td>
                        ${esc(doc.purpose)}
                    </td>

                    <td>
                        ${esc(doc.mode)}
                    </td>

                    <td>
                        ${esc(doc.receiptDate)}
                    </td>

                    <td>
                        ${
                            doc.dispatchDate
                                ? esc(doc.dispatchDate)
                                : "—"
                        }
                    </td>

                    <td>
                        <input
                            type="date"
                            class="completion-date-input"
                            value="${esc(
                                doc.completionDate
                            )}"
                            max="${new Date()
                                .toISOString()
                                .slice(0,10)}"
                            aria-label="Date of completion"
                        >
                    </td>

                    <td>
                        ${daysBetween(
                            doc.receiptDate,
                            doc.completionDate ||
                            null
                        )}
                    </td>

                    <td>
                        ${esc(doc.receivingStaff)}
                    </td>

                    <td>
                        ${esc(doc.deliveringStaff)}
                    </td>

                    <td>
                        ${esc(doc.assignedEmployee)}
                    </td>

                    <td>
                        <span class="document-status ${
                            getStatus(doc)
                        }">
                            ${statusLabel(doc)}
                        </span>
                    </td>
                `;

                body.appendChild(tr);
            }
        );

        body
            .querySelectorAll(
                ".completion-date-input"
            )
            .forEach(input => {

                input.addEventListener(
                    "change",
                    async () => {

                        const tr =
                            input.closest("tr");

                        const id =
                            tr?.dataset.id;

                        if (!id) return;

                        const original =
                            documents.find(
                                doc =>
                                    String(doc.id) ===
                                    String(id)
                            );

                        if (!original) return;

                        const value =
                            input.value;

                        if (
                            value &&
                            original.receiptDate &&
                            value <
                                original.receiptDate
                        ) {
                            alert(
                                "Date of completion cannot be earlier than date of receipt."
                            );

                            input.value =
                                original.completionDate || "";

                            return;
                        }

                        if (
                            value &&
                            original.dispatchDate &&
                            value <
                                original.dispatchDate
                        ) {
                            alert(
                                "Date of completion cannot be earlier than date of dispatch."
                            );

                            input.value =
                                original.completionDate || "";

                            return;
                        }

                        try {

                            const data =
                                await getJson(
                                    `/api/documents/${encodeURIComponent(id)}/completion-date`,
                                    {
                                        method: "PATCH",

                                        headers: {
                                            "Content-Type":
                                                "application/json"
                                        },

                                        body:
                                            JSON.stringify({
                                                completionDate:
                                                    value
                                            })
                                    }
                                );

                            const index =
                                documents.findIndex(
                                    doc =>
                                        String(doc.id) ===
                                        String(id)
                                );

                            if (index >= 0) {
                                documents[index] =
                                    data.document;
                            }

                            applyFilters();

                            showSuccess(
                                value
                                    ? "Document marked COMPLETE."
                                    : "Document returned to W.I.P."
                            );

                        } catch (error) {

                            input.value =
                                original.completionDate || "";

                            showError(
                                error.message
                            );
                        }
                    }
                );
            });
    }

    async function loadDocuments() {
        try {
            const data =
                await getJson(
                    "/api/documents"
                );

            documents =
                Array.isArray(data.documents)
                    ? data.documents
                    : [];

            applyFilters();

        } catch (error) {

            console.error(
                "Get documents error:",
                error
            );

            documents = [];
            filteredDocuments = [];

            render();

            showError(
                `Get documents error: ${error.message}`
            );
        }
    }

    async function saveDocument(event) {
        event.preventDefault();

        const button =
            $("saveDocumentButton");

        if (button) {
            button.disabled = true;
            button.textContent = "Saving...";
        }

        try {

            const payload = {

                clientId:
                    $("clientId")?.value || "",

                purpose:
                    $("purpose")?.value || "",

                mode:
                    $("mode")?.value || "",

                receiptDate:
                    $("receiptDate")?.value || "",

                dispatchDate:
                    $("dispatchDate")?.value || "",

                completionDate:
                    $("completionDate")?.value || "",

                receivingStaffId:
                    $("receivingStaffId")?.value || "",

                deliveringStaffId:
                    $("deliveringStaffId")?.value || "",

                assignedEmployeeId:
                    $("assignedEmployeeId")?.value || ""

            };

            const data =
                await getJson(
                    "/api/documents",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(payload)
                    }
                );

            documents.unshift(
                data.document
            );

            applyFilters();

            showSuccess(
                "Document saved successfully."
            );

            $("documentForm")?.reset();

            await loadSerial();

            const dispatch =
                $("dispatchDate");

            if (dispatch) {
                dispatch.disabled = true;
            }

            const completion =
                $("completionDate");

            if (completion) {
                completion.value = "";
            }

        } catch (error) {

            console.error(
                "Create document error:",
                error
            );

            showError(
                error.message
            );

        } finally {

            if (button) {
                button.disabled = false;
                button.textContent =
                    "Save Document";
            }
        }
    }

    function setupMode() {
        const mode =
            $("mode");

        const dispatch =
            $("dispatchDate");

        const help =
            $("dispatchDateHelp");

        if (!mode || !dispatch) return;

        function update() {

            const offline =
                mode.value === "offline";

            dispatch.disabled =
                !offline;

            if (!offline) {
                dispatch.value = "";

                if (help) {
                    help.textContent =
                        mode.value === "online"
                            ? "Dispatch date is not applicable for online documents."
                            : "";
                }

            } else if (help) {
                help.textContent =
                    "Enter the dispatch date for an offline document.";
            }
        }

        mode.addEventListener(
            "change",
            update
        );

        update();
    }

    function exportExcel() {

        if (!filteredDocuments.length) {
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
                (doc, index) => ({
                    "SERIAL NUMBER":
                        doc.serialLabel ||
                        doc.serialNumber,

                    "CLIENT":
                        doc.clientName,

                    "PAN":
                        doc.clientPan,

                    "PURPOSE":
                        doc.purpose,

                    "MODE":
                        doc.mode,

                    "DATE OF RECEIPT":
                        doc.receiptDate,

                    "DATE OF DISPATCH":
                        doc.dispatchDate || "",

                    "DATE OF COMPLETION":
                        doc.completionDate || "",

                    "DAYS":
                        daysBetween(
                            doc.receiptDate,
                            doc.completionDate ||
                            null
                        ),

                    "RECEIVING STAFF":
                        doc.receivingStaff,

                    "DELIVERING STAFF":
                        doc.deliveringStaff,

                    "ASSIGNED EMPLOYEE":
                        doc.assignedEmployee,

                    "STATUS":
                        statusLabel(doc)
                })
            );

        const ws =
            XLSX.utils.json_to_sheet(rows);

        const wb =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            wb,
            ws,
            "Documents"
        );

        XLSX.writeFile(
            wb,
            "Office-Documents.xlsx"
        );
    }

    function exportPdf() {

        if (!filteredDocuments.length) {
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
                    doc => [
                        doc.serialLabel ||
                            doc.serialNumber,

                        doc.clientName,

                        doc.purpose,

                        doc.mode,

                        doc.receiptDate,

                        doc.dispatchDate || "",

                        doc.completionDate || "",

                        daysBetween(
                            doc.receiptDate,
                            doc.completionDate ||
                            null
                        ),

                        statusLabel(doc)
                    ]
                ),

            styles: {
                fontSize: 7,
                cellPadding: 2
            }
        });

        pdf.save(
            "Office-Documents.pdf"
        );
    }

    document.addEventListener(
        "DOMContentLoaded",
        async () => {

            $("documentForm")
                ?.addEventListener(
                    "submit",
                    saveDocument
                );

            $("documentSearch")
                ?.addEventListener(
                    "input",
                    applyFilters
                );

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

            setupMode();

            await Promise.all([
                loadClients(),
                loadStaff(),
                loadSerial()
            ]);

            await loadDocuments();
        }
    );

})();
