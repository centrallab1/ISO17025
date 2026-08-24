// ================= ISO/IEC 17025:2017 CLAUSE TREE =================
const CLAUSE_TREE = [
  { id:'4', title:'General Requirements', children:[
    { id:'4.1', title:'Impartiality' },
    { id:'4.2', title:'Confidentiality' },
  ]},
  { id:'5', title:'Structural Requirements', children:[
    { id:'5.1', title:'Legal Entity' },
    { id:'5.2', title:'Organizational Structure' },
    { id:'5.3', title:'Responsibility' },
    { id:'5.4', title:'Result Integrity' },
    { id:'5.5', title:'Authority & Resources' },
    { id:'5.6', title:'Personnel Communication' },
    { id:'5.7', title:'Internal Communication' },
  ]},
  { id:'6', title:'Resource Requirements', children:[
    { id:'6.2', title:'Personnel' },
    { id:'6.3', title:'Facilities & Environment' },
    { id:'6.4', title:'Equipment' },
    { id:'6.5', title:'Metrological Traceability' },
    { id:'6.6', title:'External Products & Services' },
  ]},
  { id:'7', title:'Process Requirements', children:[
    { id:'7.1', title:'Review of Requests' },
    { id:'7.2', title:'Methods' },
    { id:'7.3', title:'Sampling' },
    { id:'7.4', title:'Handling of Test Items' },
    { id:'7.5', title:'Technical Records' },
    { id:'7.6', title:'Measurement Uncertainty' },
    { id:'7.7', title:'Validity of Results' },
    { id:'7.8', title:'Reporting' },
    { id:'7.9', title:'Complaints' },
    { id:'7.10', title:'Nonconforming Work' },
    { id:'7.11', title:'Data & Information Management' },
  ]},
  { id:'8', title:'Management System', children:[
    { id:'8.2', title:'Management System Documentation' },
    { id:'8.3', title:'Control of Management System Documents' },
    { id:'8.4', title:'Control of Records' },
    { id:'8.5', title:'Risks & Opportunities' },
    { id:'8.6', title:'Improvement' },
    { id:'8.7', title:'Corrective Actions' },
    { id:'8.8', title:'Internal Audits' },
    { id:'8.9', title:'Management Reviews' },
  ]},
];

