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
  const src = String((d && d.id) || '') + ' ' + String((d && d.name) || '');
  const m = src.match(/(?:RDI|MPIR)-([A-Z]+)-/);
  if(m && DOC_TYPE_MAP[m[1]]) return m[1];
  return 'อื่นๆ';
}
function docTypeLabel(d){
  const c = docTypeCode(d);
  return DOC_TYPE_MAP[c] || 'อื่นๆ';
}

// ============================================================
// AUTO-CLASSIFICATION SUGGESTIONS (keyword-based, suggest-only —
// never sets a field without the user accepting it). Matches
// keywords in the document name against each ISO clause, and flags
// names/IDs that look like supporting/evidence documents.
// ============================================================
const CLAUSE_KEYWORDS = {
  '4.1':  ['ความเป็นกลาง'],
  '4.2':  ['รักษาความลับ', 'ความลับ'],
  '6.2':  ['บุคลากร', 'ฝึกอบรม', 'ความสามารถของเจ้าหน้าที่', 'อบรม'],
  '6.3':  ['สภาพแวดล้อม', 'ผังห้องปฏิบัติการ', 'ผังห้อง'],
  '6.4':  ['บำรุงรักษาเครื่องมือ', 'ซ่อมบำรุงเครื่องมือ', 'ทะเบียนเครื่องมือ'],
  '6.5':  ['สอบเทียบ', 'สอบกลับได้ทางมาตรวิทยา', 'สอบกลับได้'],
  '6.6':  ['จัดซื้อ', 'ผู้ขาย', 'ผู้ให้บริการภายนอก', 'ภายนอก'],
  '7.1':  ['ทบทวนคำขอ', 'ข้อเสนอการประมูล', 'ข้อสัญญา', 'ทบทวนสัญญา'],
  '7.2':  ['ทวนสอบวิธี', 'ตรวจสอบความใช้ได้ของวิธี', 'วิธีทดสอบ', 'วิธีปฏิบัติงาน'],
  '7.3':  ['สุ่มตัวอย่าง', 'เก็บตัวอย่าง'],
  '7.4':  ['จัดการตัวอย่าง', 'รับตัวอย่างเข้าห้องปฏิบัติการ', 'รับตัวอย่าง'],
  '7.5':  ['บันทึกทางวิชาการ'],
  '7.6':  ['ความไม่แน่นอนของการวัด', 'ความไม่แน่นอน'],
  '7.7':  ['ทดสอบความชำนาญ', 'เปรียบเทียบผลระหว่างห้องปฏิบัติการ', 'ความใช้ได้ของผล'],
  '7.8':  ['รายงานผลการทดสอบ', 'ใบรายงานผล', 'การรายงานผล'],
  '7.9':  ['ข้อร้องเรียน', 'ร้องเรียน'],
  '7.10': ['งานที่ไม่เป็นไปตามข้อกำหนด', 'ไม่เป็นไปตามข้อกำหนด'],
  '7.11': ['การควบคุมข้อมูล', 'ระบบสารสนเทศ'],
  '8.2':  ['คู่มือคุณภาพ'],
  '8.3':  ['การควบคุมเอกสาร', 'ควบคุมเอกสาร'],
  '8.4':  ['การควบคุมบันทึก', 'ควบคุมบันทึก'],
  '8.5':  ['ความเสี่ยงและโอกาส', 'บริหารความเสี่ยง', 'ความเสี่ยง'],
  '8.6':  ['การปรับปรุง'],
  '8.7':  ['การปฏิบัติการแก้ไข', 'ข้อร้องขอให้แก้ไข', 'แก้ไข'],
  '8.8':  ['การตรวจติดตามภายใน', 'ตรวจติดตามภายใน'],
  '8.9':  ['การทบทวนของฝ่ายบริหาร', 'ทบทวนของฝ่ายบริหาร'],
};
function suggestClause(name){
  if(!name) return null;
  let best = null, bestLen = 0;
  for(const [code, keywords] of Object.entries(CLAUSE_KEYWORDS)){
    for(const kw of keywords){
      if(name.includes(kw) && kw.length > bestLen){
        best = code; bestLen = kw.length;
      }
    }
  }
  return best;
}

const SUPPORT_KEYWORDS = ['ใบรับรอง', 'ประกาศ', 'มาตรฐานอ้างอิง', 'ใบเซอร์', 'ใบประกาศ'];
function isLikelySupportDoc(id, name){
  if(id && /^(RDI|MPIR)-LS/i.test(String(id))) return true;
  if(!name) return false;
  return SUPPORT_KEYWORDS.some(kw=> String(name).includes(kw));
}

