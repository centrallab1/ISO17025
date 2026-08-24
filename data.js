// ============================================================
// STATIC ISO/IEC 17025:2017 METADATA
// (ported 1:1 from the previous production app so clause codes,
// labels, and grouping stay identical to what's already in use)
// ============================================================
const CLAUSES = [
  ["4.1","4.1 ความเป็นกลาง (Impartiality)"],
  ["4.2","4.2 การรักษาความลับ (Confidentiality)"],
  ["5","5. ข้อกำหนดด้านโครงสร้าง (Structural requirements)"],
  ["6.2","6.2 บุคลากร (Personnel)"],
  ["6.3","6.3 สถานที่และสภาวะแวดล้อม (Facilities & environment)"],
  ["6.4","6.4 เครื่องมือ (Equipment)"],
  ["6.5","6.5 การสอบกลับได้ทางมาตรวิทยา (Metrological traceability)"],
  ["6.6","6.6 ผลิตภัณฑ์และบริการจากภายนอก (Externally provided)"],
  ["7.1","7.1 การทบทวนคำขอ/สัญญา (Review of requests)"],
  ["7.2","7.2 การเลือกและตรวจสอบวิธีทดสอบ (Selection/validation of methods)"],
  ["7.3","7.3 การสุ่มตัวอย่าง (Sampling)"],
  ["7.4","7.4 การจัดการตัวอย่าง (Handling of items)"],
  ["7.5","7.5 บันทึกทางวิชาการ (Technical records)"],
  ["7.6","7.6 การประเมินความไม่แน่นอน (Measurement uncertainty)"],
  ["7.7","7.7 การประกันความใช้ได้ของผล (Ensuring validity of results)"],
  ["7.8","7.8 การรายงานผล (Reporting of results)"],
  ["7.9","7.9 ข้อร้องเรียน (Complaints)"],
  ["7.10","7.10 งานที่ไม่เป็นไปตามข้อกำหนด (Nonconforming work)"],
  ["7.11","7.11 การควบคุมข้อมูล (Control of data & information)"],
  ["8.2","8.2 เอกสารระบบบริหารงาน (Management system documentation)"],
  ["8.3","8.3 การควบคุมเอกสาร (Control of documents)"],
  ["8.4","8.4 การควบคุมบันทึก (Control of records)"],
  ["8.5","8.5 ความเสี่ยงและโอกาส (Risks & opportunities)"],
  ["8.6","8.6 การปรับปรุง (Improvement)"],
  ["8.7","8.7 การปฏิบัติการแก้ไข (Corrective actions)"],
  ["8.8","8.8 การตรวจติดตามภายใน (Internal audits)"],
  ["8.9","8.9 การทบทวนของฝ่ายบริหาร (Management reviews)"]
];
function clauseLabel(code){
  const f = CLAUSES.find(c=>c[0]===code);
  return f ? f[1] : (code || '');
}

const GROUPS = [
  ["4","4. ทั่วไป (General)"],
  ["5","5. โครงสร้าง (Structural)"],
  ["6","6. ทรัพยากร (Resource)"],
  ["7","7. กระบวนการ (Process)"],
  ["8","8. ระบบบริหาร (Management System)"],
];
function groupOf(code){
  if(!code) return '';
  if(code==='5') return '5';
  return code.split('.')[0];
}
function groupLabel(code){
  const f = GROUPS.find(g=>g[0]===code);
  return f ? f[1] : 'ไม่ระบุหมวด';
}

// clause tree used by the sidebar browser — built from CLAUSES + GROUPS
const CLAUSE_TREE = GROUPS.map(([gid,glabel])=>({
  id: gid,
  title: glabel.replace(/^\d+\.\s*/,''),
  children: CLAUSES.filter(([code])=> groupOf(code)===gid).map(([code,label])=>({
    id: code,
    title: label.replace(/^[\d.]+\s*/,''),
  })),
}));

