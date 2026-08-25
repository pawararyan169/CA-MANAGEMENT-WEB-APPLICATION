(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  let records = [], filtered = [], currentMonth = '';

  const STATUS = [
    'DOCUMENT NOT RECIEVED',
    'DOCUMENT RECIEVED',
    'GSTR -1/ IFF PENDING',
    'TAX PENDING',
    '3B FILING PENDING',
    'FILING PENDING',
    'SET PENDING',
    'TRANSFERED TO BILLING'
  ];

  const esc = v => String(v ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  function getStatus(r) {
    if (r.setDate) return STATUS[7];
    if (r.filingDate) return STATUS[6];
    if (r.threeBFilingDate) return STATUS[5];
    if (r.taxPaymentDate) return STATUS[4];
    if (r.gstr1FilingDate || r.iffFilingDate) return STATUS[3];
    if (r.workingDate) return STATUS[2];
    if (r.documentReceivedDate) return STATUS[1];
    return STATUS[0];
  }

  function input(type, v, field) {
    return `<input type="${type}" data-field="${field}" value="${esc(v)}">`;
  }

  function select(field, v, opts) {
    return `<select data-field="${field}">${opts.map(o =>
      `<option value="${o}" ${o === v ? 'selected' : ''}>${o}</option>`
    ).join('')}</select>`;
  }

  function render() {
    const body = $('gstTableBody');
    if (!body) return;

    body.innerHTML = '';
    $('gstTotal').textContent = records.length;
    $('gstVisible').textContent = filtered.length;
    $('gstTable').style.display = filtered.length ? 'block' : 'none';
    $('gstEmpty').style.display = filtered.length ? 'none' : 'block';

    filtered.forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.dataset.id = r.id;

      tr.innerHTML = `
        <td class="readonly">${i + 1}</td>
        <td class="readonly">${esc(r.gstName)}</td>
        <td class="readonly gstin">${esc(r.gstNumber)}</td>
        <td>${input('text', r.tradeName, 'tradeName')}</td>
        <td>${input('date', r.effectiveFrom, 'effectiveFrom')}</td>
        <td>${select('registrationType', r.registrationType, ['REGULAR','COMPOSITION'])}</td>
        <td>${select('filingFrequency', r.filingFrequency, ['MONTHLY','QUARTERLY'])}</td>
        <td>${input('date', r.documentReceivedDate, 'documentReceivedDate')}</td>
        <td>${input('date', r.workingDate, 'workingDate')}</td>
        <td class="gstr-iff-cell">
          ${input('date', r.gstr1FilingDate, 'gstr1FilingDate')}
          <span>/</span>
          ${input('date', r.iffFilingDate, 'iffFilingDate')}
        </td>
        <td>${input('date', r.taxPaymentDate, 'taxPaymentDate')}</td>
        <td>${input('date', r.threeBFilingDate, 'threeBFilingDate')}</td>
        <td>${input('date', r.filingDate, 'filingDate')}</td>
        <td>${input('date', r.setDate, 'setDate')}</td>
        <td class="status">${esc(getStatus(r))}</td>`;
      body.appendChild(tr);
    });
  }

  function syncRowToRecord(tr) {
    const r = records.find(x => x.id === tr.dataset.id);
    if (!r) return null;
    tr.querySelectorAll('[data-field]').forEach(el => {
      r[el.dataset.field] = el.value || '';
    });
    tr.querySelector('.status').textContent = getStatus(r);
    return r;
  }

  function applyFilters() {
    const q = ($('gstSearch')?.value || '').trim().toLowerCase();
    const reg = $('gstRegistrationFilter')?.value || '';
    const freq = $('gstFrequencyFilter')?.value || '';
    const status = $('gstStatusFilter')?.value || '';
    const billing = $('gstBillingFilter')?.value || '';

    filtered = records.filter(r => {
      if (q && ![r.gstName, r.gstNumber, r.tradeName].join(' ').toLowerCase().includes(q)) return false;
      if (reg && r.registrationType !== reg) return false;
      if (freq && r.filingFrequency !== freq) return false;
      if (status && getStatus(r) !== status) return false;
      if (billing === 'YES' && !r.setDate) return false;
      if (billing === 'NO' && r.setDate) return false;
      return true;
    });
    render();
  }

  async function load(month) {
    $('gstLoading').style.display = 'block';
    $('gstError').style.display = 'none';
    try {
      const res = await fetch(`/api/gst-dashboard?month=${encodeURIComponent(month)}`, {
        credentials: 'same-origin', cache: 'no-store'
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Unable to load GST records.');
      records = data.rows || [];
      currentMonth = data.month;
      $('gstMonth').value = currentMonth;
      if ($('gstMonthLabel')) $('gstMonthLabel').textContent = currentMonth;
      applyFilters();
    } catch (e) {
      records = []; filtered = []; render();
      $('gstError').textContent = e.message;
      $('gstError').style.display = 'block';
    } finally {
      $('gstLoading').style.display = 'none';
    }
  }

  async function saveAll() {
    // Capture edits from all currently rendered rows.
    $('gstTableBody')?.querySelectorAll('tr').forEach(syncRowToRecord);

    const btn = $('gstSaveAll');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
    $('gstError').style.display = 'none';

    try {
      const res = await fetch('/api/gst-dashboard/bulk', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({month: currentMonth, rows: records})
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Unable to save GST records.');
      records = data.rows || records;
      applyFilters();
      const toast = $('gstToast');
      if (toast) {
        toast.textContent = 'All GST records saved successfully.';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2200);
      }
    } catch (e) {
      $('gstError').textContent = e.message;
      $('gstError').style.display = 'block';
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Save All'; }
    }
  }

  function exportCsv() {
    if (!filtered.length) return;
    const headers = [
      'SR NO.','GST NAME','GST NUMBER','TRADE NAME','W.E.F','TYPE','FILING FREQUENCY',
      'DOCUMENT RECEIVED DATE','WORKING DATE','GSTR-1 / IFF','TAX PAYMENT DATE',
      '3B FILING DATE','FILING DATE','SET DATE','STATUS','MONTH'
    ];
    const q = v => `"${String(v ?? '').replaceAll('"','""')}"`;
    const rows = filtered.map((r,i) => [
      i+1,r.gstName,r.gstNumber,r.tradeName,r.effectiveFrom,r.registrationType,
      r.filingFrequency,r.documentReceivedDate,r.workingDate,
      `${r.gstr1FilingDate || ''} / ${r.iffFilingDate || ''}`,
      r.taxPaymentDate,r.threeBFilingDate,r.filingDate,r.setDate,getStatus(r),currentMonth
    ]);
    const blob = new Blob([[headers,...rows].map(a=>a.map(q).join(',')).join('\r\n')], {type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`GST_${currentMonth}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    if ($('gstMonth')) $('gstMonth').value = month;

    $('gstMonth')?.addEventListener('change', () => load($('gstMonth').value));
    ['gstSearch','gstRegistrationFilter','gstFrequencyFilter','gstStatusFilter','gstBillingFilter']
      .forEach(id => $(id)?.addEventListener('input', applyFilters));
    $('gstExport')?.addEventListener('click', exportCsv);
    $('gstSaveAll')?.addEventListener('click', saveAll);

    $('gstCurrentMonth')?.addEventListener('click', () => {
      const d=new Date();
      const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      $('gstMonth').value=m; load(m);
    });

    $('gstTableBody')?.addEventListener('input', e => {
      const tr=e.target.closest('tr'); if (tr) syncRowToRecord(tr);
    });
    $('gstTableBody')?.addEventListener('change', e => {
      const tr=e.target.closest('tr'); if (tr) syncRowToRecord(tr);
    });

    load(month);
  });
})();