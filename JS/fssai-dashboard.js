(() => {
  "use strict";

  const state = {
    year: new Date().getFullYear(),
    records: [],
    filtered: []
  };

  const $ = id => document.getElementById(id);

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#039;"
    }[c]));
  }

  function getStatus(record) {
    return record.dateOfExpiry ? "ACTIVE" : "EXPIRED";
  }

  function populateYears() {
    const select = $("fssaiYear");
    const now = new Date().getFullYear();
    select.innerHTML = "";

    for (let y = now + 1; y >= now - 5; y--) {
      const option = document.createElement("option");
      option.value = y;
      option.textContent = y;
      select.appendChild(option);
    }

    select.value = String(state.year);
  }

  function applyFilters() {
    const search = $("fssaiSearch").value.trim().toLowerCase();
    const status = $("fssaiStatusFilter").value;

    state.filtered = state.records.filter(record => {
      if (
        search &&
        !String(record.fssaiNumber || "").toLowerCase().includes(search)
      ) return false;

      if (status && getStatus(record) !== status) return false;

      return true;
    });

    render();
  }

  function render() {
    const body = $("fssaiTableBody");
    body.innerHTML = "";

    $("fssaiTotalCount").textContent = state.records.length;
    $("fssaiVisibleCount").textContent = state.filtered.length;
    $("fssaiYearLabel").textContent = state.year;

    if (!state.filtered.length) {
      $("fssaiTableWrap").style.display = "none";
      $("fssaiEmpty").style.display = "block";
      return;
    }

    $("fssaiEmpty").style.display = "none";
    $("fssaiTableWrap").style.display = "block";

    state.filtered.forEach((record, index) => {
      const tr = document.createElement("tr");
      tr.dataset.id = record.id;

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td class="fssai-number">${esc(record.fssaiNumber)}</td>
        <td>
          <input type="date" data-field="dateOfExpiry"
                 value="${esc(record.dateOfExpiry)}">
        </td>
        <td>
          <input type="date" data-field="renewalDate"
                 value="${esc(record.renewalDate)}">
        </td>
        <td>
          <input type="date" data-field="newExpiryDate"
                 value="${esc(record.newExpiryDate)}">
        </td>
        <td class="fssai-status ${getStatus(record).toLowerCase()}">
          ${getStatus(record)}
        </td>
      `;

      body.appendChild(tr);
    });

    body.querySelectorAll("input[data-field]").forEach(input => {
      input.addEventListener("change", () => {
        const id = input.closest("tr").dataset.id;
        const record = state.records.find(item => item.id === id);
        if (!record) return;

        record[input.dataset.field] = input.value;
        applyFilters();
      });
    });
  }

  async function load(year) {
    $("fssaiLoading").style.display = "block";
    $("fssaiEmpty").style.display = "none";
    $("fssaiError").style.display = "none";

    try {
      const response = await fetch(
        `/api/fssai-dashboard?year=${encodeURIComponent(year)}`,
        {
          credentials: "same-origin",
          cache: "no-store"
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load FSSAI records."
        );
      }

      state.year = Number(data.year);
      state.records = Array.isArray(data.records) ? data.records : [];

      $("fssaiYear").value = String(state.year);
      $("fssaiLoading").style.display = "none";

      applyFilters();
    } catch (error) {
      console.error("FSSAI LOAD ERROR:", error);

      $("fssaiLoading").style.display = "none";
      $("fssaiTableWrap").style.display = "none";
      $("fssaiEmpty").style.display = "block";
      $("fssaiError").textContent = error.message;
      $("fssaiError").style.display = "block";
    }
  }

  async function saveAll() {
    const button = $("fssaiSaveAll");
    button.disabled = true;
    button.textContent = "Saving...";
    $("fssaiError").style.display = "none";

    try {
      const response = await fetch("/api/fssai-dashboard/bulk", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          year: state.year,
          records: state.records
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to save FSSAI records."
        );
      }

      state.records = Array.isArray(data.records)
        ? data.records
        : state.records;

      applyFilters();
      showToast("FSSAI records saved successfully.");
    } catch (error) {
      console.error("FSSAI SAVE ERROR:", error);
      $("fssaiError").textContent = error.message;
      $("fssaiError").style.display = "block";
    } finally {
      button.disabled = false;
      button.textContent = "Save All";
    }
  }

  function showToast(message) {
    const toast = $("fssaiToast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  function exportExcel() {
    if (!state.filtered.length) {
      alert("No records match the current filters.");
      return;
    }

    if (!window.XLSX) {
      alert("Excel export library is not available.");
      return;
    }

    const rows = state.filtered.map((record, index) => ({
      "SR. NO.": index + 1,
      "FSSAI NUMBER": record.fssaiNumber,
      "DATE OF EXPIRY": record.dateOfExpiry || "",
      "RENEWAL DATE": record.renewalDate || "",
      "NEW EXPIRY DATE": record.newExpiryDate || "",
      "STATUS": getStatus(record),
      "YEAR": state.year
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "FSSAI"
    );

    XLSX.writeFile(
      workbook,
      `FSSAI-${state.year}.xlsx`
    );
  }

  function exportPdf() {
    if (!state.filtered.length) {
      alert("No records match the current filters.");
      return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("PDF export library is not available.");
      return;
    }

    const pdf = new window.jspdf.jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    pdf.setFontSize(16);
    pdf.text(
      `FSSAI Dashboard - ${state.year}`,
      10,
      14
    );

    if (typeof pdf.autoTable !== "function") {
      alert("PDF table library is not available.");
      return;
    }

    pdf.autoTable({
      startY: 22,
      head: [[
        "SR. NO.",
        "FSSAI NUMBER",
        "DATE OF EXPIRY",
        "RENEWAL DATE",
        "NEW EXPIRY DATE",
        "STATUS"
      ]],
      body: state.filtered.map((record, index) => [
        index + 1,
        record.fssaiNumber,
        record.dateOfExpiry || "",
        record.renewalDate || "",
        record.newExpiryDate || "",
        getStatus(record)
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 2
      }
    });

    pdf.save(`FSSAI-${state.year}.pdf`);
  }

  document.addEventListener("DOMContentLoaded", () => {
    populateYears();

    $("fssaiYear").addEventListener("change", () => {
      state.year = Number($("fssaiYear").value);
      load(state.year);
    });

    $("fssaiSearch").addEventListener("input", applyFilters);
    $("fssaiStatusFilter").addEventListener("change", applyFilters);
    $("fssaiSaveAll").addEventListener("click", saveAll);
    $("fssaiExportExcel").addEventListener("click", exportExcel);
    $("fssaiExportPdf").addEventListener("click", exportPdf);

    load(state.year);
  });
})();