// ================= DOCUMENTS =================
// Grounded in MPIR Central Lab's real analytical scope: soil, water, fertilizer,
// plant and sugarcane sample testing, plus method validation & PT programs.
const DOCUMENTS = [
  { id:'SOP-001', name:'การควบคุมเอกสาร', clause:'8.3', type:'SOP', rev:'03', status:'Active', owner:'QA', reviewDate:'2027-01-01', effDate:'2026-01-05' },
  { id:'SOP-002', name:'การควบคุมบันทึกคุณภาพ', clause:'8.4', type:'SOP', rev:'02', status:'Active', owner:'QA', reviewDate:'2027-02-14', effDate:'2026-02-10' },
  { id:'SOP-003', name:'การจัดการข้อร้องเรียนลูกค้า', clause:'7.9', type:'SOP', rev:'01', status:'Active', owner:'QA', reviewDate:'2026-11-20', effDate:'2025-11-20' },
  { id:'SOP-004', name:'การควบคุมงานที่ไม่เป็นไปตามข้อกำหนด', clause:'7.10', type:'SOP', rev:'02', status:'Active', owner:'QA', reviewDate:'2027-03-01', effDate:'2026-03-01' },
  { id:'SOP-005', name:'การประเมินความไม่แน่นอนของการวัด', clause:'7.6', type:'SOP', rev:'04', status:'Active', owner:'Analyst', reviewDate:'2026-09-18', effDate:'2025-09-18' },
  { id:'SOP-006', name:'การสอบเทียบเครื่องมือวัดภายในห้องปฏิบัติการ', clause:'6.5', type:'SOP', rev:'03', status:'Active', owner:'Analyst', reviewDate:'2026-10-05', effDate:'2025-10-05' },
  { id:'SOP-007', name:'การทวนสอบวิธีทดสอบ', clause:'7.2', type:'SOP', rev:'03', status:'Active', owner:'Central Lab QA', reviewDate:'2027-08-18', effDate:'2026-08-18' },
  { id:'SOP-008', name:'การตรวจสอบความใช้ได้ของวิธีทดสอบดิน', clause:'7.2', type:'SOP', rev:'02', status:'Review', owner:'Analyst', reviewDate:'2026-09-02', effDate:'2025-08-02' },
  { id:'SOP-009', name:'การเก็บตัวอย่างดินเพื่อการวิเคราะห์', clause:'7.3', type:'SOP', rev:'02', status:'Active', owner:'Field Team', reviewDate:'2027-01-22', effDate:'2026-01-22' },
  { id:'SOP-010', name:'การเก็บตัวอย่างน้ำเพื่อการวิเคราะห์', clause:'7.3', type:'SOP', rev:'02', status:'Active', owner:'Field Team', reviewDate:'2027-01-22', effDate:'2026-01-22' },
  { id:'SOP-011', name:'การเก็บตัวอย่างใบอ้อยเพื่อวิเคราะห์ธาตุอาหารพืช', clause:'7.3', type:'SOP', rev:'01', status:'Active', owner:'Field Team', reviewDate:'2026-12-10', effDate:'2025-12-10' },
  { id:'SOP-012', name:'การรับและจัดเก็บตัวอย่างเข้าห้องปฏิบัติการ', clause:'7.4', type:'SOP', rev:'03', status:'Active', owner:'Lab', reviewDate:'2027-02-02', effDate:'2026-02-02' },
  { id:'SOP-013', name:'การวิเคราะห์ค่า pH และ EC ของดิน', clause:'7.2', type:'SOP', rev:'02', status:'Active', owner:'Analyst', reviewDate:'2026-09-30', effDate:'2025-09-30' },
  { id:'SOP-014', name:'การวิเคราะห์อินทรียวัตถุในดิน (Walkley-Black)', clause:'7.2', type:'SOP', rev:'03', status:'Active', owner:'Analyst', reviewDate:'2027-04-11', effDate:'2026-04-11' },
  { id:'SOP-015', name:'การวิเคราะห์ฟอสฟอรัสที่เป็นประโยชน์ในดิน', clause:'7.2', type:'SOP', rev:'02', status:'Overdue', owner:'Analyst', reviewDate:'2026-06-15', effDate:'2025-06-15' },
  { id:'SOP-016', name:'การวิเคราะห์โพแทสเซียมที่แลกเปลี่ยนได้ในดิน', clause:'7.2', type:'SOP', rev:'02', status:'Active', owner:'Analyst', reviewDate:'2027-05-20', effDate:'2026-05-20' },
  { id:'SOP-017', name:'การวิเคราะห์ไนโตรเจนทั้งหมดด้วยวิธี Kjeldahl', clause:'7.2', type:'SOP', rev:'04', status:'Active', owner:'Analyst', reviewDate:'2027-06-08', effDate:'2026-06-08' },
  { id:'SOP-018', name:'การวิเคราะห์ธาตุอาหารในปุ๋ยเคมี', clause:'7.2', type:'SOP', rev:'02', status:'Active', owner:'Analyst', reviewDate:'2027-03-19', effDate:'2026-03-19' },
  { id:'SOP-019', name:'การวิเคราะห์คุณภาพน้ำเพื่อการเกษตร', clause:'7.2', type:'SOP', rev:'02', status:'Active', owner:'Analyst', reviewDate:'2027-07-01', effDate:'2026-07-01' },
  { id:'SOP-020', name:'การวิเคราะห์ค่าความหวาน Brix และ Pol ในอ้อย', clause:'7.2', type:'SOP', rev:'03', status:'Active', owner:'R&D', reviewDate:'2026-11-30', effDate:'2025-11-30' },
  { id:'SOP-021', name:'การทวนสอบยืนยันวิธีทดสอบ', clause:'7.2', type:'SOP', rev:'03', status:'Active', owner:'QA', reviewDate:'2027-10-01', effDate:'2026-10-01' },
  { id:'WI-018', name:'ขั้นตอนการสอบเทียบวิธีทดสอบ', clause:'7.2', type:'WI', rev:'02', status:'Active', owner:'Analyst', reviewDate:'2026-09-18', effDate:'2025-09-18' },
  { id:'WI-019', name:'วิธีการใช้งานเครื่อง ICP-OES', clause:'6.4', type:'WI', rev:'02', status:'Active', owner:'Analyst', reviewDate:'2026-10-14', effDate:'2025-10-14' },
  { id:'WI-020', name:'วิธีการใช้งานเครื่อง Kjeldahl Auto Analyzer', clause:'6.4', type:'WI', rev:'01', status:'Active', owner:'Analyst', reviewDate:'2026-08-30', effDate:'2025-08-30' },
  { id:'WI-021', name:'วิธีการใช้งาน pH Meter และ EC Meter', clause:'6.4', type:'WI', rev:'03', status:'Active', owner:'Analyst', reviewDate:'2027-01-15', effDate:'2026-01-15' },
  { id:'WI-022', name:'วิธีการใช้งานเครื่อง Refractometer วัดค่า Brix', clause:'6.4', type:'WI', rev:'02', status:'Active', owner:'R&D', reviewDate:'2026-12-05', effDate:'2025-12-05' },
  { id:'WI-023', name:'การทำความสะอาดและบำรุงรักษาเครื่องแก้ววัดปริมาตร', clause:'6.4', type:'WI', rev:'01', status:'Review', owner:'Lab', reviewDate:'2026-09-05', effDate:'2025-09-05' },
  { id:'FM-015', name:'แบบบันทึกผลการสอบเทียบเครื่องมือ', clause:'6.5', type:'Form', rev:'05', status:'Active', owner:'Lab', reviewDate:'2027-08-15', effDate:'2026-08-15' },
  { id:'FM-016', name:'แบบบันทึกรับตัวอย่างเข้าห้องปฏิบัติการ', clause:'7.4', type:'Form', rev:'03', status:'Active', owner:'Lab', reviewDate:'2027-02-20', effDate:'2026-02-20' },
  { id:'FM-017', name:'แบบบันทึกผลการทดสอบดิน', clause:'7.5', type:'Form', rev:'04', status:'Active', owner:'Analyst', reviewDate:'2027-04-02', effDate:'2026-04-02' },
  { id:'FM-018', name:'แบบบันทึกผลการทดสอบน้ำ', clause:'7.5', type:'Form', rev:'03', status:'Active', owner:'Analyst', reviewDate:'2027-04-02', effDate:'2026-04-02' },
  { id:'FM-019', name:'แบบบันทึกผลการทดสอบปุ๋ย', clause:'7.5', type:'Form', rev:'02', status:'Active', owner:'Analyst', reviewDate:'2026-12-28', effDate:'2025-12-28' },
  { id:'FM-020', name:'แบบบันทึกงานที่ไม่เป็นไปตามข้อกำหนด', clause:'7.10', type:'Form', rev:'02', status:'Active', owner:'QA', reviewDate:'2026-11-10', effDate:'2025-11-10' },
  { id:'FM-021', name:'แบบฟอร์มข้อร้องเรียนลูกค้า', clause:'7.9', type:'Form', rev:'02', status:'Active', owner:'QA', reviewDate:'2026-11-20', effDate:'2025-11-20' },
  { id:'FM-022', name:'แบบบันทึกผลการทวนสอบวิธี', clause:'7.2', type:'Form', rev:'04', status:'Active', owner:'Analyst', reviewDate:'2026-09-18', effDate:'2025-09-18' },
  { id:'FM-023', name:'แบบบันทึกอุณหภูมิและความชื้นห้องปฏิบัติการ', clause:'6.3', type:'Form', rev:'03', status:'Overdue', owner:'Lab', reviewDate:'2026-05-30', effDate:'2025-05-30' },
  { id:'TM-003', name:'วิธีการควบคุมความแม่นยำ', clause:'7.2', type:'Method', rev:'03', status:'Active', owner:'R&D', reviewDate:'2027-11-30', effDate:'2026-11-30' },
  { id:'TM-004', name:'วิธีทดสอบมาตรฐาน AOAC สำหรับธาตุอาหารพืช', clause:'7.2', type:'Method', rev:'02', status:'Active', owner:'R&D', reviewDate:'2027-01-15', effDate:'2026-01-15' },
  { id:'PT-001', name:'แผนการเข้าร่วมทดสอบความชำนาญ (Proficiency Testing)', clause:'7.7', type:'Plan', rev:'02', status:'Active', owner:'QA', reviewDate:'2027-01-10', effDate:'2026-01-10' },
  { id:'PT-002', name:'รายงานผลการทดสอบความชำนาญประจำปี', clause:'7.7', type:'Report', rev:'01', status:'Review', owner:'QA', reviewDate:'2026-09-25', effDate:'2025-09-25' },
  { id:'MN-001', name:'คู่มือคุณภาพห้องปฏิบัติการ MPIR Central Lab', clause:'8.2', type:'Manual', rev:'06', status:'Active', owner:'Lab Manager', reviewDate:'2027-01-01', effDate:'2026-01-01' },
  { id:'RA-001', name:'การประเมินความเสี่ยงและโอกาสของห้องปฏิบัติการ', clause:'8.5', type:'SOP', rev:'02', status:'Active', owner:'QA', reviewDate:'2027-03-15', effDate:'2026-03-15' },
  { id:'CA-001', name:'การดำเนินการแก้ไขและป้องกัน', clause:'8.7', type:'SOP', rev:'03', status:'Active', owner:'QA', reviewDate:'2027-02-28', effDate:'2026-02-28' },
  { id:'IA-001', name:'แผนการตรวจติดตามภายใน', clause:'8.8', type:'SOP', rev:'02', status:'Active', owner:'QA', reviewDate:'2026-12-01', effDate:'2025-12-01' },
  { id:'MR-001', name:'การทบทวนโดยฝ่ายบริหาร', clause:'8.9', type:'SOP', rev:'02', status:'Active', owner:'Lab Manager', reviewDate:'2027-06-30', effDate:'2026-06-30' },
];

