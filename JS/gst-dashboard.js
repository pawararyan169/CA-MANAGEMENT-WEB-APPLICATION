(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let records = [], filtered = [], currentMonth = '';

  const STATUS = ['DOCUMENT NOT RECIEVED','DOCUMENT RECIEVED','GSTR -1/ IFF PENDING','TAX PENDING','FILING PENDING','SET PENDING','TRANSFERED TO BILLING'];
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const value = (row, field) => row.querySelector(`[data-field="${field}"]`)?.value || '';

  function getStatus(r) {
    if (r.setDate) return STATUS[6];
    if (r.filingDate) return STATUS[5];
    if (r.taxPaymentDate) return STATUS[4];
    if (r.gstr1FilingDate || r.iffFilingDate) return STATUS[3];
    if (r.workingDate) return STATUS[2];
    if (r.documentReceivedDate) return STATUS[1];
    return STATUS[0];
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
        <td>${input('text',r.tradeName,'tradeName')}</td>
        <td>${input('date',r.effectiveFrom,'effectiveFrom')}</td>
        <td>${select('registrationType',r.registrationType,['REGULAR','COMPOSITION'])}</td>
        <td>${select('filingFrequency',r.filingFrequency,['MONTHLY','QUARTERLY'])}</td>
        <td>${input('date',r.documentReceivedDate,'documentReceivedDate')}</td>
        <td>${input('date',r.workingDate,'workingDate')}</td>
        <td>${input('date',r.gstr1FilingDate,'gstr1FilingDate')}</td>
        <td>${input('date',r.iffFilingDate,'iffFilingDate')}</td>
        <td>${input('date',r.taxPaymentDate,'taxPaymentDate')}</td>
        <td>${input('date',r.filingDate,'filingDate')}</td>
        <td>${input('date',r.setDate,'setDate')}</td>
        <td class="status">${esc(getStatus(r))}</td>
        <td><button class="save-btn" type="button">Save</button></td>`;
      body.appendChild(tr);
    });
  }
  function input(type,v,field){ return `<input type="${type}" data-field="${field}" value="${esc(v)}">`; }
  function select(field,v,opts){ return `<select data-field="${field}">${opts.map(o=>`<option value="${o}" ${o===v?'selected':''}>${o}</option>`).join('')}</select>`; }

  function applyFilters(){
    const q = $('gstSearch').value.trim().toLowerCase();
    const reg = $('gstRegistrationFilter').value;
    const freq = $('gstFrequencyFilter').value;
    const status = $('gstStatusFilter').value;
    const billing = $('gstBillingFilter').value;
    filtered = records.filter(r => {
      if(q && ![r.gstName,r.gstNumber,r.tradeName].join(' ').toLowerCase().includes(q)) return false;
      if(reg && r.registrationType !== reg) return false;
      if(freq && r.filingFrequency !== freq) return false;
      if(status && getStatus(r) !== status) return false;
      if(billing === 'YES' && !r.setDate) return false;
      if(billing === 'NO' && r.setDate) return false;
      return true;
    });
    render();
  }

  function readRow(tr){
    const old = records.find(r=>r.id===tr.dataset.id); if(!old) return null;
    return {...old,
      tradeName:value(tr,'tradeName'), effectiveFrom:value(tr,'effectiveFrom'),
      registrationType:value(tr,'registrationType'), filingFrequency:value(tr,'filingFrequency'),
      documentReceivedDate:value(tr,'documentReceivedDate'), workingDate:value(tr,'workingDate'),
      gstr1FilingDate:value(tr,'gstr1FilingDate'), iffFilingDate:value(tr,'iffFilingDate'), taxPaymentDate:value(tr,'taxPaymentDate'),
      filingDate:value(tr,'filingDate'), setDate:value(tr,'setDate')};
  }

  async function load(month){
    $('gstLoading').style.display='block'; $('gstError').style.display='none';
    try{
      const res=await fetch(`/api/gst-dashboard?month=${encodeURIComponent(month)}`,{credentials:'same-origin',cache:'no-store'});
      const data=await res.json(); if(!res.ok||!data.success) throw new Error(data.message||'Unable to load GST records.');
      records=data.rows||[]; currentMonth=data.month; $('gstMonth').value=currentMonth; applyFilters();
    }catch(e){ records=[]; filtered=[]; render(); $('gstError').textContent=e.message; $('gstError').style.display='block'; }
    finally{ $('gstLoading').style.display='none'; }
  }

  async function save(tr){
    const r=readRow(tr);
    if(!r) return;

    const btn=tr.querySelector('.save-btn');
    if(!btn) return;

    const originalText=btn.textContent;
    btn.disabled=true;
    btn.textContent='Saving...';

    try{
      const res=await fetch(
        `/api/gst-dashboard/${encodeURIComponent(r.id)}`,
        {
          method:'PATCH',
          credentials:'same-origin',
          cache:'no-store',
          headers:{
            'Content-Type':'application/json',
            'Accept':'application/json'
          },
          body:JSON.stringify(r)
        }
      );

      const data=await res.json();

      if(!res.ok || !data.success){
        throw new Error(
          data.message || `Unable to save GST record. (HTTP ${res.status})`
        );
      }

      const i=records.findIndex(x=>x.id===r.id);

      if(i>=0){
        records[i]=data.row;
      }

      $('gstError').style.display='none';
      applyFilters();

      // Brief visual confirmation.
      const savedRow = $('gstTableBody').querySelector(
        `tr[data-id="${CSS.escape(r.id)}"]`
      );

      if(savedRow){
        savedRow.classList.add('saved');
        setTimeout(()=>savedRow.classList.remove('saved'),1200);
      }

    }catch(e){
      console.error('GST save error:',e);
      $('gstError').textContent=e.message || 'Unable to save GST record.';
      $('gstError').style.display='block';
    }finally{
      btn.disabled=false;
      btn.textContent=originalText;
    }
  }

  function exportCsv(){
    if(!filtered.length) return;
    const headers=['SR NO.','GST NAME','GST NUMBER','TRADE NAME','W.E.F','TYPE','FILING FREQUENCY','DOCUMENT RECEIVED DATE','WORKING DATE','GSTR-1 FILING DATE','IFF FILING DATE','TAX PAYMENT DATE','FILING DATE','SET DATE','STATUS','MONTH'];
    const q=v=>`"${String(v??'').replaceAll('"','""')}"`;
    const rows=filtered.map((r,i)=>[i+1,r.gstName,r.gstNumber,r.tradeName,r.effectiveFrom,r.registrationType,r.filingFrequency,r.documentReceivedDate,r.workingDate,r.gstr1FilingDate,r.iffFilingDate,r.taxPaymentDate,r.filingDate,r.setDate,getStatus(r),currentMonth]);
    const blob=new Blob([[headers,...rows].map(a=>a.map(q).join(',')).join('\r\n')],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`GST_${currentMonth}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const now=new Date(); const month=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`; $('gstMonth').value=month;
    $('gstMonth').addEventListener('change',()=>load($('gstMonth').value));
    ['gstSearch','gstRegistrationFilter','gstFrequencyFilter','gstStatusFilter','gstBillingFilter'].forEach(id=>{ const el=$(id); if(el) el.addEventListener('input',applyFilters); });
    const exportBtn=$('gstExport'); if(exportBtn) exportBtn.addEventListener('click',exportCsv);
    const currentBtn=$('gstCurrentMonth'); if(currentBtn) currentBtn.addEventListener('click',()=>{ const d=new Date(); const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; $('gstMonth').value=m; load(m); });
    const tableBody=$('gstTableBody');
    if(tableBody){
      tableBody.addEventListener('input',e=>{const tr=e.target.closest('tr');if(tr){const r=readRow(tr);if(r) tr.querySelector('.status').textContent=getStatus(r);}});
      tableBody.addEventListener('change',e=>{const tr=e.target.closest('tr');if(tr){const r=readRow(tr);if(r) tr.querySelector('.status').textContent=getStatus(r);}});
      tableBody.addEventListener('click',e=>{const b=e.target.closest('.save-btn');if(b)save(b.closest('tr'));});
    }
    load(month);
  });
})();
