const express=require("express");
const crypto=require("crypto");
const db=require("../database/database");
const {requireAuth}=require("../middleware/auth");
const router=express.Router();

db.exec(`
CREATE TABLE IF NOT EXISTS income_tax_profiles(
 id TEXT PRIMARY KEY, client_id TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS income_tax_monthly_records(
 id TEXT PRIMARY KEY, income_tax_profile_id TEXT NOT NULL, month_key TEXT NOT NULL,
 advance_payment TEXT NOT NULL DEFAULT 'NO',
 advance_payment_date TEXT, working_date TEXT, tax_payment_date TEXT,
 filing_date TEXT, set_date TEXT,
 advance_payment_status TEXT DEFAULT 'PENDING',
 working_status TEXT DEFAULT 'PENDING',
 tax_payment_status TEXT DEFAULT 'PENDING',
 filing_status TEXT DEFAULT 'PENDING',
 set_status TEXT DEFAULT 'PENDING',
 overall_status TEXT DEFAULT 'PENDING',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(income_tax_profile_id,month_key),
 FOREIGN KEY(income_tax_profile_id) REFERENCES income_tax_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_income_tax_month ON income_tax_monthly_records(month_key);
`);

const clean=v=>String(v??"").trim();
const validMonth=v=>/^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const validDate=v=>v===""||/^\d{4}-\d{2}-\d{2}$/.test(v);
const currentMonth=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")};
const makeId=p=>p+Date.now()+crypto.randomInt(1000,9999);

function syncProfiles(){
 const clients=db.prepare(`SELECT id FROM clients WHERE pan IS NOT NULL AND TRIM(pan)<>''`).all();
 const find=db.prepare(`SELECT id FROM income_tax_profiles WHERE client_id=?`);
 const insert=db.prepare(`INSERT INTO income_tax_profiles(id,client_id,created_at,updated_at) VALUES(?,?,?,?)`);
 const now=new Date().toISOString();
 db.transaction(()=>clients.forEach(c=>{if(!find.get(c.id))insert.run(makeId("ITP"),c.id,now,now)}))();
}

function ensureMonth(month) {
    month = clean(month);

    if (!validMonth(month)) {
        month = currentMonth();
    }

    syncProfiles();
 const profiles=db.prepare(`SELECT id FROM income_tax_profiles`).all();
 const find=db.prepare(`SELECT id FROM income_tax_monthly_records WHERE income_tax_profile_id=? AND month_key=?`);
 const insert=db.prepare(`INSERT INTO income_tax_monthly_records(id,income_tax_profile_id,month_key,created_at,updated_at) VALUES(?,?,?,?,?)`);
 const now=new Date().toISOString();
 db.transaction(()=>profiles.forEach(p=>{if(!find.get(p.id,month))insert.run(makeId("ITM"),p.id,month,now,now)}))();

 return month;
}

function overall(r){
    if(r.set_date) return "TRANSFER TO BILLING";
    if(r.filing_date) return "SET PENDING";
    if(r.tax_payment_date) return "FILING PENDING";
    if(r.working_date) return "TAX PENDING";
    if(r.advance_payment === "YES" && !r.advance_payment_date){
        return "ADVANCE PAYMENT PENDING";
    }
    return "WORKING PENDING";
}

function rowMap(r){
 return {
  id:r.id,clientId:r.client_id,partyName:[r.first_name,r.middle_name,r.last_name].filter(Boolean).join(" "),
  pan:r.pan||"",month:r.month_key,advancePayment:r.advance_payment,
  advancePaymentDate:r.advance_payment_date||"",workingDate:r.working_date||"",
  taxPaymentDate:r.tax_payment_date||"",filingDate:r.filing_date||"",setDate:r.set_date||"",
  status:overall(r)
 };
}

function getRows(month,user){
 month=ensureMonth(month);
 let sql=`SELECT im.*,itp.client_id,c.first_name,c.middle_name,c.last_name,c.pan
 FROM income_tax_monthly_records im
 JOIN income_tax_profiles itp ON itp.id=im.income_tax_profile_id
 JOIN clients c ON c.id=itp.client_id
 WHERE im.month_key=? AND c.pan IS NOT NULL AND TRIM(c.pan)<>''`;
 const params=[month];

 sql+=` ORDER BY c.first_name,c.middle_name,c.last_name`;
 return db.prepare(sql).all(...params).map(rowMap);
}