const TYPE_LABEL = { SOP:'SOP', WI:'WI', Form:'Form', Method:'Method', Plan:'Plan', Report:'Report', Manual:'Manual' };

// ================= RECORDS (linked to documents/clauses) =================
const RECORDS = [
  { id:'VAL-2026-001', name:'ผลทวนสอบวิธี (Moisture)', clause:'7.2', date:'2026-08-10', owner:'Analyst' },
  { id:'VAL-2026-002', name:'ผลทวนสอบวิธี (Ash)', clause:'7.2', date:'2026-08-12', owner:'Analyst' },
  { id:'VAL-2026-003', name:'ผลทวนสอบวิธี (Protein)', clause:'7.2', date:'2026-08-14', owner:'Analyst' },
  { id:'MU-2026-001', name:'ผลประเมินความไม่แน่นอน (pH ดิน)', clause:'7.6', date:'2026-08-05', owner:'Analyst' },
  { id:'MU-2026-002', name:'ผลประเมินความไม่แน่นอน (N ทั้งหมด)', clause:'7.6', date:'2026-08-06', owner:'Analyst' },
  { id:'MU-2026-003', name:'ผลประเมินความไม่แน่นอน (Brix)', clause:'7.6', date:'2026-08-07', owner:'R&D' },
  { id:'CAL-2026-014', name:'ใบรับรองสอบเทียบ pH Meter #03', clause:'6.5', date:'2026-07-28', owner:'Lab' },
  { id:'CAL-2026-015', name:'ใบรับรองสอบเทียบตุ้มน้ำหนักมาตรฐาน', clause:'6.5', date:'2026-07-30', owner:'Lab' },
  { id:'PT-2026-006', name:'ผล Proficiency Testing รอบที่ 1/2026', clause:'7.7', date:'2026-03-15', owner:'QA' },
  { id:'NCR-2026-004', name:'บันทึกงานไม่เป็นไปตามข้อกำหนด — ตัวอย่างเสื่อมสภาพ', clause:'7.10', date:'2026-06-02', owner:'QA' },
];