// ============================================================
// DOCUMENT TYPE + STATUS CLASSIFIERS
// (ported 1:1 from the previous app — same ID-prefix convention
// RDI-LM / RDI-LP / RDI-WI / RDI-LF / RDI-LS)
// ============================================================
const DOC_TYPE_MAP = {
  'LM': 'คู่มือคุณภาพ (Manual)',
  'LP': 'ขั้นตอนปฏิบัติงาน (Procedure)',
  'WI': 'วิธีปฏิบัติงาน (Work Instruction)',
  'LF': 'แบบฟอร์ม (Form)',
  'LS': 'เอกสารสนับสนุน (Support)',
};
function docTypeCode(d){
  const src = (d.id||'') + ' ' + (d.name||'');
  const m = src.match(/RDI-([A-Z]+)-/);
  if(m && DOC_TYPE_MAP[m[1]]) return m[1];
  return 'อื่นๆ';
}
function docTypeLabel(d){
  const c = docTypeCode(d);
  return DOC_TYPE_MAP[c] || 'อื่นๆ';
}

// "note" = document status as used across the lab's document register
const STATUS_STYLE = {
  'ควบคุม':   { cls:'active' },   // controlled / in force
  'แจกจ่าย':  { cls:'review' },   // distributed
  'สนับสนุน': { cls:'draft'  },   // supporting reference (certs, standards, training material)
  'ยกเลิก':   { cls:'overdue'},   // cancelled
  'ว่าง':     { cls:'draft'  },   // blank / not yet filled
  'ไม่พบ':    { cls:'overdue'},   // missing / not found
};
function statusBadge(note){
  const st = STATUS_STYLE[note] || { cls:'draft' };
  return `<span class="badge ${st.cls}">${note || 'ไม่ระบุ'}</span>`;
}

// approval workflow (ported 1:1 from the previous app)
const STATUS_FLOW = ['ร่าง','รอทบทวน','รออนุมัติ','อนุมัติแล้ว'];
const APPROVAL_STATUS_STYLE = {
  'ร่าง':       'draft',
  'รอทบทวน':    'review',
  'รออนุมัติ':   'review',
  'อนุมัติแล้ว': 'active',
  'ไม่อนุมัติ':  'overdue',
};
function approvalBadge(status){
  const s = status || 'ร่าง';
  return `<span class="badge ${APPROVAL_STATUS_STYLE[s]||'draft'}">${s}</span>`;
}

// role code → real name, as used in the ผู้จัดทำ/ผู้ทบทวน/ผู้อนุมัติ columns
// of the master list (LM/TM/QM/DC)
const ROLE_NAMES = { LM:'รัตนา', TM:'พิสิทธินี', QM:'พิมพ์ชนก', DC:'พิมพ์ชนก' };
function roleName(code){
  if(!code) return '';
  return ROLE_NAMES[code] || code;
}

// ============================================================
// LIVE DOCUMENT STORE
// Populated at runtime from Firestore (see app.js). Starts empty —
// nothing here is mock data anymore.
// ============================================================
var DOCUMENTS = [];
var DOCS_LOADED = false;
var DOCS_ERROR = null;

function fmtDate(ms){
  if(!ms) return '—';
  return new Date(ms).toLocaleDateString('th-TH', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function fmtDateTime(ms){
  if(!ms) return '—';
  return new Date(ms).toLocaleString('th-TH', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ============================================================
// DERIVED STATS (all computed live from DOCUMENTS — nothing fabricated)
// ============================================================
function computeStats(){
  const total = DOCUMENTS.length;
  const active = DOCUMENTS.filter(d=> d.note==='ควบคุม' || d.note==='แจกจ่าย').length;
  const pending = DOCUMENTS.filter(d=> d.approvalStatus==='รอทบทวน' || d.approvalStatus==='รออนุมัติ').length;
  const attention = DOCUMENTS.filter(d=> d.note==='ไม่พบ' || d.approvalStatus==='ไม่อนุมัติ').length;
  return { total, active, pending, attention };
}

function complianceByGroup(){
  return GROUPS.map(([gid,glabel])=>{
    const docs = DOCUMENTS.filter(d=> groupOf(d.clause)===gid);
    const approved = docs.filter(d=> d.approvalStatus==='อนุมัติแล้ว').length;
    const pct = docs.length ? Math.round((approved/docs.length)*100) : 0;
    return { id:gid, label: glabel.replace(/^\d+\.\s*/,''), n: docs.length, pct };
  });
}

function unclassifiedDocs(){
  return DOCUMENTS.filter(d=> !d.clause);
}