// Auto-number a new document within its <PREFIX>-#### series (checking both
// the old RDI- ids and the new MPIR- ids so numbers never collide across the
// transition), filling the lowest unused/missing number first — e.g. if 050
// was skipped and 054 already exists, the next auto-issued number is 050,
// not 055 — matching how the lab's paper register has always numbered
// documents. New documents are issued directly in the new MPIR-xx-###-00
// format; existing RDI- documents convert to this format when they go
// through an approved revision request (see app.js).
function nextAvailableNumber(prefix){
  const re = new RegExp('^(?:RDI|MPIR)-'+prefix+'-(\\d+)', 'i');
  const nums = [];
  DOCUMENTS.forEach(d=>{
    const idStr = String(d && d.id || '');
    const m = idStr.match(re);
    if(m) nums.push(parseInt(m[1],10));
  });
  const used = new Set(nums);
  let n = 1;
  while(used.has(n)) n++;
  return `MPIR-${prefix}-${String(n).padStart(3,'0')}-00`;
}

// Converts an old RDI-xx-### id to the new MPIR-xx-###-rr format, reusing
// the existing document number and stamping the current revision.
function toMpirId(oldId, typeCode, revNumber){
  const m = (oldId||'').match(/(\d+)(?!.*\d)/);
  const num = m ? parseInt(m[1],10) : 0;
  const revInt = parseInt(revNumber,10);
  const revStr = isNaN(revInt) ? '00' : String(revInt).padStart(2,'0');
  return `MPIR-${typeCode}-${String(num).padStart(3,'0')}-${revStr}`;
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
  'รออนุมัติ':   'pending',
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

// next scheduled review = the most recent of (a) a periodic-review
// confirmation with no changes, or (b) the effective date / last update,
// plus a review cycle length in days. Cycle length defaults to 365 days
// (a common periodic-review interval) and is editable per document.
const DEFAULT_REVIEW_CYCLE_DAYS = 365;
function nextReviewDate(d){
  const base = d.lastReviewedAt || d.effectiveDate || d.lastUpdated || Date.now();
  const cycle = d.reviewCycleDays || DEFAULT_REVIEW_CYCLE_DAYS;
  return base + cycle*86400000;
}
function daysUntil(ms){
  return Math.round((ms - Date.now())/86400000);
}

// ============================================================
// DERIVED STATS (all computed live from DOCUMENTS — nothing fabricated)
// ============================================================
function computeStats(){
  const docs = visibleDocuments();
  const total = docs.length;
  const active = docs.filter(d=> d.note==='ควบคุม' || d.note==='แจกจ่าย').length;
  const pending = docs.filter(d=> d.approvalStatus==='รอทบทวน' || d.approvalStatus==='รออนุมัติ').length;
  const attention = docs.filter(d=> d.note==='ไม่พบ' || d.approvalStatus==='ไม่อนุมัติ').length;
  return { total, active, pending, attention };
}

function complianceByGroup(){
  const all = visibleDocuments();
  return GROUPS.map(([gid,glabel])=>{
    const docs = all.filter(d=> groupOf(d.clause)===gid);
    const approved = docs.filter(d=> d.approvalStatus==='อนุมัติแล้ว').length;
    const pct = docs.length ? Math.round((approved/docs.length)*100) : 0;
    return { id:gid, label: glabel.replace(/^\d+\.\s*/,''), n: docs.length, pct };
  });
}

function unclassifiedDocs(){
  return visibleDocuments().filter(d=> !d.clause);
}

// ============================================================
// PUBLICATION GATING — a brand-new document (created via the "New
// Document" flow) stays invisible in every browsable list until it has
// been approved AND Document Control has pasted the published link.
// This does NOT apply to legacy/imported documents (they have no
// lastRequestType==='new' origin) or to documents already published
// once before (a revision-in-progress keeps showing its last published
// link/version until the new revision's own publish step completes).
// ============================================================
function isHiddenFromLists(d){
  return d.lastRequestType==='new' && !d.publishedLink;
}
function visibleDocuments(){
  return DOCUMENTS.filter(d=> !isHiddenFromLists(d));
}
// the link to actually show/open for a document — always the latest
// published link once one exists, falling back to the working/draft
// link before first publication.
function displayLink(d){
  return d.publishedLink || d.link || '';
}

// ============================================================
// ARCHIVE — a separate, lightweight store for general documents that
// aren't part of the controlled ISO document register (meeting minutes,
// calibration certificates, external reports, etc). No document-number
// scheme and no multi-step approval — just a single DC verification step.
// Stored in its own Firestore doc (iso17025/archive) so it never mixes
// with the controlled DOCUMENTS array.
// ============================================================
const ARCHIVE_CATEGORY_SUGGESTIONS = ['สรุปประชุม', 'เอกสารสอบเทียบ', 'ใบรับรอง/Certificate', 'รายงานผลทดสอบภายนอก', 'อื่นๆ'];
var ARCHIVE_ITEMS = [];
var ARCHIVE_LOADED = false;
var ARCHIVE_ERROR = null;