function validate(body){
 const fields=["advancePaymentDate","workingDate","taxPaymentDate","filingDate","setDate"];
 for(const f of fields)if(!validDate(clean(body[f])))throw Error(f+" must use YYYY-MM-DD.");
 const a=clean(body.advancePayment).toUpperCase();
 if(!["YES","NO"].includes(a))throw Error("Advance Payment must be YES or NO.");
 return {
   a,ad:a==="YES"?clean(body.advancePaymentDate):"",
   w:clean(body.workingDate),t:clean(body.taxPaymentDate),
   f:clean(body.filingDate),s:clean(body.setDate)
 };
}

function canAccess(clientId,user){
 // Income Tax is intentionally not restricted by client assignment.
 // Every authenticated Admin/Employee can edit every PAN-linked Income Tax row.
 return Boolean(user);
}

function updateRecord(id,body,user){
 const existing=db.prepare(`
   SELECT im.id,im.month_key,itp.client_id
   FROM income_tax_monthly_records im
   JOIN income_tax_profiles itp ON itp.id=im.income_tax_profile_id
   WHERE im.id=?`).get(id);

 if(!existing)throw Error("Income Tax monthly record not found.");
 if(!canAccess(existing.client_id,user))throw Error("You do not have access to this Income Tax record.");

 const x=validate(body);

 // Advance Payment = YES requires the Advance Payment Date
 // before a Working Date can be entered.
 if(
   x.a==="YES" &&
   !x.ad &&
   x.w
 ){
   throw Error(
     "Advance Payment is YES. Enter the Advance Payment Date before entering Working Date."
   );
 }

 const now=new Date().toISOString();

 db.prepare(`
 UPDATE income_tax_monthly_records SET
 advance_payment=?,advance_payment_date=?,working_date=?,tax_payment_date=?,
 filing_date=?,set_date=?,
 advance_payment_status=?,working_status=?,tax_payment_status=?,
 filing_status=?,set_status=?,overall_status=?,updated_at=?
 WHERE id=?`).run(
 x.a,x.ad||null,x.w||null,x.t||null,x.f||null,x.s||null,
 x.a==="YES"?(x.ad?"COMPLETED":"PENDING"):"NOT APPLICABLE",
 x.w?"COMPLETED":"PENDING",x.t?"COMPLETED":"PENDING",
 x.f?"COMPLETED":"PENDING",x.s?"COMPLETED":"PENDING",
 x.s?"COMPLETED":x.f?"SET PENDING":x.t?"FILING PENDING":x.w?"TAX PAYMENT PENDING":
 x.a==="YES"&&!x.ad?"ADVANCE PAYMENT PENDING":"WORKING PENDING",now,id
 );
 return getRows(existing.month_key,user).find(r=>r.id===id);
}

router.get("/income-tax",requireAuth,(req,res)=>{
 try{
  const month=validMonth(clean(req.query.month))?clean(req.query.month):currentMonth();
  res.json({success:true,month,rows:getRows(month,req.user)});
 }catch(e){console.error("Income Tax GET:",e);res.status(500).json({success:false,message:e.message||"Unable to load Income Tax dashboard."})}
});

router.patch("/income-tax/bulk",requireAuth,(req,res)=>{
 try{
  let month=clean(req.body?.month);
  if(!validMonth(month)) month=currentMonth();

  const records=Array.isArray(req.body?.rows)
    ? req.body.rows
    : [];

  month=ensureMonth(month);

  records.forEach(r=>updateRecord(
    clean(r.id),
    r,
    req.user
  ));

  res.json({
    success:true,
    month,
    rows:getRows(month,req.user)
  });
 }catch(e){console.error("Income Tax BULK:",e);res.status(400).json({success:false,message:e.message||"Unable to save Income Tax records."})}
});

router.patch("/income-tax/:id",requireAuth,(req,res)=>{
 try{res.json({success:true,row:updateRecord(clean(req.params.id),req.body||{},req.user)})}
 catch(e){res.status(400).json({success:false,message:e.message||"Unable to save Income Tax record."})}
});

module.exports=router;
