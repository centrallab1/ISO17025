// ============================================================
// FIREBASE — same project/collection as the previous ISO17025 app
// (iso17025-b46ae, doc iso17025/documents, single-array schema)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCaJ6vmhob-2rbWgrSXy0y7ZbodI7ZKJsk",
  authDomain: "iso17025-b46ae.firebaseapp.com",
  projectId: "iso17025-b46ae",
  storageBucket: "iso17025-b46ae.firebasestorage.app",
  messagingSenderId: "336569574112",
  appId: "1:336569574112:web:a380f141379e4deedb2685",
  measurementId: "G-TXJNG11ZY4",
};
const firebaseApp = initializeApp(firebaseConfig);
const dbFirestore = getFirestore(firebaseApp);
const docRef = doc(dbFirestore, "iso17025", "documents");

async function loadDocs(){
  try{
    const snap = await getDoc(docRef);
    if(snap.exists() && Array.isArray(snap.data().docs)){
      DOCUMENTS = snap.data().docs;
    } else {
      DOCUMENTS = [];
    }
    // backfill fields for records saved before the approval workflow existed
    let needsMigration = false;
    DOCUMENTS.forEach(d=>{
      if(d.approvalStatus===undefined){ d.approvalStatus = (d.note==='ควบคุม'||d.note==='แจกจ่าย') ? 'อนุมัติแล้ว' : 'ร่าง'; needsMigration = true; }
      if(d.reviewerName===undefined){ d.reviewerName=''; needsMigration = true; }
      if(d.approverName===undefined){ d.approverName=''; needsMigration = true; }
      if(!Array.isArray(d.comments)){ d.comments=[]; needsMigration = true; }
      if(d.lastUpdated===undefined){ d.lastUpdated = Date.now(); needsMigration = true; }
      if(d.preparedBy===undefined){ d.preparedBy=''; needsMigration = true; }
      if(d.rev===undefined){ d.rev=null; needsMigration = true; }
      if(d.createdDate===undefined){ d.createdDate=null; needsMigration = true; }
      if(d.effectiveDate===undefined){ d.effectiveDate=null; needsMigration = true; }
      if(d.approvedBy===undefined){ d.approvedBy=null; needsMigration = true; }
      if(d.approvedAt===undefined){ d.approvedAt=null; needsMigration = true; }
      if(d.approvedComment===undefined){ d.approvedComment=null; needsMigration = true; }
    });
    DOCS_LOADED = true;
    DOCS_ERROR = null;
    if(needsMigration) await persistDocs(true);
  } catch(e){
    console.error('load failed', e);
    DOCS_ERROR = e.message || String(e);
    DOCS_LOADED = false;
  }
}

let saving = false;
async function persistDocs(silent){
  saving = true;
  if(!silent) updateSyncPill();
  try{
    await setDoc(docRef, { docs: DOCUMENTS, updatedAt: Date.now() });
  } catch(e){
    console.error('save failed', e);
    alert('บันทึกไป Firebase ไม่สำเร็จ: ' + e.message);
  }
  saving = false;
  if(!silent) updateSyncPill();
}
function updateSyncPill(){
  const p = document.getElementById('syncPill');
  if(!p) return;
  p.className = 'sync-pill' + (saving ? ' saving' : '');
  p.innerHTML = `<span class="dot"></span>${saving ? 'กำลังบันทึก…' : 'Synced with Firestore'}`;
}

// ============================================================
// APP STATE
// ============================================================
const state = {
  view: 'dashboard',
  selectedClause: '',
  isoTab: 'documents',
  docFilter: { clause:'All', type:'All', status:'All', q:'', preset:'all' },
  docPage: 1,
  selectedDoc: null,
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear(),
  modal: null, // { mode:'new'|'edit', id }
};

const ICONS = {
  doc: `<path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 0v5h5"/>`,
  check: `<path d="m5 12 5 5L20 7"/>`,
  clock: `<path d="M12 7v5l3 3"/><circle cx="12" cy="12" r="9"/>`,
  alert: `<path d="M12 8v5M12 16h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>`,
  user: `<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>`,
  file: `<path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 0v5h5"/>`,
  pdf: `<path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5"/>`,
  link: `<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>`,
  history: `<path d="M12 2a10 10 0 1 0 7.07 2.93M12 2v5h5"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>`,
  empty: `<path d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 0v5h5"/>`,
  edit: `<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>`,
  trash: `<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
};
function ic(name, cls=''){ return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||''}</svg>`; }

function emptyState(title, sub){
  return `<div class="empty-state">${ic('empty')}<h3>${title}</h3><p>${sub}</p></div>`;
}

// display-only: many document names already have the doc ID typed into
// them (e.g. name="RDI-LM-01 คู่มือคุณภาพ"), which duplicates the ID
// column/label everywhere id+name are shown together. Strip it for display.
function cleanName(d){
  if(!d || !d.name) return '';
  const id = (d.id||'').trim();
  let n = d.name.trim();
  if(id && n.startsWith(id)){
    n = n.slice(id.length).replace(/^[\s\-:–—]+/, '').trim();
  }
  return n || d.name;
}

// ============================================================
// BOOT
// ============================================================
async function boot(){
  renderBootScreen('กำลังโหลดข้อมูลจาก Firestore…');
  await loadDocs();
  if(!DOCS_LOADED){
    renderBootError(DOCS_ERROR);
    return;
  }
  removeBootScreen();
  wireNav();
  wireGlobalSearch();
  render();
}
function renderBootScreen(text){
  const el = document.createElement('div');
  el.className = 'boot-screen';
  el.id = 'bootScreen';
  el.innerHTML = `<div class="boot-spinner"></div><div class="boot-text">${text}</div>`;
  document.body.appendChild(el);
}
function renderBootError(msg){
  const el = document.getElementById('bootScreen');
  if(!el) return;
  el.innerHTML = `<div class="boot-error"><h3>โหลดข้อมูลจาก Firebase ไม่สำเร็จ</h3><p>${msg || 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและ Firestore rules ของโปรเจกต์ iso17025-b46ae แล้วลองรีเฟรชหน้านี้อีกครั้ง'}</p></div>`;
}
function removeBootScreen(){
  const el = document.getElementById('bootScreen');
  if(el) el.remove();
}

// ============================================================
// NAV + HISTORY STACK (so "back" returns to the actual previous
// page/filters, not a hardcoded target)
// ============================================================
let navStack = [];
function snapshotState(){
  // state only holds plain data (no functions/DOM refs), safe to deep-clone
  return JSON.parse(JSON.stringify(state));
}
function syncNavActive(){
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===state.view));
}
function wireNav(){
  document.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const extra = btn.dataset.view==='documents' ? { docFilter:{ clause:'All', type:'All', status:'All', q:'', preset:'all' }, docPage:1 } : {};
      goTo(btn.dataset.view, extra);
    });
  });
}
function goTo(view, extra={}){
  navStack.push(snapshotState());
  Object.assign(state, extra);
  state.view = view;
  syncNavActive();
  render();
  window.scrollTo({top:0, behavior:'instant'});
}
function goBack(){
  if(navStack.length){
    const prev = navStack.pop();
    Object.assign(state, prev);
    syncNavActive();
    render();
  } else {
    goTo('dashboard');
  }
  window.scrollTo({top:0, behavior:'instant'});
}
function wireGlobalSearch(){
  const gs = document.getElementById('globalSearch');
  gs.addEventListener('keydown', e=>{
    if(e.key==='Enter'){
      goTo('documents', { docFilter:{ clause:'All', type:'All', status:'All', q:e.target.value, preset:'all' }, docPage:1 });
    }
  });
}