// ================= REVISION HISTORY (per document id) =================
const REVISIONS = {
  'SOP-007': [
    { rev:'03', date:'2026-08-20', desc:'ปรับปรุงตารางความถี่การทวนสอบและเพิ่มเกณฑ์ยอมรับ', by:'Approved by Laboratory Manager', file:'SOP-007_Rev03.pdf', current:true },
    { rev:'02', date:'2026-01-10', desc:'ปรับปรุงตัวอย่างและแก้ไขการอ้างอิงมาตรฐาน', by:'Approved by Laboratory Manager', file:'SOP-007_Rev02.pdf' },
    { rev:'01', date:'2025-01-01', desc:'ปรับปรุงรูปแบบเอกสาร', by:'Approved by QA Manager', file:'SOP-007_Rev01.pdf' },
    { rev:'00', date:'2024-01-01', desc:'Initial Issue', by:'Approved by Laboratory Manager', file:'SOP-007_Rev00.pdf' },
  ],
};
function revisionsFor(docId){
  if (REVISIONS[docId]) return REVISIONS[docId];
  // generate a plausible generic history for any other doc
  const doc = DOCUMENTS.find(d=>d.id===docId);
  if(!doc) return [];
  const n = parseInt(doc.rev,10) || 1;
  const out = [];
  for(let r=n; r>=0; r--){
    out.push({
      rev:String(r).padStart(2,'0'),
      date: r===n ? doc.effDate : `202${5-(n-r>3?1:0)}-0${(r%9)+1}-1${r}`,
      desc: r===n ? 'ปรับปรุงเนื้อหาล่าสุดตามรอบทบทวน' : r===0 ? 'Initial Issue' : 'ปรับปรุงตามข้อเสนอแนะจากการตรวจติดตาม',
      by: 'Approved by Laboratory Manager',
      file: `${docId}_Rev${String(r).padStart(2,'0')}.pdf`,
      current: r===n,
    });
  }
  return out;
}

