(() => {
    "use strict";

    const API = "/api/billing";

    let billingRecords = [];
    let eligibleTasks = [];
    let editingId = null;

    const $ = id => document.getElementById(id);

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function money(value) {
        const number = Number(value || 0);
        return "₹" + number.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function today() {
        const d = new Date();
        const offset = d.getTimezoneOffset();
        return new Date(d.getTime() - offset * 60000)
            .toISOString()
            .slice(0, 10);
    }

    function formatDate(value) {
        if (!value) return "—";
        const parts = String(value).slice(0, 10).split("-");
        if (parts.length !== 3) return value;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    async function request(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            cache: "no-store",
            ...options,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        let result = {};
        try {
            result = await response.json();
        } catch (_) {
            throw new Error("Server returned an invalid response.");
        }

        if (!response.ok || result.success === false) {
            throw new Error(
                result.message ||
                `Request failed (${response.status}).`
            );
        }

        return result;
    }

    function showError(message) {
        $("billingSuccess").hidden = true;
        $("billingError").hidden = false;
        $("billingError").textContent = message;
    }

    function showSuccess(message) {
        $("billingError").hidden = true;
        $("billingSuccess").hidden = false;
        $("billingSuccess").textContent = message;

        setTimeout(() => {
            $("billingSuccess").hidden = true;
        }, 3000);
    }

    function clearMessages() {
        $("billingError").hidden = true;
        $("billingSuccess").hidden = true;
    }

    function getStatus(record) {
        const chargeable = Number(record.chargeableAmount || 0);
        const amount = Number(record.amount || 0);
        const advance = Number(record.advanceAmount || 0);
        const balance = Math.max(
            0,
            chargeable - amount - advance
        );

        if (chargeable > 0 && balance === 0) {
            return "paid";
        }

        if (amount + advance > 0) {
            return "partial";
        }

        return "pending";
    }

    function statusText(status) {
        if (status === "paid") return "Paid";
        if (status === "partial") return "Partially Paid";
        return "Pending";
    }

    function calculateBalance() {
        const chargeable = Number($("chargeableAmount").value || 0);
        const amount = Number($("amount").value || 0);
        const advance = Number($("advanceAmount").value || 0);

        const balance = Math.max(
            0,
            chargeable - amount - advance
        );

        const balanceInput = $("balanceAmount");
        const statusTextEl = $("paymentStatus");
        const field = document.querySelector(".balance-field");

        if (!chargeable) {
            balanceInput.value = "";
            balanceInput.placeholder = "—";
            field.classList.remove("paid");
            statusTextEl.textContent =
                "Enter the chargeable amount.";
            return;
        }

        balanceInput.value =
            balance === 0 ? "" : money(balance);
        balanceInput.placeholder =
            balance === 0 ? "—" : "";

        if (balance === 0) {
            field.classList.add("paid");
            statusTextEl.textContent = "Paid in full.";
        } else if (amount + advance > 0) {
            field.classList.remove("paid");
            statusTextEl.textContent =
                `${money(balance)} still outstanding.`;
        } else {
            field.classList.remove("paid");
            statusTextEl.textContent =
                "No payment recorded yet.";
        }
    }

    function populateEligibleTasks(selectedId = "") {
        const select = $("billingTask");

        select.innerHTML = `
            <option value="">Select completed billable task</option>
        `;

        eligibleTasks
            .filter(task =>
                !task.alreadyBilled ||
                (
                    editingId &&
                    task.billingId &&
                    String(task.billingId) === String(editingId)
                )
            )
            .forEach(task => {
                const option = document.createElement("option");
                option.value = task.id;
                option.textContent =
                    `${task.title} — ${task.clientName || "No client"}`;
                option.dataset.clientId = task.clientId || "";
                select.appendChild(option);
            });

        if (selectedId) {
            select.value = selectedId;
        }

        if (!eligibleTasks.length) {
            select.innerHTML = `
                <option value="">
                    No completed billable tasks available
                </option>
            `;
            select.disabled = true;
            $("taskEligibilityMessage").textContent =
                "A task appears here only after it is marked Complete and Billable.";
        } else {
            select.disabled = false;
            $("taskEligibilityMessage").textContent =
                `${eligibleTasks.length} completed billable task(s) available.`;
        }
    }

    function applyTaskToForm() {
        const taskId = $("billingTask").value;
        const task = eligibleTasks.find(
            item => String(item.id) === String(taskId)
        );

        if (!task) {
            $("billingClient").value = "";
            return;
        }

        $("billingClient").value =
            task.clientName || "—";

        if (!editingId) {
            $("chargeableAmount").value =
                task.chargeableAmount ?? "";
        }
    }

    async function loadEligibleTasks() {
        const result = await request(
            `${API}/eligible-tasks`
        );

        eligibleTasks =
            Array.isArray(result.tasks)
                ? result.tasks
                : [];

        populateEligibleTasks();
    }

    async function loadNextSerial() {
        const result = await request(
            `${API}/next-serial`
        );

        return result.serialNumber;
    }

    async function loadBilling() {
        const result = await request(API);

        billingRecords =
            Array.isArray(result.records)
                ? result.records
                : [];

        renderTable();
        updateSummary();
    }

    function getFilteredRecords() {
        const search =
            $("billingSearch").value.trim().toLowerCase();

        const from =
            $("billingDateFrom").value;

        const to =
            $("billingDateTo").value;

        return billingRecords.filter(record => {
            const searchable = [
                record.serialNumber,
                record.clientName,
                record.pan,
                record.taskName
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            if (
                search &&
                !searchable.includes(search)
            ) {
                return false;
            }

            const date =
                String(record.receiptDate || "");

            if (from && date < from) {
                return false;
            }

            if (to && date > to) {
                return false;
            }

            return true;
        });
    }

    function renderTable() {
        const tbody = $("billingTableBody");
        const records = getFilteredRecords();

        if (!records.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="13" class="empty-cell">
                        No billing records found.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = records.map(record => {
            const status = getStatus(record);
            const balance = Number(record.balance || 0);

            return `
                <tr>
                    <td>
                        <strong>${escapeHtml(record.serialNumber)}</strong>
                    </td>

                    <td>
                        <strong>${escapeHtml(record.clientName || "—")}</strong>
                        ${
                            record.pan
                                ? `<small>PAN: ${escapeHtml(record.pan)}</small>`
                                : ""
                        }
                    </td>

                    <td>
                        ${escapeHtml(record.taskName || "—")}
                    </td>

                    <td>
                        ${money(record.chargeableAmount)}
                    </td>

                    <td>
                        ${formatDate(record.receiptDate)}
                    </td>

                    <td>
                        ${money(record.amount)}
                    </td>

                    <td>
                        ${record.paymentMode
                            ? escapeHtml(
                                record.paymentMode.charAt(0).toUpperCase() +
                                record.paymentMode.slice(1)
                              )
                            : "—"}
                    </td>

                    <td>
                        ${formatDate(record.advancePaymentDate)}
                    </td>

                    <td>
                        ${money(record.advanceAmount)}
                    </td>

                    <td>
                        ${record.advancePaymentMode
                            ? escapeHtml(
                                record.advancePaymentMode.charAt(0).toUpperCase() +
                                record.advancePaymentMode.slice(1)
                              )
                            : "—"}
                    </td>

                    <td class="${balance > 0 ? "balance-due" : "balance-zero"}">
                        ${balance > 0 ? money(balance) : "—"}
                    </td>

                    <td>
                        <span class="status ${status}">
                            ${statusText(status)}
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="edit-billing"
                            data-id="${escapeHtml(record.id)}"
                        >
                            Edit
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function updateSummary() {
        const records = getFilteredRecords();

        const charged = records.reduce(
            (sum, r) => sum + Number(r.chargeableAmount || 0),
            0
        );

        const received = records.reduce(
            (sum, r) =>
                sum +
                Number(r.amount || 0) +
                Number(r.advanceAmount || 0),
            0
        );

        const outstanding = records.reduce(
            (sum, r) => sum + Number(r.balance || 0),
            0
        );

        $("billingTotal").textContent = records.length;
        $("billingCharged").textContent = money(charged);
        $("billingReceived").textContent = money(received);
        $("billingOutstanding").textContent =
            outstanding > 0 ? money(outstanding) : "—";
    }

    function resetForm() {
        editingId = null;

        $("billingForm").reset();

        $("billingId").value = "";
        $("receiptDate").value = today();
        $("amount").value = "0";
        $("advanceAmount").value = "0";

        $("saveBilling").textContent =
            "Save Billing Record";

        $("cancelBillingEdit").hidden = true;

        $("billingTask").disabled =
            eligibleTasks.length === 0;

        populateEligibleTasks();

        calculateBalance();
        clearMessages();
    }

    function editRecord(id) {
        const record =
            billingRecords.find(
                item => String(item.id) === String(id)
            );

        if (!record) {
            return;
        }

        editingId = record.id;

        populateEligibleTasks(record.taskId);

        $("billingId").value = record.id;
        $("billingTask").value = record.taskId;
        $("billingClient").value = record.clientName || "";
        $("chargeableAmount").value =
            record.chargeableAmount ?? "";
        $("receiptDate").value =
            record.receiptDate || today();
        $("amount").value =
            record.amount ?? 0;
        $("paymentMode").value =
            record.paymentMode || "";
        $("advancePaymentDate").value =
            record.advancePaymentDate || "";
        $("advanceAmount").value =
            record.advanceAmount ?? 0;
        $("advancePaymentMode").value =
            record.advancePaymentMode || "";

        $("saveBilling").textContent =
            "Update Billing Record";

        $("cancelBillingEdit").hidden = false;

        calculateBalance();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    async function saveBilling(event) {
        event.preventDefault();

        clearMessages();

        const chargeable =
            Number($("chargeableAmount").value || 0);

        const amount =
            Number($("amount").value || 0);

        const advance =
            Number($("advanceAmount").value || 0);

        if (chargeable < 0) {
            showError("Chargeable amount cannot be negative.");
            return;
        }

        if (amount < 0 || advance < 0) {
            showError("Payment amounts cannot be negative.");
            return;
        }

        if (amount + advance > chargeable) {
            showError(
                "Amount received plus advance cannot exceed the chargeable amount."
            );
            return;
        }

        if (amount > 0 && !$("paymentMode").value) {
            showError("Please select the payment mode.");
            return;
        }

        if (advance > 0) {
            if (!$("advancePaymentDate").value) {
                showError("Please enter the advance payment date.");
                return;
            }

            if (!$("advancePaymentMode").value) {
                showError("Please select the advance payment mode.");
                return;
            }
        }

        const taskId = $("billingTask").value;

        if (!taskId) {
            showError(
                "Select a completed billable task."
            );
            return;
        }

        const payload = {
            taskId,
            chargeableAmount: chargeable,
            receiptDate: $("receiptDate").value,
            amount,
            paymentMode:
                $("paymentMode").value || null,
            advancePaymentDate:
                $("advancePaymentDate").value || null,
            advanceAmount: advance,
            advancePaymentMode:
                $("advancePaymentMode").value || null
        };

        const button = $("saveBilling");
        button.disabled = true;
        button.textContent =
            editingId
                ? "Updating..."
                : "Saving...";

        try {
            if (editingId) {
                await request(
                    `${API}/${encodeURIComponent(editingId)}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(payload)
                    }
                );

                showSuccess(
                    "Billing record updated successfully."
                );
            } else {
                await request(API, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                showSuccess(
                    "Billing record created successfully."
                );
            }

            resetForm();

            await Promise.all([
                loadEligibleTasks(),
                loadBilling()
            ]);
        } catch (error) {
            console.error("Billing save error:", error);
            showError(error.message);
        } finally {
            button.disabled = false;
            button.textContent =
                editingId
                    ? "Update Billing Record"
                    : "Save Billing Record";
        }
    }

    function exportExcel() {
        const records = getFilteredRecords();

        if (!records.length) {
            showError("No billing records are available to export.");
            return;
        }

        if (typeof XLSX === "undefined") {
            showError("Excel export library is not loaded.");
            return;
        }

        const rows = records.map(record => ({
            "Serial Number": record.serialNumber || "",
            "Name": record.clientName || "",
            "PAN": record.pan || "",
            "Name of Task": record.taskName || "",
            "Chargeable Amount": Number(record.chargeableAmount || 0),
            "Date of Receipt": record.receiptDate || "",
            "Amount": Number(record.amount || 0),
            "Mode": record.paymentMode || "",
            "Date of Advance Payment": record.advancePaymentDate || "",
            "Advance Paid Amount": Number(record.advanceAmount || 0),
            "Advance Payment Mode": record.advancePaymentMode || "",
            "Balance": Number(record.balance || 0),
            "Status": statusText(getStatus(record))
        }));

        const worksheet =
            XLSX.utils.json_to_sheet(rows);

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Billing Record"
        );

        XLSX.writeFile(
            workbook,
            `billing-record-${today()}.xlsx`
        );
    }

    function exportPdf() {
        const records = getFilteredRecords();

        if (!records.length) {
            showError("No billing records are available to export.");
            return;
        }

        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {
            showError("PDF export library is not loaded.");
            return;
        }

        const doc =
            new window.jspdf.jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
            });

        doc.setFontSize(17);
        doc.text(
            "CA Office - Billing Record",
            12,
            14
        );

        doc.setFontSize(8);
        doc.text(
            `Generated: ${new Date().toLocaleString("en-IN")}`,
            12,
            20
        );

        const rows = records.map(record => [
            record.serialNumber || "",
            record.clientName || "",
            record.taskName || "",
            money(record.chargeableAmount),
            formatDate(record.receiptDate),
            money(record.amount),
            record.paymentMode || "—",
            formatDate(record.advancePaymentDate),
            money(record.advanceAmount),
            record.advancePaymentMode || "—",
            Number(record.balance || 0) > 0
                ? money(record.balance)
                : "—",
            statusText(getStatus(record))
        ]);

        doc.autoTable({
            startY: 25,
            head: [[
                "Serial",
                "Name",
                "Task",
                "Chargeable",
                "Receipt",
                "Amount",
                "Mode",
                "Advance Date",
                "Advance",
                "Advance Mode",
                "Balance",
                "Status"
            ]],
            body: rows,
            styles: {
                fontSize: 6.5,
                cellPadding: 2,
                overflow: "linebreak"
            },
            headStyles: {
                fontSize: 6.5,
                fontStyle: "bold"
            },
            margin: {
                left: 8,
                right: 8
            }
        });

        doc.save(
            `billing-record-${today()}.pdf`
        );
    }

    function bindEvents() {
        $("billingTask").addEventListener(
            "change",
            applyTaskToForm
        );

        [
            "chargeableAmount",
            "amount",
            "advanceAmount"
        ].forEach(id => {
            $(id).addEventListener(
                "input",
                calculateBalance
            );
        });

        $("billingForm").addEventListener(
            "submit",
            saveBilling
        );

        $("cancelBillingEdit").addEventListener(
            "click",
            resetForm
        );

        $("billingSearch").addEventListener(
            "input",
            () => {
                renderTable();
                updateSummary();
            }
        );

        $("billingDateFrom").addEventListener(
            "change",
            () => {
                renderTable();
                updateSummary();
            }
        );

        $("billingDateTo").addEventListener(
            "change",
            () => {
                renderTable();
                updateSummary();
            }
        );

        $("resetBillingFilters").addEventListener(
            "click",
            () => {
                $("billingSearch").value = "";
                $("billingDateFrom").value = "";
                $("billingDateTo").value = "";
                renderTable();
                updateSummary();
            }
        );

        $("billingTableBody").addEventListener(
            "click",
            event => {
                const button =
                    event.target.closest(
                        "[data-id]"
                    );

                if (!button) return;

                editRecord(
                    button.dataset.id
                );
            }
        );

        $("exportBillingExcel").addEventListener(
            "click",
            exportExcel
        );

        $("exportBillingPdf").addEventListener(
            "click",
            exportPdf
        );
    }

    async function init() {
        $("receiptDate").value = today();

        bindEvents();
        calculateBalance();

        try {
            await Promise.all([
                loadEligibleTasks(),
                loadBilling()
            ]);

            const serial = await loadNextSerial();
            if (serial) {
                $("taskEligibilityMessage").textContent +=
                    ` Next billing serial: ${serial}.`;
            }
        } catch (error) {
            console.error(
                "Billing initialization error:",
                error
            );

            showError(
                error.message ||
                "Unable to load billing data."
            );
        }
    }

    document.addEventListener(
        "DOMContentLoaded",
        init
    );
})();