// ============================================================
// RENDER ROOT
// ============================================================
function render(){
  const el = document.getElementById('content');
  switch(state.view){
    case 'dashboard': el.innerHTML = viewDashboard(); break;
    case 'iso': el.innerHTML = viewISO(); attachISOHandlers(); break;
    case 'documents': renderDocumentsInto(); wireDocControls(); return;
    case 'records': el.innerHTML = viewRecords(); break;
    case 'revision': el.innerHTML = viewRevision(); attachDocPicker('revision'); break;
    case 'approval': el.innerHTML = viewApproval(); attachApprovalHandlers(); break;
    case 'audit': el.innerHTML = viewAudit(); attachAuditHandlers(); break;
    case 'calendar': el.innerHTML = viewCalendar(); attachCalHandlers(); break;
    case 'audittrail': el.innerHTML = viewAuditTrail(); break;
    case 'admin': el.innerHTML = viewAdmin(); attachAdminHandlers(); break;
    case 'docdetail': el.innerHTML = viewDocDetail(state.selectedDoc); break;
    default: el.innerHTML = viewDashboard();
  }
  attachGlobalRowHandlers();
}
function attachGlobalRowHandlers(){
  document.querySelectorAll('[data-open-doc]').forEach(row=>{
    row.addEventListener('click', ()=> goTo('docdetail', { selectedDoc: row.dataset.openDoc }));
  });
  document.querySelectorAll('[data-back]').forEach(elx=>{
    elx.addEventListener('click', ()=> goBack());
  });
  document.querySelectorAll('[data-go]').forEach(elx=>{
    elx.addEventListener('click', ()=>{
      if(elx.dataset.preset){
        goTo(elx.dataset.go, { docFilter:{ clause:'All', type:'All', status:'All', q:'', preset:elx.dataset.preset }, docPage:1 });
      } else {
        goTo(elx.dataset.go);
      }
    });
  });
}

// ============================================================
// DASHBOARD
// ============================================================
function viewDashboard(){
  const s = computeStats();
  const comp = complianceByGroup();
  const recent = [...DOCUMENTS].sort((a,b)=> (b.lastUpdated||0)-(a.lastUpdated||0)).slice(0,5);
  const unclassified = unclassifiedDocs().length;

  return `
  <div class="stat-row">
    <div class="stat-card" data-go="documents" data-preset="all" style="cursor:pointer;"><div class="stat-icon blue">${ic('doc')}</div>
      <div><div class="stat-num">${s.total}</div><div class="stat-label">Documents ทั้งหมด</div></div></div>
    <div class="stat-card" data-go="documents" data-preset="active" style="cursor:pointer;"><div class="stat-icon green">${ic('check')}</div>
      <div><div class="stat-num">${s.active}</div><div class="stat-label">ควบคุม / แจกจ่าย (ใช้งานอยู่)</div></div></div>
    <div class="stat-card" data-go="documents" data-preset="pending" style="cursor:pointer;"><div class="stat-icon amber">${ic('clock')}</div>
      <div><div class="stat-num">${s.pending}</div><div class="stat-label">รอทบทวน / รออนุมัติ</div></div></div>
    <div class="stat-card" data-go="documents" data-preset="attention" style="cursor:pointer;"><div class="stat-icon red">${ic('alert')}</div>
      <div><div class="stat-num">${s.attention}</div><div class="stat-label">ต้องตรวจสอบ (ไม่พบ / ไม่อนุมัติ)</div></div></div>
  </div>

  <div class="grid grid-2">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Compliance ตามหมวดข้อกำหนด</div><div style="font-size:11px; color:var(--ink-500); font-weight:600;">% เอกสารที่อนุมัติแล้ว</div></div>
      ${comp.map(c=>`
        <div class="prog-row">
          <div class="prog-badge">${c.id}</div>
          <div class="prog-label">${c.label}</div>
          <div class="prog-track"><div class="prog-fill" style="width:${c.pct}%"></div></div>
          <div class="prog-pct">${c.pct}%</div>
        </div>`).join('')}
      ${unclassified ? `<div style="margin-top:12px; font-size:11.5px; color:var(--ink-500);">มีเอกสาร <b style="color:var(--ink-900);">${unclassified}</b> รายการที่ยังไม่ได้ระบุข้อกำหนด <span class="panel-link" data-go="documents" data-preset="unclassified" style="cursor:pointer;">ดูรายการ</span></div>` : ''}
    </div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Action Required</div></div>
      <div class="action-item" data-go="documents" data-preset="missing" style="cursor:pointer;">
        <div class="action-dot red">${ic('alert')}</div>
        <div class="action-text">เอกสารสถานะ "ไม่พบ" ในทะเบียน</div>
        <div class="action-count">${DOCUMENTS.filter(d=>d.note==='ไม่พบ').length} รายการ</div>
      </div>
      <div class="action-item" data-go="documents" data-preset="rejected" style="cursor:pointer;">
        <div class="action-dot red">${ic('alert')}</div>
        <div class="action-text">ถูกปฏิเสธการอนุมัติ (ไม่อนุมัติ)</div>
        <div class="action-count">${DOCUMENTS.filter(d=>d.approvalStatus==='ไม่อนุมัติ').length} รายการ</div>
      </div>
      <div class="action-item" data-go="documents" data-preset="waitingreview" style="cursor:pointer;">
        <div class="action-dot amber">${ic('clock')}</div>
        <div class="action-text">รอทบทวน</div>
        <div class="action-count">${DOCUMENTS.filter(d=>d.approvalStatus==='รอทบทวน').length} รายการ</div>
      </div>
      <div class="action-item" data-go="documents" data-preset="waitingapproval" style="cursor:pointer;">
        <div class="action-dot amber">${ic('clock')}</div>
        <div class="action-text">รออนุมัติ</div>
        <div class="action-count">${DOCUMENTS.filter(d=>d.approvalStatus==='รออนุมัติ').length} รายการ</div>
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head"><div class="panel-title">Recently Updated</div><button class="panel-link" data-go="documents">View all</button></div>
    ${recent.map(d=>`
      <div class="rowline" data-open-doc="${d.id}" style="cursor:pointer">
        <div class="file-ic">${ic('file')}</div>
        <div class="rl-main">
          <div class="rl-title">${d.id} &nbsp;${cleanName(d)}</div>
          <div class="rl-sub">${fmtDateTime(d.lastUpdated)} · ${docTypeLabel(d)}</div>
        </div>
        ${statusBadge(d.note)}
      </div>`).join('')}
  </div>
  `;
}