// ================= APPROVAL WORKFLOW (per document) =================
const APPROVALS = {
  'SOP-007': {
    rev:'03',
    steps:[
      { name:'Preaw', role:'Document Owner', status:'done', date:'2026-08-20' },
      { name:'Nattaya', role:'QA Review', status:'done', date:'2026-08-20' },
      { name:'Laboratory Manager', role:'Laboratory Manager', status:'pending', date:null },
      { name:'—', role:'Effective', status:'waiting', date:null },
    ]
  }
};
function approvalFor(docId){
  return APPROVALS[docId] || {
    rev: (DOCUMENTS.find(d=>d.id===docId)||{}).rev || '01',
    steps:[
      { name:'Preaw', role:'Document Owner', status:'done', date:'2026-08-01' },
      { name:'Nattaya', role:'QA Review', status:'pending', date:null },
      { name:'Laboratory Manager', role:'Laboratory Manager', status:'waiting', date:null },
      { name:'—', role:'Effective', status:'waiting', date:null },
    ]
  };
}

// ================= AUDIT TRAIL =================
const AUDIT_TRAIL = [
  { who:'Preaw', action:'แก้ไขและส่งเอกสาร SOP-007 (Rev.03) เพื่อขออนุมัติ', time:'20 Aug 2026, 14:22' },
  { who:'Nattaya', action:'อนุมัติ QA Review สำหรับ SOP-007 (Rev.03)', time:'20 Aug 2026, 16:05' },
  { who:'Lab System', action:'สร้างบันทึกใหม่ VAL-2026-003 ในหมวด 7.2 Methods', time:'14 Aug 2026, 09:40' },
  { who:'Analyst', action:'อัปโหลดใบรับรองสอบเทียบ CAL-2026-015', time:'30 Jul 2026, 11:12' },
  { who:'QA', action:'ปิดงาน NCR-2026-004 — ตัวอย่างเสื่อมสภาพ', time:'10 Jun 2026, 10:30' },
  { who:'Preaw', action:'อัปเดตสถานะเอกสาร SOP-015 เป็น Overdue (เกินกำหนดทบทวน)', time:'16 Jun 2026, 08:00' },
  { who:'Lab Manager', action:'อนุมัติคู่มือคุณภาพ MN-001 (Rev.06)', time:'01 Jan 2026, 09:00' },
];

// ================= CALENDAR EVENTS (Aug 2026, keyed by day) =================
const CAL_EVENTS = {
  18: { type:'overdue', label:'SOP-015 เกินกำหนด' },
  20: { type:'soon', label:'SOP-007 ทบทวน' },
  26: { type:'upcoming', label:'WI-023 ใกล้ครบกำหนด' },
  28: { type:'upcoming', label:'FM-023 ใกล้ครบกำหนด' },
};

// ================= DASHBOARD DERIVED STATS =================
function computeStats(){
  const total = DOCUMENTS.length;
  const active = DOCUMENTS.filter(d=>d.status==='Active').length;
  const review = DOCUMENTS.filter(d=>d.status==='Review').length;
  const overdue = DOCUMENTS.filter(d=>d.status==='Overdue').length;
  return { total, active, review, overdue };
}

function complianceByClauseGroup(){
  // % of docs Active vs total per top-level clause group (mocked but derived)
  const groups = [
    { id:'4', label:'General Requirements' },
    { id:'5', label:'Structural Requirements' },
    { id:'6', label:'Resource Requirements' },
    { id:'7', label:'Process Requirements' },
    { id:'8', label:'Management System' },
  ];
  return groups.map(g=>{
    const docs = DOCUMENTS.filter(d=>d.clause.startsWith(g.id+'.') || d.clause===g.id);
    const activeN = docs.filter(d=>d.status==='Active').length;
    const pct = docs.length ? Math.round((activeN/docs.length)*100) : 100;
    return { ...g, pct: docs.length ? pct : 100, n: g.id };
  });
}
