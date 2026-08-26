(()=>{"use strict";
const S={month:"",rows:[],filtered:[]},$=id=>document.getElementById(id);
const statuses=[
    "WORKING PENDING",
    "ADVANCE PAYMENT PENDING",
    "TAX PENDING",
    "FILING PENDING",
    "SET PENDING",
    "TRANSFER TO BILLING"
];
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const cm=()=>{let d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")};
const status=r=>{
    // 1. YES requires advance payment date before the workflow can move forward.
    //    NO allows working to begin immediately.
    if(r.setDate) return "TRANSFER TO BILLING";
    if(r.filingDate) return "SET PENDING";
    if(r.taxPaymentDate) return "FILING PENDING";
    if(r.workingDate) return "TAX PENDING";
    if(r.advancePayment==="YES" && !r.advancePaymentDate) return "ADVANCE PAYMENT PENDING";
    return "WORKING PENDING";
};
function applyFilters(){let q=$("itSearch").value.trim().toLowerCase(),a=$("itAdvanceFilter").value,s=$("itStatusFilter").value,w=$("itWorkingFilter").value,t=$("itTaxFilter").value,f=$("itFilingFilter").value,se=$("itSetFilter").value;
S.filtered=S.rows.filter(r=>{if(q&&!String(r.partyName||"").toLowerCase().includes(q))return false;if(a&&r.advancePayment!==a)return false;if(s&&status(r)!==s)return false;
if(w==="ENTERED"&&!r.workingDate||w==="PENDING"&&r.workingDate)return false;if(t==="ENTERED"&&!r.taxPaymentDate||t==="PENDING"&&r.taxPaymentDate)return false;
if(f==="ENTERED"&&!r.filingDate||f==="PENDING"&&r.filingDate)return false;if(se==="ENTERED"&&!r.setDate||se==="PENDING"&&r.setDate)return false;return true});render()}
function render(){$("itTotal").textContent=S.rows.length;$("itVisible").textContent=S.filtered.length;let b=$("itTableBody");b.innerHTML="";
if(!S.filtered.length){$("itTableWrap").style.display="none";$("itEmpty").style.display="block";return}
$("itEmpty").style.display="none";$("itTableWrap").style.display="block";
S.filtered.forEach((r,i)=>{let tr=document.createElement("tr");tr.innerHTML=
`<td>${i+1}</td><td>${esc(r.partyName)}</td>
<td><select class="adv" data-id="${esc(r.id)}"><option value="YES"${r.advancePayment==="YES"?" selected":""}>YES</option><option value="NO"${r.advancePayment==="NO"?" selected":""}>NO</option></select></td>
<td><input class="advdate" data-id="${esc(r.id)}" type="date" value="${esc(r.advancePaymentDate)}"${r.advancePayment==="NO"?" disabled":""}></td>
<td><input class="date" data-id="${esc(r.id)}" data-field="workingDate" type="date" value="${esc(r.workingDate)}"></td>
<td><input class="date" data-id="${esc(r.id)}" data-field="taxPaymentDate" type="date" value="${esc(r.taxPaymentDate)}"></td>
<td><input class="date" data-id="${esc(r.id)}" data-field="filingDate" type="date" value="${esc(r.filingDate)}"></td>
<td><input class="date" data-id="${esc(r.id)}" data-field="setDate" type="date" value="${esc(r.setDate)}"></td>
<td class="it-status">${esc(status(r))}</td>`;b.appendChild(tr)});
document.querySelectorAll(".adv").forEach(e=>e.onchange=()=>{let r=S.rows.find(x=>x.id===e.dataset.id);if(!r)return;r.advancePayment=e.value;if(e.value==="NO")r.advancePaymentDate="";applyFilters()});
document.querySelectorAll(".advdate").forEach(e=>e.onchange=()=>{let r=S.rows.find(x=>x.id===e.dataset.id);if(!r)return;r.advancePaymentDate=e.value;applyFilters()});
document.querySelectorAll(".date").forEach(e=>e.onchange=()=>{let r=S.rows.find(x=>x.id===e.dataset.id);if(!r)return;r[e.dataset.field]=e.value;applyFilters()})}
async function load(){let m=$("itMonth").value||cm();S.month=m;$("itMonthLabel").textContent=m;$("itLoading").style.display="block";$("itEmpty").style.display="none";
try{let r=await fetch("/api/income-tax?month="+encodeURIComponent(m),{credentials:"same-origin",cache:"no-store"}),d=await r.json();if(!r.ok||!d.success)throw Error(d.message||"Unable to load Income Tax records.");S.rows=d.rows||[];$("itLoading").style.display="none";applyFilters()}
catch(e){$("itLoading").style.display="none";$("itError").textContent=e.message;$("itError").style.display="block"}}
async function save(){let b=$("itSaveAll");b.disabled=true;b.textContent="Saving...";
try{let r=await fetch("/api/income-tax/bulk",{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({month:S.month,rows:S.rows})}),d=await r.json();if(!r.ok||!d.success)throw Error(d.message||"Unable to save.");S.rows=d.rows||S.rows;applyFilters();$("itToast").textContent="Income Tax records saved.";$("itToast").classList.add("show");setTimeout(()=>$("itToast").classList.remove("show"),2200)}
catch(e){$("itError").textContent=e.message;$("itError").style.display="block"}finally{b.disabled=false;b.textContent="Save All"}}
function exportExcel(){let rows=S.filtered.map((r,i)=>({"SR NO.":i+1,"Party Name":r.partyName,"PAN":r.pan||"","Advance Payment":r.advancePayment,"Advance Payment Date":r.advancePaymentDate||"","Working Date":r.workingDate||"","Tax Payment Date":r.taxPaymentDate||"","Filing Date":r.filingDate||"","Set Date":r.setDate||"","Status":status(r)}));
if(!rows.length)return alert("No records match the current filters.");if(!window.XLSX)return alert("Excel export library is not available.");let ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Income Tax");XLSX.writeFile(wb,"income-tax-"+S.month+".xlsx")}
function exportPdf(){let rows=S.filtered;if(!rows.length)return alert("No records match the current filters.");let J=window.jspdf?.jsPDF;if(!J)return alert("PDF export library is not available.");
let p=new J({orientation:"landscape",unit:"mm",format:"a4"});p.setFontSize(16);p.text("CA Office - Income Tax Dashboard",10,14);p.setFontSize(8);p.text("Month: "+S.month,10,20);
p.autoTable({startY:26,head:[["SR NO.","Party Name","PAN","Advance Payment","Advance Payment Date","Working Date","Tax Payment Date","Filing Date","Set Date","Status"]],body:rows.map((r,i)=>[i+1,r.partyName,r.pan||"",r.advancePayment,r.advancePaymentDate||"",r.workingDate||"",r.taxPaymentDate||"",r.filingDate||"",r.setDate||"",status(r)]),styles:{fontSize:6.5,cellPadding:2}});p.save("income-tax-"+S.month+".pdf")}
document.addEventListener("DOMContentLoaded",()=>{statuses.forEach(s=>{let o=document.createElement("option");o.value=s;o.textContent=s;$("itStatusFilter").appendChild(o)});$("itMonth").value=cm();
$("itCurrentMonth").onclick=()=>{$("itMonth").value=cm();load()};$("itMonth").onchange=load;
["itSearch","itAdvanceFilter","itStatusFilter","itWorkingFilter","itTaxFilter","itFilingFilter","itSetFilter"].forEach(id=>$(id).addEventListener(id==="itSearch"?"input":"change",applyFilters));
$("itSaveAll").onclick=save;$("itExportExcel").onclick=exportExcel;$("itExportPdf").onclick=exportPdf;load()})})();