// ============================================================
// ISO 17025 VIEW (clause tree + tabs)
// ============================================================
function viewISO(){
  const unclassified = unclassifiedDocs().length;
  return `
  <div class="grid" style="grid-template-columns:270px 1fr; align-items:start;">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">ISO/IEC 17025:2017</div></div>
      <div class="clause-tree">
        <div class="clause-leaf ${state.selectedClause===''?'active':''}" data-clause="" style="font-weight:700; margin-bottom:4px;">ไม่ระบุข้อกำหนด (${unclassified})</div>
        ${CLAUSE_TREE.map(g=>`
          <div class="clause-group">
            <div class="clause-group-head"><span class="n">${g.id}</span>${g.title}</div>
            <div class="clause-children">
              ${g.children.map(c=>`<div class="clause-leaf ${c.id===state.selectedClause?'active':''}" data-clause="${c.id}">${c.id} ${c.title}</div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="panel" id="isoDetailPanel">${isoDetailContent()}</div>
  </div>`;
}
function isoDetailContent(){
  const clause = state.selectedClause;
  const docs = DOCUMENTS.filter(d=> (d.clause||'')===clause);
  const evidence = docs.filter(d=> d.note==='สนับสนุน');
  const related = clause ? CLAUSE_TREE.flatMap(g=>g.children).filter(c=> c.id!==clause && groupOf(c.id)===groupOf(clause)) : [];

  const tabs = [
    {k:'documents', label:'Documents', n:docs.length},
    {k:'evidence', label:'Evidence/Support', n:evidence.length},
    {k:'related', label:'Related', n:related.length},
  ];
  return `
    <div class="panel-title" style="margin-bottom:14px;">${clause ? clauseLabel(clause) : 'เอกสารที่ยังไม่ได้ระบุข้อกำหนด'}</div>
    <div class="tabs">${tabs.map(t=>`<button class="tab ${state.isoTab===t.k?'active':''}" data-isotab="${t.k}">${t.label}<span class="cnt">${t.n}</span></button>`).join('')}</div>
    <div id="isoTabBody">${isoTabBody(docs, evidence, related)}</div>
  `;
}
function isoTabBody(docs, evidence, related){
  if(state.isoTab==='documents'){
    if(!docs.length) return emptyState('ยังไม่มีเอกสารในข้อกำหนดนี้','No documents linked to this clause yet.');
    return docTable(docs);
  }
  if(state.isoTab==='evidence'){
    if(!evidence.length) return emptyState('ยังไม่มีเอกสารสนับสนุนในข้อกำหนดนี้','No supporting/reference documents linked here.');
    return docTable(evidence);
  }
  if(!related.length) return emptyState('ไม่มีข้อกำหนดที่เกี่ยวข้อง','No related clauses in this group.');
  return `<div style="display:flex; flex-direction:column; gap:2px;">${related.map(r=>`<div class="audit-link" data-clause-jump="${r.id}"><span class="dot"></span>${r.id} ${r.title}</div>`).join('')}</div>`;
}
function docTable(docs){
  return `<div class="table-wrap"><table class="dtable">
    <thead><tr><th>Document ID</th><th>Document Name</th><th>Type</th><th>Status</th><th>Approval</th><th>Last Updated</th></tr></thead>
    <tbody>${docs.map(d=>`<tr data-open-doc="${d.id}">
      <td class="mono">${d.id}</td><td class="name">${cleanName(d)}</td><td>${docTypeLabel(d)}</td>
      <td>${statusBadge(d.note)}</td><td>${approvalBadge(d.approvalStatus)}</td><td>${fmtDate(d.lastUpdated)}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}
function attachISOHandlers(){
  document.querySelectorAll('[data-clause]').forEach(elx=>{
    elx.addEventListener('click', ()=>{
      state.selectedClause = elx.dataset.clause;
      state.isoTab = 'documents';
      document.getElementById('isoDetailPanel').innerHTML = isoDetailContent();
      document.querySelectorAll('.clause-leaf').forEach(l=>l.classList.toggle('active', l.dataset.clause===state.selectedClause));
      attachISOTabHandlers(); attachGlobalRowHandlers();
    });
  });
  attachISOTabHandlers();
}
function attachISOTabHandlers(){
  document.querySelectorAll('[data-isotab]').forEach(elx=>{
    elx.addEventListener('click', ()=>{
      state.isoTab = elx.dataset.isotab;
      document.getElementById('isoDetailPanel').innerHTML = isoDetailContent();
      attachISOTabHandlers(); attachGlobalRowHandlers();
    });
  });
  document.querySelectorAll('[data-clause-jump]').forEach(elx=>{
    elx.addEventListener('click', ()=>{
      state.selectedClause = elx.dataset.clauseJump;
      state.isoTab = 'documents';
      document.getElementById('isoDetailPanel').innerHTML = isoDetailContent();
      attachISOTabHandlers(); attachGlobalRowHandlers();
    });
  });
}

// ============================================================
// DOCUMENTS LIST VIEW (+ full CRUD, writes to Firestore)
// ============================================================
const DOC_PRESETS = {
  all: d=> true,
  active: d=> d.note==='ควบคุม' || d.note==='แจกจ่าย',
  pending: d=> d.approvalStatus==='รอทบทวน' || d.approvalStatus==='รออนุมัติ',
  attention: d=> d.note==='ไม่พบ' || d.approvalStatus==='ไม่อนุมัติ',
  missing: d=> d.note==='ไม่พบ',
  rejected: d=> d.approvalStatus==='ไม่อนุมัติ',
  waitingreview: d=> d.approvalStatus==='รอทบทวน',
  waitingapproval: d=> d.approvalStatus==='รออนุมัติ',
  unclassified: d=> !d.clause,
};
function filteredDocs(){
  const presetFn = DOC_PRESETS[state.docFilter.preset] || DOC_PRESETS.all;
  return DOCUMENTS.filter(d=>{
    if(!presetFn(d)) return false;
    if(state.docFilter.clause!=='All' && (d.clause||'')!==state.docFilter.clause) return false;
    if(state.docFilter.type!=='All' && docTypeCode(d)!==state.docFilter.type) return false;
    if(state.docFilter.status!=='All' && d.note!==state.docFilter.status) return false;
    if(state.docFilter.q){
      const q = state.docFilter.q.toLowerCase();
      if(!d.id.toLowerCase().includes(q) && !d.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
function renderDocumentsInto(){
  const el = document.getElementById('content');
  const list = filteredDocs();
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(list.length/pageSize));
  state.docPage = Math.min(state.docPage, pages);
  const start = (state.docPage-1)*pageSize;
  const pageItems = list.slice(start, start+pageSize);

  const clauseOpts = [['All','ทุกข้อกำหนด'], ['','ไม่ระบุ'], ...CLAUSES];
  const typeOpts = [['All','ทุกประเภท'], ...Object.entries(DOC_TYPE_MAP)];
  const statusOpts = ['All','ควบคุม','แจกจ่าย','สนับสนุน','ยกเลิก','ว่าง','ไม่พบ'];
  const PRESET_LABEL = { active:'ควบคุม/แจกจ่าย', pending:'รอทบทวน/รออนุมัติ', attention:'ต้องตรวจสอบ', missing:'ไม่พบ', rejected:'ไม่อนุมัติ', waitingreview:'รอทบทวน', waitingapproval:'รออนุมัติ', unclassified:'ไม่ระบุข้อกำหนด' };
  const presetActive = state.docFilter.preset && state.docFilter.preset!=='all';

  el.innerHTML = `
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Document List <span id="syncPill" class="sync-pill" style="margin-left:10px;"><span class="dot"></span>Synced with Firestore</span></div>
      <button class="btn primary" id="btnNewDoc">${ic('plus')} New Document</button></div>
    <div class="toolbar">
      <div class="search"><span>${ic('search')}</span><input id="docSearch" placeholder="Search documents..." value="${state.docFilter.q}"></div>
      <select class="select" id="fClause">${clauseOpts.map(([v,l])=>`<option value="${v}" ${v===state.docFilter.clause?'selected':''}>${l}</option>`).join('')}</select>
      <select class="select" id="fType">${typeOpts.map(([v,l])=>`<option value="${v}" ${v===state.docFilter.type?'selected':''}>${l}</option>`).join('')}</select>
      <select class="select" id="fStatus">${statusOpts.map(s=>`<option ${s===state.docFilter.status?'selected':''}>${s}</option>`).join('')}</select>
      ${presetActive ? `<button class="btn ghost" id="btnClearPreset">✕ ${PRESET_LABEL[state.docFilter.preset]||''}</button>` : ''}
      <div class="spacer"></div>
      <div style="font-size:12px; color:var(--ink-500); font-weight:600;">${list.length} entries</div>
    </div>
    <div class="table-wrap"><table class="dtable">
      <thead><tr><th>Document ID</th><th>Document Name</th><th>Clause</th><th>Type</th><th>Status</th><th>Approval</th><th>Updated</th><th></th></tr></thead>
      <tbody>
        ${pageItems.length ? pageItems.map(d=>`
        <tr data-open-doc="${d.id}">
          <td class="mono">${d.id}</td><td class="name">${cleanName(d)}</td><td>${d.clause || '<span style="color:var(--ink-400);">—</span>'}</td>
          <td>${docTypeLabel(d)}</td><td>${statusBadge(d.note)}</td><td>${approvalBadge(d.approvalStatus)}</td><td>${fmtDate(d.lastUpdated)}</td>
          <td><div class="row-actions" onclick="event.stopPropagation()">
            <button data-edit="${d.id}" title="Edit">${ic('edit')}</button>
            <button data-del="${d.id}" class="del" title="Delete">${ic('trash')}</button>
          </div></td>
        </tr>`).join('') : `<tr><td colspan="8" style="text-align:center; padding:40px 0; color:var(--ink-500);">No documents match your filters.</td></tr>`}
      </tbody>
    </table></div>
    <div class="pagination">
      <div>Showing ${pageItems.length?start+1:0}–${start+pageItems.length} of ${list.length} entries</div>
      <div class="pg-btns">
        <button ${state.docPage===1?'disabled':''} id="pgPrev">‹</button>
        ${Array.from({length:pages}).map((_,i)=>`<button class="${i+1===state.docPage?'active':''}" data-pg="${i+1}">${i+1}</button>`).join('')}
        <button ${state.docPage===pages?'disabled':''} id="pgNext">›</button>
      </div>
    </div>
  </div>
  ${state.modal ? docModal() : ''}
  `;
}
function wireDocControls(){
  const search = document.getElementById('docSearch');
  if(search) search.addEventListener('input', e=>{ state.docFilter.q = e.target.value; state.docPage=1; renderDocumentsInto(); wireDocControls(); });
  const fc = document.getElementById('fClause');
  if(fc) fc.addEventListener('change', e=>{ state.docFilter.clause = e.target.value; state.docFilter.preset='all'; state.docPage=1; renderDocumentsInto(); wireDocControls(); });
  const ft = document.getElementById('fType');
  if(ft) ft.addEventListener('change', e=>{ state.docFilter.type = e.target.value; state.docFilter.preset='all'; state.docPage=1; renderDocumentsInto(); wireDocControls(); });
  const fs = document.getElementById('fStatus');
  if(fs) fs.addEventListener('change', e=>{ state.docFilter.status = e.target.value; state.docFilter.preset='all'; state.docPage=1; renderDocumentsInto(); wireDocControls(); });
  const clearPreset = document.getElementById('btnClearPreset');
  if(clearPreset) clearPreset.addEventListener('click', ()=>{ state.docFilter.preset='all'; state.docPage=1; renderDocumentsInto(); wireDocControls(); });
  document.querySelectorAll('[data-pg]').forEach(b=>b.addEventListener('click', ()=>{ state.docPage=parseInt(b.dataset.pg,10); renderDocumentsInto(); wireDocControls(); }));
  const prev = document.getElementById('pgPrev'); if(prev) prev.addEventListener('click', ()=>{ state.docPage=Math.max(1,state.docPage-1); renderDocumentsInto(); wireDocControls(); });
  const next = document.getElementById('pgNext'); if(next) next.addEventListener('click', ()=>{ state.docPage=state.docPage+1; renderDocumentsInto(); wireDocControls(); });
  const btnNew = document.getElementById('btnNewDoc');
  if(btnNew) btnNew.addEventListener('click', ()=>{ state.modal = { mode:'new' }; renderDocumentsInto(); wireDocControls(); });
  document.querySelectorAll('[data-edit]').forEach(b=> b.addEventListener('click', ()=>{ state.modal = { mode:'edit', id:b.dataset.edit }; renderDocumentsInto(); wireDocControls(); }));
  document.querySelectorAll('[data-del]').forEach(b=> b.addEventListener('click', async ()=>{
    const d = DOCUMENTS.find(x=>x.id===b.dataset.del);
    if(!d) return;
    if(!confirm(`ลบเอกสาร "${d.id} ${d.name}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    DOCUMENTS = DOCUMENTS.filter(x=>x.id!==d.id);
    await persistDocs();
    renderDocumentsInto(); wireDocControls();
  }));
  wireModalControls();
  attachGlobalRowHandlers();
}
function docModal(){
  const editing = state.modal.mode==='edit';
  const d = editing ? DOCUMENTS.find(x=>x.id===state.modal.id) : { id:'', name:'', clause:'', link:'', note:'ควบคุม' };
  return `
  <div class="modal-backdrop" id="docModalBackdrop">
    <div class="modal">
      <div class="modal-head"><div class="modal-title">${editing?'แก้ไขเอกสาร':'เอกสารใหม่'}</div><button class="modal-close" id="modalCloseBtn">✕</button></div>
      <div class="modal-body">
        <div class="field"><label>รหัสเอกสาร (Document ID)</label>
          <input id="mfId" value="${d.id}" placeholder="เช่น RDI-LF-074" ${editing?'disabled':''}></div>
        <div class="field"><label>ชื่อเอกสาร</label>
          <input id="mfName" value="${d.name.replace(/"/g,'&quot;')}" placeholder="ชื่อเอกสาร"></div>
        <div class="field"><label>ข้อกำหนด ISO 17025</label>
          <select id="mfClause"><option value="">ไม่ระบุ</option>${CLAUSES.map(([c,l])=>`<option value="${c}" ${d.clause===c?'selected':''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>ลิงก์ SharePoint</label>
          <input id="mfLink" value="${d.link||''}" placeholder="https://mitrphol.sharepoint.com/..."></div>
        <div class="field"><label>สถานะเอกสาร</label>
          <select id="mfNote">${['ควบคุม','แจกจ่าย','สนับสนุน','ยกเลิก','ว่าง','ไม่พบ'].map(s=>`<option ${d.note===s?'selected':''}>${s}</option>`).join('')}</select></div>
        <div class="field-error" id="mfError" style="display:none;"></div>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="modalCancelBtn">ยกเลิก</button>
        <button class="btn primary" id="modalSaveBtn">${editing?'บันทึกการแก้ไข':'สร้างเอกสาร'}</button>
      </div>
    </div>
  </div>`;
}
function wireModalControls(){
  const backdrop = document.getElementById('docModalBackdrop');
  if(!backdrop) return;
  const close = ()=>{ state.modal = null; renderDocumentsInto(); wireDocControls(); };
  document.getElementById('modalCloseBtn').addEventListener('click', close);
  document.getElementById('modalCancelBtn').addEventListener('click', close);
  backdrop.addEventListener('click', e=>{ if(e.target===backdrop) close(); });

  document.getElementById('modalSaveBtn').addEventListener('click', async ()=>{
    const id = document.getElementById('mfId').value.trim();
    const name = document.getElementById('mfName').value.trim();
    const clause = document.getElementById('mfClause').value;
    const link = document.getElementById('mfLink').value.trim();
    const note = document.getElementById('mfNote').value;
    const errEl = document.getElementById('mfError');
    if(!id || !name){ errEl.textContent = 'กรอกรหัสเอกสารและชื่อเอกสารให้ครบ'; errEl.style.display='block'; return; }

    if(state.modal.mode==='new'){
      if(DOCUMENTS.some(x=>x.id===id)){ errEl.textContent = 'รหัสเอกสารนี้มีอยู่แล้ว'; errEl.style.display='block'; return; }
      DOCUMENTS.push({
        id, name, clause, link, note,
        approvalStatus: (note==='ควบคุม'||note==='แจกจ่าย') ? 'อนุมัติแล้ว' : 'ร่าง',
        reviewerName:'', approverName:'', comments:[], lastUpdated: Date.now(),
      });
    } else {
      const d = DOCUMENTS.find(x=>x.id===state.modal.id);
      d.name = name; d.clause = clause; d.link = link; d.note = note; d.lastUpdated = Date.now();
    }
    state.modal = null;
    renderDocumentsInto(); wireDocControls();
    await persistDocs();
    renderDocumentsInto(); wireDocControls();
  });
}

// ============================================================
// RECORDS VIEW — this dataset has no separate "records" collection;
// the closest real analog is the LF (form/record) document type.
// ============================================================
function viewRecords(){
  const recs = DOCUMENTS.filter(d=> docTypeCode(d)==='LF');
  return `
  <div class="panel">
    <div class="panel-head">
      <div><div class="panel-title">Records</div><div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">แบบฟอร์ม/บันทึกผล (เอกสารประเภท LF) — ทะเบียนนี้ยังไม่มีคอลเลกชัน "Records" แยกต่างหากใน Firestore</div></div>
    </div>
    ${recs.length ? docTable(recs) : emptyState('ไม่มีเอกสารประเภทแบบฟอร์ม','No LF-type documents found.')}
  </div>`;
}

// ============================================================
// DOCUMENT DETAIL
// ============================================================
function viewDocDetail(docId){
  const d = DOCUMENTS.find(x=>x.id===docId);
  if(!d) return `<div class="panel">${emptyState('ไม่พบเอกสาร','This document may have been deleted.')}</div>`;
  return `
  <div class="crumb" data-back="1">‹ Back</div>
  <div class="panel">
    <div class="detail-head">
      <div class="doc-thumb">${ic('pdf')}<span>${docTypeCode(d)}</span></div>
      <div style="flex:1;">
        <div class="detail-title-row"><div class="detail-title">${d.id}</div>${statusBadge(d.note)}${approvalBadge(d.approvalStatus)}</div>
        <div class="detail-sub">${cleanName(d)}${d.rev ? ` <span style="color:var(--ink-500); font-weight:600;">· Rev.${d.rev}</span>` : ''}</div>
        <div class="kv-row"><div class="k">ประเภท</div><div class="v">${docTypeLabel(d)}</div></div>
        <div class="kv-row"><div class="k">วันที่จัดทำ</div><div class="v">${d.createdDate ? fmtDate(d.createdDate) : '—'}</div></div>
        <div class="kv-row"><div class="k">วันที่ประกาศใช้</div><div class="v">${d.effectiveDate ? fmtDate(d.effectiveDate) : '—'}</div></div>
        <div class="kv-row"><div class="k">อัปเดตล่าสุด</div><div class="v">${fmtDateTime(d.lastUpdated)}</div></div>
        <div class="kv-row"><div class="k">ผู้จัดทำ</div><div class="v">${d.preparedBy || '—'}</div></div>
        <div class="kv-row"><div class="k">ผู้ทบทวน</div><div class="v">${d.reviewerName || '—'}</div></div>
        <div class="kv-row"><div class="k">ผู้อนุมัติ</div><div class="v">${d.approverName || '—'}</div></div>
        <div class="detail-actions">
          ${d.link ? `<a class="btn primary" href="${d.link}" target="_blank" rel="noopener">${ic('link')} Open in SharePoint</a>` : `<button class="btn ghost" disabled>${ic('link')} ยังไม่มีลิงก์ SharePoint</button>`}
          <button class="btn ghost" data-go="approval">${ic('check')} Approval</button>
          <button class="btn ghost" data-go="revision">${ic('history')} History</button>
        </div>
      </div>
      <div class="side-box" style="width:230px;">
        <div class="side-box-title">ISO/IEC 17025</div>
        <div class="clause-chip">${d.clause ? ic('check') : ''}${d.clause ? clauseLabel(d.clause) : 'ยังไม่ได้ระบุข้อกำหนด'}</div>
      </div>
    </div>
    <div class="desc-block" style="margin-top:18px;">
      <b>ความคิดเห็นล่าสุด:</b><br>
      ${(d.comments||[]).slice(-1).map(c=>`${c.by}: ${c.text} <span style="color:var(--ink-500);">(${fmtDateTime(c.time)})</span>`).join('') || 'ยังไม่มีความเห็น'}
    </div>
  </div>`;
}

// ============================================================
// REVISION / HISTORY VIEW — honest version: this system tracks a
// single lastUpdated timestamp + a comment trail, not versioned
// revisions, so we show exactly that rather than inventing Rev.00-03.
// ============================================================
function viewRevision(){
  if(!state.selectedDoc) state.selectedDoc = DOCUMENTS[0] && DOCUMENTS[0].id;
  const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
  if(!d) return `<div class="panel">${emptyState('ยังไม่มีเอกสาร','No documents in the register yet.')}</div>`;
  const timeline = [
    { label:'สร้าง/แก้ไขล่าสุด', date:d.lastUpdated, desc:`สถานะปัจจุบัน: ${d.note} · การอนุมัติ: ${d.approvalStatus}` },
    ...(d.comments||[]).slice().reverse().map(c=>({ label:c.by, date:c.time, desc:c.text })),
    ...(d.effectiveDate ? [{ label:'ประกาศใช้', date:d.effectiveDate, desc:`ผู้อนุมัติ: ${d.approverName || 'ไม่ระบุ'}` }] : []),
    ...(d.createdDate ? [{ label:'จัดทำเอกสาร', date:d.createdDate, desc:`ผู้จัดทำ: ${d.preparedBy || 'ไม่ระบุ'}` }] : []),
  ].sort((a,b)=> (b.date||0)-(a.date||0));
  return `
  <div class="crumb" data-back="1">‹ Back</div>
  <div class="panel">
    <div class="panel-head">
      <div class="panel-title">History — ${d.id} ${cleanName(d)}</div>
      <select class="select" id="revDocPicker">${DOCUMENTS.map(x=>`<option value="${x.id}" ${x.id===d.id?'selected':''}>${x.id}</option>`).join('')}</select>
    </div>
    <div style="font-size:11.5px; color:var(--ink-500); margin-bottom:14px;">ระบบนี้เก็บเวลาที่แก้ไขล่าสุดและประวัติความเห็นการอนุมัติ ยังไม่ได้เก็บเลข Revision แยกเป็นเวอร์ชันย้อนหลัง</div>
    <div class="timeline">
      ${timeline.length ? timeline.map((t,i)=>`
        <div class="tl-item ${i>0?'old':''}">
          <div class="tl-dot"></div>
          <div class="tl-head"><div class="tl-rev">${t.label}</div><div class="tl-date">${fmtDateTime(t.date)}</div></div>
          <div class="tl-desc">${t.desc}</div>
        </div>`).join('') : emptyState('ยังไม่มีประวัติ','No history recorded yet.')}
    </div>
  </div>`;
}

// ============================================================
// APPROVAL VIEW (ported logic from previous app — actor name +
// comment required, writes STATUS_FLOW transitions to Firestore)
// ============================================================
function viewApproval(){
  if(!state.selectedDoc) state.selectedDoc = DOCUMENTS[0] && DOCUMENTS[0].id;
  const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
  if(!d) return `<div class="panel">${emptyState('ยังไม่มีเอกสาร','No documents in the register yet.')}</div>`;
  const status = d.approvalStatus || 'ร่าง';
  const currentIdx = STATUS_FLOW.indexOf(status);
  const isRejected = status === 'ไม่อนุมัติ';

  const steps = STATUS_FLOW.map((s,i)=>{
    const done = !isRejected && i<=currentIdx;
    const isNext = !isRejected && i===currentIdx+1;
    return { label:s, cls: done?'done':(isNext?'pending':'waiting') };
  });

  const isApproved = status === 'อนุมัติแล้ว';
  // fallback for docs approved before approvedBy/approvedAt existed: use the
  // most recent comment as a best-effort approver record
  const lastComment = (d.comments||[])[ (d.comments||[]).length-1 ];
  const approvedBy = d.approvedBy || (lastComment ? lastComment.by : '');
  const approvedAt = d.approvedAt || (lastComment ? lastComment.time : d.lastUpdated);
  const approvedComment = d.approvedComment !== undefined ? d.approvedComment : (lastComment ? lastComment.text : '');

  return `
  <div class="crumb" data-back="1">‹ Back</div>
  <div class="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title">${d.id} ${cleanName(d)}</div>
        <div style="font-size:12px; color:var(--ink-500); margin-top:3px; font-weight:600;">ข้อกำหนด: ${d.clause ? clauseLabel(d.clause) : 'ไม่ระบุ'}</div>
      </div>
      <select class="select" id="apDocPicker">${DOCUMENTS.map(x=>`<option value="${x.id}" ${x.id===d.id?'selected':''}>${x.id}</option>`).join('')}</select>
    </div>

    <div class="approval-flow">
      ${steps.map((s,i)=>`
        ${i>0?`<div class="af-line ${steps[i-1].cls==='done'?'done':''}"></div>`:''}
        <div class="af-step">
          <div class="af-circle ${s.cls}">${ic(s.cls==='done'?'check':'clock')}</div>
          <div class="af-name">${s.label}</div>
          <div class="af-status ${s.cls}">${s.cls==='done'?'Done':s.cls==='pending'?'Pending':'Waiting'}</div>
        </div>`).join('')}
      ${isRejected ? `<div class="af-line"></div><div class="af-step"><div class="af-circle" style="border-color:var(--red-600); background:var(--red-50);">${ic('alert')}</div><div class="af-name">ไม่อนุมัติ</div><div class="af-status" style="background:var(--red-50); color:var(--red-600);">Rejected</div></div>` : ''}
    </div>

    ${isApproved ? `
    <div class="side-box" style="border-color:var(--green-600); background:var(--green-50);">
      <div class="side-box-title" style="color:var(--green-600);">อนุมัติแล้ว</div>
      <div style="font-size:13px; color:var(--ink-900); font-weight:700;">${approvedBy || 'ไม่ระบุผู้อนุมัติ'}</div>
      <div style="font-size:12px; color:var(--ink-500); margin-top:2px;">${fmtDateTime(approvedAt)}</div>
      ${approvedComment ? `<div style="font-size:12.5px; color:var(--ink-700); margin-top:8px; padding-top:8px; border-top:1px solid var(--line);">${approvedComment}</div>` : ''}
    </div>
    ` : `
    <div class="field" style="max-width:320px;"><label>ชื่อผู้ดำเนินการ</label><input id="approvalActor" placeholder="ชื่อ-นามสกุล"></div>
    <div class="comment-box">
      <label style="font-size:12px; font-weight:700; color:var(--ink-700); display:block; margin-bottom:8px;">ความเห็น (จำเป็นถ้ากด "ไม่อนุมัติ")</label>
      <textarea id="approvalComment" placeholder="Enter comment..."></textarea>
      <div id="approvalError" class="field-error" style="display:none;"></div>
      <div class="comment-actions">
        <button class="btn danger" id="btnReject">Reject</button>
        <button class="btn success" id="btnApprove">${currentIdx===STATUS_FLOW.length-2 ? 'Final Approve':'Approve / Next Step'}</button>
      </div>
    </div>
    `}

    <div class="panel-title" style="margin:20px 0 10px;">ประวัติความเห็น</div>
    ${(d.comments||[]).slice().reverse().map(c=>`
      <div class="at-item"><div class="at-icon">${ic('user')}</div>
        <div class="at-main"><div class="at-title">${c.by}</div><div class="at-meta">${c.text}</div></div>
        <div class="at-time">${fmtDateTime(c.time)}</div>
      </div>`).join('') || `<div style="color:var(--ink-500); font-size:12.5px;">ยังไม่มีความเห็น</div>`}
  </div>`;
}
function attachApprovalHandlers(){
  const picker = document.getElementById('apDocPicker');
  if(picker) picker.addEventListener('change', e=>{ state.selectedDoc = e.target.value; render(); });

  const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
  if(!d) return;
  const status = d.approvalStatus || 'ร่าง';
  const currentIdx = STATUS_FLOW.indexOf(status);

  const approveBtn = document.getElementById('btnApprove');
  if(approveBtn) approveBtn.addEventListener('click', async ()=>{
    const actor = document.getElementById('approvalActor').value.trim();
    const errEl = document.getElementById('approvalError');
    if(!actor){ errEl.textContent='กรอกชื่อผู้ดำเนินการก่อน'; errEl.style.display='block'; return; }
    const comment = document.getElementById('approvalComment').value.trim();
    const nextIdx = Math.min(currentIdx+1, STATUS_FLOW.length-1);
    const now = Date.now();
    d.approvalStatus = STATUS_FLOW[nextIdx];
    d.lastUpdated = now;
    d.comments = d.comments || [];
    d.comments.push({ by:actor, text: comment || `อนุมัติ → ${d.approvalStatus}`, time: now });
    if(d.approvalStatus==='อนุมัติแล้ว'){
      d.approvedBy = actor;
      d.approvedAt = now;
      d.approvedComment = comment || '';
    }
    render();
    await persistDocs();
  });
  const rejectBtn = document.getElementById('btnReject');
  if(rejectBtn) rejectBtn.addEventListener('click', async ()=>{
    const actor = document.getElementById('approvalActor').value.trim();
    const comment = document.getElementById('approvalComment').value.trim();
    const errEl = document.getElementById('approvalError');
    if(!actor){ errEl.textContent='กรอกชื่อผู้ดำเนินการก่อน'; errEl.style.display='block'; return; }
    if(!comment){ errEl.textContent='กรอกความเห็นก่อนกด "ไม่อนุมัติ"'; errEl.style.display='block'; return; }
    d.approvalStatus = 'ไม่อนุมัติ';
    d.lastUpdated = Date.now();
    d.comments = d.comments || [];
    d.comments.push({ by:actor, text:comment, time: Date.now() });
    d.approvedBy = null; d.approvedAt = null; d.approvedComment = null;
    render();
    await persistDocs();
  });
}

// ============================================================
// AUDIT VIEW — clause coverage from real data
// ============================================================
function viewAudit(){
  const clause = state.selectedClause;
  const docs = DOCUMENTS.filter(d=> (d.clause||'')===clause);
  const evidence = docs.filter(d=> d.note==='สนับสนุน');
  const related = clause ? CLAUSE_TREE.flatMap(g=>g.children).filter(c=> c.id!==clause && groupOf(c.id)===groupOf(clause)) : [];
  const approvedCount = docs.filter(d=>d.approvalStatus==='อนุมัติแล้ว').length;

  return `
  <div class="panel">
    <div class="clause-select-row">
      <div class="panel-title">Select Clause</div>
      <select class="select" id="auditClausePicker">
        <option value="">ไม่ระบุข้อกำหนด</option>
        ${CLAUSES.map(([c,l])=>`<option value="${c}" ${c===clause?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="audit-stat-grid">
      <div class="audit-stat"><div class="num">${docs.length}</div><div class="lbl">Documents</div></div>
      <div class="audit-stat"><div class="num">${approvedCount}</div><div class="lbl">Approved</div></div>
      <div class="audit-stat"><div class="num">${evidence.length}</div><div class="lbl">Evidence/Support</div></div>
      <div class="audit-stat"><div class="num">${related.length}</div><div class="lbl">Related Clauses</div></div>
    </div>
    <div class="audit-cols" style="grid-template-columns:1fr 1fr 1fr;">
      <div><div class="audit-col-title">Documents</div>
        ${docs.length ? docs.map(d=>`<div class="audit-link" data-open-doc="${d.id}"><span class="dot"></span>${d.id} ${cleanName(d)}</div>`).join('') : `<div style="color:var(--ink-400); font-size:12px;">—</div>`}</div>
      <div><div class="audit-col-title">Evidence / Support</div>
        ${evidence.length ? evidence.map(d=>`<div class="audit-link" data-open-doc="${d.id}"><span class="dot"></span>${d.id} ${cleanName(d)}</div>`).join('') : `<div style="color:var(--ink-400); font-size:12px;">—</div>`}</div>
      <div><div class="audit-col-title">Related</div>
        ${related.map(r=>`<div class="audit-link" data-clause-jump-audit="${r.id}"><span class="dot"></span>${r.id} ${r.title}</div>`).join('') || `<div style="color:var(--ink-400); font-size:12px;">—</div>`}</div>
    </div>
  </div>`;
}
function attachAuditHandlers(){
  const picker = document.getElementById('auditClausePicker');
  if(picker) picker.addEventListener('change', e=>{ state.selectedClause = e.target.value; render(); });
  document.querySelectorAll('[data-clause-jump-audit]').forEach(elx=>{
    elx.addEventListener('click', ()=>{ state.selectedClause = elx.dataset.clauseJumpAudit; render(); });
  });
}

// ============================================================
// DOC PICKER (shared by revision/approval views)
// ============================================================
function attachDocPicker(view){
  const el = document.getElementById(view==='revision'?'revDocPicker':'apDocPicker');
  if(el) el.addEventListener('change', e=>{ state.selectedDoc = e.target.value; render(); });
}

// ============================================================
// REVIEW CALENDAR — real activity calendar built from lastUpdated
// (not a fabricated review-due schedule, since that field doesn't exist)
// ============================================================
function viewCalendar(){
  const dows = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const year = state.calYear, month = state.calMonth;
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay()+6)%7;
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const monthName = first.toLocaleDateString('en-GB', { month:'long', year:'numeric' });

  const byDay = {};
  DOCUMENTS.forEach(d=>{
    if(!d.lastUpdated) return;
    const dt = new Date(d.lastUpdated);
    if(dt.getFullYear()===year && dt.getMonth()===month){
      const day = dt.getDate();
      (byDay[day] = byDay[day]||[]).push(d);
    }
  });

  let cells = '';
  for(let i=0;i<startOffset;i++) cells += `<div class="fc-cell dim">${prevDays-startOffset+1+i}</div>`;
  for(let d=1; d<=daysInMonth; d++){
    const items = byDay[d];
    cells += `<div class="fc-cell">${d}${items?`<div class="fc-badges"><span class="fc-pill soon">${items.length} update${items.length>1?'s':''}</span></div>`:''}</div>`;
  }
  const trailing = (7-((startOffset+daysInMonth)%7))%7;
  for(let i=1;i<=trailing;i++) cells += `<div class="fc-cell dim">${i}</div>`;

  const recentlyUpdated = [...DOCUMENTS].filter(d=>d.lastUpdated).sort((a,b)=>b.lastUpdated-a.lastUpdated).slice(0,6);

  return `
  <div class="grid" style="grid-template-columns:1fr 280px; align-items:start;">
    <div class="panel">
      <div class="full-cal-head">
        <div class="full-cal-title">${monthName}</div>
        <div class="cal-nav"><button id="calPrev">‹</button><button id="calNext">›</button></div>
      </div>
      <div class="full-cal-grid">${dows.map(d=>`<div class="fc-dow">${d}</div>`).join('')}${cells}</div>
      <div style="font-size:11px; color:var(--ink-500); margin-top:10px;">แต่ละวันแสดงจำนวนเอกสารที่มีการแก้ไข/อัปเดตในระบบจริง (จาก lastUpdated)</div>
    </div>
    <div class="panel">
      <div class="panel-title" style="margin-bottom:12px;">Recently Updated</div>
      ${recentlyUpdated.map(d=>`
        <div class="rowline" data-open-doc="${d.id}" style="cursor:pointer">
          <div class="file-ic">${ic('file')}</div>
          <div class="rl-main"><div class="rl-title">${d.id}</div><div class="rl-sub">${fmtDate(d.lastUpdated)}</div></div>
          ${statusBadge(d.note)}
        </div>`).join('') || `<div style="color:var(--ink-500); font-size:12.5px;">No activity yet.</div>`}
    </div>
  </div>`;
}
function attachCalHandlers(){
  const p = document.getElementById('calPrev');
  const n = document.getElementById('calNext');
  if(p) p.addEventListener('click', ()=>{ state.calMonth--; if(state.calMonth<0){state.calMonth=11; state.calYear--;} render(); });
  if(n) n.addEventListener('click', ()=>{ state.calMonth++; if(state.calMonth>11){state.calMonth=0; state.calYear++;} render(); });
  attachGlobalRowHandlers();
}

// ============================================================
// AUDIT TRAIL — real feed built from every document's comments[]
// ============================================================
function viewAuditTrail(){
  const feed = DOCUMENTS.flatMap(d=> (d.comments||[]).map(c=>({...c, docId:d.id, docName:d.name})))
    .sort((a,b)=> (b.time||0)-(a.time||0)).slice(0,60);
  return `
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Audit Trail</div><div style="font-size:11.5px; color:var(--ink-500);">${feed.length} entries</div></div>
    ${feed.length ? feed.map(a=>`
      <div class="at-item" data-open-doc="${a.docId}" style="cursor:pointer;">
        <div class="at-icon">${ic('history')}</div>
        <div class="at-main"><div class="at-title">${a.by} — ${a.docId}</div><div class="at-meta">${a.text}</div></div>
        <div class="at-time">${fmtDateTime(a.time)}</div>
      </div>`).join('') : emptyState('ยังไม่มีกิจกรรม','No approval or comment activity recorded yet.')}
  </div>`;
}

// ============================================================
// MASTER LIST IMPORT — merges MASTER_LIST (parsed from MPIR's
// SharePoint master list export) into DOCUMENTS by matching on id.
// Updates name/link/dates/rev/note and maps role codes (LM/TM/QM/DC)
// to real names for preparedBy/reviewerName/approverName.
// ============================================================
function toEpoch(isoDateStr){
  if(!isoDateStr) return null;
  const t = new Date(isoDateStr + 'T00:00:00').getTime();
  return isNaN(t) ? null : t;
}
function applyMasterListRow(row, d){
  d.name = row.name || d.name;
  d.rev = row.rev || d.rev || null;
  if(row.link) d.link = row.link;
  if(row.note) d.note = row.note;
  d.createdDate = toEpoch(row.created) || d.createdDate || null;
  d.effectiveDate = toEpoch(row.effective) || d.effectiveDate || null;
  d.preparedBy = roleName(row.prep) || d.preparedBy || '';
  d.reviewerName = roleName(row.reviewer) || d.reviewerName || '';
  d.approverName = roleName(row.approver) || d.approverName || '';
  if(d.note==='ควบคุม' || d.note==='แจกจ่าย'){
    d.approvalStatus = 'อนุมัติแล้ว';
    if(!d.approvedBy){
      d.approvedBy = d.approverName || '';
      d.approvedAt = d.effectiveDate || d.lastUpdated || Date.now();
    }
  }
  d.lastUpdated = Date.now();
}
async function runMasterListImport(){
  if(typeof MASTER_LIST === 'undefined'){
    alert('ไม่พบไฟล์ masterlist.js');
    return;
  }
  let updated = 0, created = 0;
  MASTER_LIST.forEach(row=>{
    let d = DOCUMENTS.find(x=>x.id===row.id);
    if(d){
      applyMasterListRow(row, d);
      updated++;
    } else {
      d = {
        id: row.id, name: row.name, clause:'', link: row.link || '', note: row.note || 'ว่าง',
        approvalStatus:'ร่าง', reviewerName:'', approverName:'', preparedBy:'', comments:[],
        lastUpdated: Date.now(), rev:null, createdDate:null, effectiveDate:null,
      };
      applyMasterListRow(row, d);
      DOCUMENTS.push(d);
      created++;
    }
  });
  await persistDocs();
  alert(`นำเข้าเสร็จแล้ว — อัปเดต ${updated} รายการ, เพิ่มใหม่ ${created} รายการ`);
  render();
}
function attachAdminHandlers(){
  const btn = document.getElementById('btnImportMasterList');
  if(btn) btn.addEventListener('click', async ()=>{
    const n = (typeof MASTER_LIST!=='undefined') ? MASTER_LIST.length : 0;
    if(!confirm(`นำเข้า/อัปเดตข้อมูลจาก Master List (${n} รายการ)?\n\nจะอัปเดตชื่อ, ลิงก์, วันที่, สถานะ, และชื่อผู้จัดทำ/ทบทวน/อนุมัติ (จากรหัสตำแหน่ง LM/TM/QM/DC) ของเอกสารที่ตรงกัน — และเพิ่มเอกสารใหม่ถ้ายังไม่มีในระบบ`)) return;
    btn.disabled = true; btn.textContent = 'กำลังนำเข้า…';
    await runMasterListImport();
  });
}

// ============================================================
// ADMINISTRATION
// ============================================================
function viewAdmin(){
  const n = (typeof MASTER_LIST!=='undefined') ? MASTER_LIST.length : 0;
  return `
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Administration</div></div>
    <div class="grid grid-3">
      <div class="side-box"><div class="side-box-title">Firestore</div><div style="font-size:12.5px; color:var(--ink-700);">Project: iso17025-b46ae<br>Collection: iso17025 / documents<br><span class="sync-pill" style="margin-top:8px;"><span class="dot"></span>Connected</span></div></div>
      <div class="side-box"><div class="side-box-title">SharePoint</div><div style="font-size:12.5px; color:var(--ink-700);">mitrphol.sharepoint.com/sites/ServiceLab</div></div>
      <div class="side-box"><div class="side-box-title">Document Types</div><div style="font-size:12.5px; color:var(--ink-700);">${Object.entries(DOC_TYPE_MAP).map(([k,v])=>`${k}: ${v}`).join('<br>')}</div></div>
    </div>
  </div>
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Import Master List</div></div>
    <div style="font-size:12.5px; color:var(--ink-700); margin-bottom:14px;">
      อัปเดตชื่อ, ลิงก์ SharePoint, วันที่จัดทำ/ประกาศใช้, Revision, สถานะ และชื่อผู้จัดทำ/ทบทวน/อนุมัติ (แปลงรหัสตำแหน่ง LM=รัตนา, TM=พิสิทธินี, QM/DC=พิมพ์ชนก เป็นชื่อจริง) จากไฟล์ Master List ที่โหลดไว้ (${n} รายการ) — จับคู่ตามรหัสเอกสาร เอกสารที่ไม่มีในระบบจะถูกเพิ่มใหม่
    </div>
    <button class="btn primary" id="btnImportMasterList">${ic('doc')} นำเข้า/อัปเดตจาก Master List</button>
  </div>`;
}

// ============================================================
// GO
// ============================================================
boot();
