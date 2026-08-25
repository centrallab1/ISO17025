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
      if(d.reviewCycleDays===undefined){ d.reviewCycleDays=DEFAULT_REVIEW_CYCLE_DAYS; needsMigration = true; }
      if(d.lastReviewedAt===undefined){ d.lastReviewedAt=null; needsMigration = true; }
      if(d.lastReviewedBy===undefined){ d.lastReviewedBy=''; needsMigration = true; }
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
  queueListOpen: false,
  approvalTab: 'active',
  approvalDetailOpen: false,
  approvalCommentsExpanded: false,
  approvalPage: 1,
  approvalTypeFilter: 'All',
  revFilter: { clause:'All', type:'All', status:'All', q:'' },
  revPage: 1,
  revisionDetailOpen: false,
  revisionTimelineExpanded: false,
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
  send: `<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>`,
  chevronRight: `<path d="m9 18 6-6-6-6"/>`,
  bell: `<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>`,
  filter: `<path d="M4 4h16l-6 8v6l-4 2v-8L4 4Z"/>`,
};
function ic(name, cls=''){ return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||''}</svg>`; }

function emptyState(title, sub){
  return `<div class="empty-state">${ic('empty')}<h3>${title}</h3><p>${sub}</p></div>`;
}

function pendingQueue(){
  return DOCUMENTS.filter(d=> d.approvalStatus==='ร่าง' || d.approvalStatus==='รอทบทวน' || d.approvalStatus==='รออนุมัติ')
    .sort((a,b)=> (a.lastUpdated||0)-(b.lastUpdated||0));
}
let notifOpen = false;
function wireNotifBell(){
  const bell = document.getElementById('notifBell');
  if(bell) bell.addEventListener('click', e=>{
    e.stopPropagation();
    notifOpen = !notifOpen;
    renderNotifPanel();
  });
  document.addEventListener('click', ()=>{
    if(notifOpen){ notifOpen = false; renderNotifPanel(); }
  });
}
function updateNotifBadge(){
  const dot = document.getElementById('notifDot');
  if(!dot) return;
  const n = pendingQueue().length;
  dot.style.display = n>0 ? 'block' : 'none';
}
function wireBackButton(){
  const btn = document.getElementById('topBackBtn');
  if(btn) btn.addEventListener('click', goBack);
}
function updateBackButton(){
  const btn = document.getElementById('topBackBtn');
  if(!btn) return;
  btn.style.display = navStack.length>0 ? 'flex' : 'none';
}
function renderNotifPanel(){
  const wrap = document.getElementById('notifPanel');
  if(!wrap) return;
  updateNotifBadge();
  if(!notifOpen){ wrap.style.display = 'none'; wrap.innerHTML=''; return; }
  const queue = pendingQueue();
  wrap.className = 'notif-panel';
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div class="notif-head">คำขอรอดำเนินการ (${queue.length})</div>
    ${queue.length ? queue.map(d=>{
      const label = d.lastRequestType==='new' ? 'คำขอเอกสารใหม่' : d.lastRequestType==='revision' ? `คำขอปรับปรุง Rev.${d.lastRequestFrom||'-'} → ${d.rev||'-'}` : d.lastRequestType==='review' ? 'คำขอทบทวนประจำปี' : 'รอดำเนินการ';
      return `
      <div class="notif-item" data-notif-doc="${d.id}">
        <div class="notif-icon">${ic('clock')}</div>
        <div class="notif-text">
          <div class="notif-title">${d.id} — ${cleanName(d)}</div>
          <div class="notif-sub">${label} · ${approvalBadge(d.approvalStatus)}</div>
        </div>
      </div>`;
    }).join('') : `<div class="notif-empty">ไม่มีคำขอค้างอยู่</div>`}
  `;
  wrap.querySelectorAll('[data-notif-doc]').forEach(elx=>{
    elx.addEventListener('click', e=>{
      e.stopPropagation();
      notifOpen = false;
      renderNotifPanel();
      goTo('approval', { selectedDoc: elx.dataset.notifDoc, approvalTab:'active', approvalPage:1, approvalDetailOpen:true, approvalCommentsExpanded:false });
    });
  });
}
function nextRevNumber(currentRev){
  const n = parseInt(currentRev, 10);
  return isNaN(n) ? '1' : String(n+1);
}
function openModal(opts){ state.modal = opts; renderModalLayer(); }
function closeModal(){ state.modal = null; renderModalLayer(); }
function renderModalLayer(){
  const layer = document.getElementById('modalLayer');
  if(!layer) return;
  layer.innerHTML = state.modal ? docModal() : '';
  if(state.modal) wireModalControls();
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
  wireNotifBell();
  wireBackButton();
  wireSidebarToggle();
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
      let extra = {};
      if(btn.dataset.view==='documents') extra = { docFilter:{ clause:'All', type:'All', status:'All', q:'', preset:'all' }, docPage:1 };
      if(btn.dataset.view==='revision') extra = { revFilter:{ clause:'All', type:'All', status:'All', q:'' }, revPage:1, revisionDetailOpen:false };
      if(btn.dataset.view==='approval'){
        const next = pendingQueue()[0];
        extra = { approvalTab:'active', approvalPage:1, approvalDetailOpen:false };
        if(next) extra.selectedDoc = next.id;
      }
      goTo(btn.dataset.view, extra);
    });
  });
}
function openSidebar(){
  document.querySelector('.sidebar').classList.add('open');
  document.getElementById('sidebarBackdrop').classList.add('open');
}
function closeSidebar(){
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('open');
}
function wireSidebarToggle(){
  const toggle = document.getElementById('menuToggle');
  const backdrop = document.getElementById('sidebarBackdrop');
  if(toggle) toggle.addEventListener('click', ()=>{
    const sidebar = document.querySelector('.sidebar');
    if(sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
  });
  if(backdrop) backdrop.addEventListener('click', closeSidebar);
}
function goTo(view, extra={}){
  navStack.push(snapshotState());
  Object.assign(state, extra);
  state.view = view;
  syncNavActive();
  render();
  window.scrollTo({top:0, behavior:'instant'});
  closeSidebar();
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
    case 'documents': renderDocumentsInto(); wireDocControls(); renderModalLayer(); updateNotifBadge(); updateBackButton(); return;
    case 'records': el.innerHTML = viewEvidence(); attachEvidenceHandlers(); break;
    case 'revision': el.innerHTML = viewRevisionDashboard(); attachRevisionDashboardHandlers(); break;
    case 'approval': el.innerHTML = viewApproval(); attachApprovalHandlers(); break;
    case 'audit': el.innerHTML = viewAudit(); attachAuditHandlers(); break;
    case 'calendar': el.innerHTML = viewCalendar(); attachCalHandlers(); break;
    case 'audittrail': el.innerHTML = viewAuditTrail(); break;
    case 'admin': el.innerHTML = viewAdmin(); attachAdminHandlers(); break;
    case 'docdetail': el.innerHTML = viewDocDetail(state.selectedDoc); attachDetailActionHandlers(); break;
    default: el.innerHTML = viewDashboard();
  }
  attachGlobalRowHandlers();
  renderModalLayer();
  updateNotifBadge();
  updateBackButton();
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
      <td class="mono">${d.id}</td><td class="name" title="${cleanName(d).replace(/"/g,'&quot;')}">${cleanName(d)}</td><td>${docTypeLabel(d)}</td>
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
      <div style="display:flex; gap:8px;">
        <button class="btn ghost" id="btnReviseDoc">${ic('history')} ขอปรับปรุง (Revision)</button>
        <button class="btn primary" id="btnNewDoc">${ic('plus')} เอกสารใหม่</button>
      </div></div>
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
          <td class="mono">${d.id}</td><td class="name" title="${cleanName(d).replace(/"/g,'&quot;')}">${cleanName(d)}</td><td>${d.clause || '<span style="color:var(--ink-400);">—</span>'}</td>
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
  `;
}
function wireDocControls(){
  const search = document.getElementById('docSearch');
  if(search) search.addEventListener('input', e=>{
    const cursorPos = e.target.selectionStart;
    state.docFilter.q = e.target.value;
    state.docPage=1;
    renderDocumentsInto();
    wireDocControls();
    const refreshed = document.getElementById('docSearch');
    if(refreshed){ refreshed.focus(); refreshed.setSelectionRange(cursorPos, cursorPos); }
  });
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
  if(btnNew) btnNew.addEventListener('click', ()=> openModal({ mode:'new' }));
  const btnRevise = document.getElementById('btnReviseDoc');
  if(btnRevise) btnRevise.addEventListener('click', ()=> openModal({ mode:'revise', id:null }));
  document.querySelectorAll('[data-edit]').forEach(b=> b.addEventListener('click', ()=> openModal({ mode:'edit', id:b.dataset.edit })));
  document.querySelectorAll('[data-del]').forEach(b=> b.addEventListener('click', async ()=>{
    const d = DOCUMENTS.find(x=>x.id===b.dataset.del);
    if(!d) return;
    if(!confirm(`ลบเอกสาร "${d.id} ${cleanName(d)}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    DOCUMENTS = DOCUMENTS.filter(x=>x.id!==d.id);
    await persistDocs();
    renderDocumentsInto(); wireDocControls();
  }));
  attachGlobalRowHandlers();
}
function docModal(){
  const mode = state.modal.mode;

  if(mode==='revise' && !state.modal.id){
    // step 1 of the revision flow: pick which existing document to revise
    return `
    <div class="modal-backdrop" id="docModalBackdrop">
      <div class="modal">
        <div class="modal-head"><div class="modal-title">ขอปรับปรุงเอกสาร (Revision)</div><button class="modal-close" id="modalCloseBtn">✕</button></div>
        <div class="modal-body">
          <div class="field"><label>เลือกเอกสารที่ต้องการปรับปรุง</label>
            <select id="mfReviseDocPicker">
              <option value="">— เลือกเอกสาร —</option>
              ${DOCUMENTS.slice().sort((a,b)=>a.id.localeCompare(b.id)).map(x=>`<option value="${x.id}">${x.id} — ${cleanName(x)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" id="modalCancelBtn">ยกเลิก</button>
        </div>
      </div>
    </div>`;
  }

  const editing = mode==='edit';
  const revising = mode==='revise';
  const creatingNew = mode==='new';
  const d = (editing||revising) ? DOCUMENTS.find(x=>x.id===state.modal.id) : {
    id:'', name:'', clause: state.modal.presetClause || '', link:'', note: state.modal.presetNote || 'ว่าง', rev:'0', preparedBy:'', reviewerName:'', approverName:'',
  };
  if(!d) return `<div class="modal-backdrop" id="docModalBackdrop"><div class="modal"><div class="modal-body">${emptyState('ไม่พบเอกสาร','')}</div><div class="modal-actions"><button class="btn ghost" id="modalCancelBtn">ปิด</button></div></div></div>`;

  const title = editing ? 'แก้ไขเอกสาร (แก้ไขข้อมูลที่นำเข้าให้ถูกต้อง)' : revising ? `ขอปรับปรุง — ${d.id}` : 'เอกสารใหม่';
  const suggestedRev = revising ? nextRevNumber(d.rev) : (d.rev || '0');

  return `
  <div class="modal-backdrop" id="docModalBackdrop">
    <div class="modal">
      <div class="modal-head"><div class="modal-title">${title}</div><button class="modal-close" id="modalCloseBtn">✕</button></div>
      <div class="modal-body">
        ${revising ? `<div class="field"><label>Rev. ปัจจุบัน</label><input value="${d.rev || '—'}" disabled></div>` : ''}
        ${creatingNew ? `<div class="field"><label>ประเภทเอกสาร</label>
          <select id="mfTypePrefix">
            <option value="">— เลือกประเภท —</option>
            ${Object.entries(DOC_TYPE_MAP).map(([k,v])=>`<option value="${k}">${k} — ${v}</option>`).join('')}
          </select></div>` : ''}
        <div class="field"><label>รหัสเอกสาร (Document ID)</label>
          <div style="display:flex; gap:8px;">
            <input id="mfId" value="${d.id}" placeholder="เช่น MPIR-LF-074-00" style="flex:1;" ${(editing||revising)?'disabled':''}>
            ${creatingNew ? `<button type="button" class="btn ghost" id="btnAutoNumber" style="flex-shrink:0; white-space:nowrap;">ออกเลขอัตโนมัติ</button>` : ''}
          </div>
          ${creatingNew ? `<div style="font-size:11px; color:var(--ink-500); margin-top:5px;">เลือกประเภทด้านบนเพื่อออกเลขอัตโนมัติ — ระบบจะเติมเลขที่ยังว่างอยู่ก่อนเสมอ (เช่น ถ้า 050 ยังไม่มีแต่ 054 มีแล้ว จะออกเลข 050 ให้ก่อน)</div>` : ''}
        </div>
        <div class="field"><label>ชื่อเอกสาร</label>
          <input id="mfName" value="${cleanName(d).replace(/"/g,'&quot;')}" placeholder="ชื่อเอกสาร"></div>
        <div class="field"><label>ข้อกำหนด ISO 17025</label>
          <select id="mfClause"><option value="">ไม่ระบุ</option>${CLAUSES.map(([c,l])=>`<option value="${c}" ${d.clause===c?'selected':''}>${l}</option>`).join('')}</select>
          <div id="clauseSuggest" class="suggest-hint"></div>
        </div>
        <div class="field"><label>ลิงก์ SharePoint</label>
          <input id="mfLink" value="${d.link||''}" placeholder="https://mitrphol.sharepoint.com/..."></div>
        <div class="field"><label>สถานะเอกสาร</label>
          <select id="mfNote">${['ควบคุม','แจกจ่าย','สนับสนุน','ยกเลิก','ว่าง','ไม่พบ'].map(s=>`<option ${d.note===s?'selected':''}>${s}</option>`).join('')}</select>
          <div id="noteSuggest" class="suggest-hint"></div>
        </div>
        <div class="field"><label>${revising ? 'Rev. ใหม่ (เรียงต่ออัตโนมัติ แก้ไขได้)' : 'Rev.'}</label>
          <input id="mfRev" value="${suggestedRev}" placeholder="0"></div>
        ${revising ? `<div class="field"><label>ชื่อผู้ขอปรับปรุง</label><input id="mfActor" placeholder="ชื่อ-นามสกุล"></div>` : ''}
        ${creatingNew ? `<div class="field"><label>ชื่อผู้จัดทำ / ผู้ขอขึ้นทะเบียน</label><input id="mfActor" placeholder="ชื่อ-นามสกุล"></div>` : ''}
        ${editing ? `
        <div class="field"><label>วันที่จัดทำ</label><input id="mfCreated" type="date" value="${d.createdDate ? new Date(d.createdDate).toISOString().slice(0,10) : ''}"></div>
        <div class="field"><label>วันที่ประกาศใช้</label><input id="mfEffective" type="date" value="${d.effectiveDate ? new Date(d.effectiveDate).toISOString().slice(0,10) : ''}"></div>
        <div class="field"><label>ผู้จัดทำ</label><input id="mfPrep" value="${(d.preparedBy||'').replace(/"/g,'&quot;')}"></div>
        <div class="field"><label>ผู้ทบทวน</label><input id="mfReviewer" value="${(d.reviewerName||'').replace(/"/g,'&quot;')}"></div>
        <div class="field"><label>ผู้อนุมัติ</label><input id="mfApprover" value="${(d.approverName||'').replace(/"/g,'&quot;')}"></div>
        <div class="field"><label>สถานะการอนุมัติ</label>
          <select id="mfApprovalStatus">${[...STATUS_FLOW,'ไม่อนุมัติ'].map(s=>`<option ${((d.approvalStatus||'ร่าง')===s)?'selected':''}>${s}</option>`).join('')}</select></div>
        <div class="field"><label>รอบทบทวน (วัน) — นับจากวันประกาศใช้</label><input id="mfReviewCycle" value="${d.reviewCycleDays || DEFAULT_REVIEW_CYCLE_DAYS}" placeholder="365"></div>
        ` : ''}
        <div class="field-error" id="mfError" style="display:none;"></div>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="modalCancelBtn">ยกเลิก</button>
        <button class="btn primary" id="modalSaveBtn">${editing ? 'บันทึกการแก้ไข' : revising ? 'ส่งคำขอปรับปรุง' : 'สร้างเอกสาร'}</button>
      </div>
    </div>
  </div>`;
}
function wireModalControls(){
  const backdrop = document.getElementById('docModalBackdrop');
  if(!backdrop) return;
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
  backdrop.addEventListener('click', e=>{ if(e.target===backdrop) closeModal(); });

  const picker = document.getElementById('mfReviseDocPicker');
  if(picker) picker.addEventListener('change', e=>{
    state.modal.id = e.target.value || null;
    renderModalLayer();
  });

  // live auto-classification suggestions (name/id → clause, name/id → support)
  const nameInput = document.getElementById('mfName');
  const idInput = document.getElementById('mfId');
  const clauseSel = document.getElementById('mfClause');
  const noteSel = document.getElementById('mfNote');
  function refreshSuggestions(){
    const name = nameInput ? nameInput.value.trim() : '';
    const idVal = idInput ? idInput.value.trim() : '';
    const clauseHint = document.getElementById('clauseSuggest');
    const noteHint = document.getElementById('noteSuggest');

    if(clauseHint){
      const suggested = suggestClause(name);
      if(suggested && clauseSel && clauseSel.value !== suggested){
        clauseHint.innerHTML = `💡 แนะนำ: ${clauseLabel(suggested)} <button type="button" class="suggest-accept" id="acceptClauseSuggest">ใช้คำแนะนำนี้</button>`;
        const btn = document.getElementById('acceptClauseSuggest');
        if(btn) btn.addEventListener('click', ()=>{ clauseSel.value = suggested; refreshSuggestions(); });
      } else {
        clauseHint.innerHTML = '';
      }
    }
    if(noteHint){
      const likelySupport = isLikelySupportDoc(idVal, name);
      if(likelySupport && noteSel && noteSel.value !== 'สนับสนุน'){
        noteHint.innerHTML = `💡 เอกสารนี้อาจเข้าข่ายหลักฐาน/สนับสนุน <button type="button" class="suggest-accept" id="acceptNoteSuggest">ตั้งเป็นสนับสนุน</button>`;
        const btn = document.getElementById('acceptNoteSuggest');
        if(btn) btn.addEventListener('click', ()=>{ noteSel.value = 'สนับสนุน'; refreshSuggestions(); });
      } else {
        noteHint.innerHTML = '';
      }
    }
  }
  if(nameInput) nameInput.addEventListener('input', refreshSuggestions);
  if(idInput) idInput.addEventListener('input', refreshSuggestions);
  refreshSuggestions();

  const typePrefixSel = document.getElementById('mfTypePrefix');
  const autoNumBtn = document.getElementById('btnAutoNumber');
  function doAutoNumber(){
    const prefix = typePrefixSel ? typePrefixSel.value : '';
    if(!prefix) return;
    try{
      const generated = nextAvailableNumber(prefix);
      if(idInput) idInput.value = generated;
      refreshSuggestions();
    } catch(err){
      console.error('doAutoNumber failed:', err);
      alert('ออกเลขอัตโนมัติไม่สำเร็จ: ' + (err && err.message ? err.message : err) + '\n\nกรุณากรอกรหัสเอกสารเอง หรือแจ้งข้อความนี้เพื่อแก้ไข');
    }
  }
  if(typePrefixSel) typePrefixSel.addEventListener('change', doAutoNumber);
  if(autoNumBtn) autoNumBtn.addEventListener('click', doAutoNumber);

  const saveBtn = document.getElementById('modalSaveBtn');
  if(!saveBtn) return;
  saveBtn.addEventListener('click', async ()=>{
    const mode = state.modal.mode;
    const id = document.getElementById('mfId').value.trim();
    const name = document.getElementById('mfName').value.trim();
    const clause = document.getElementById('mfClause').value;
    const link = document.getElementById('mfLink').value.trim();
    const note = document.getElementById('mfNote').value;
    const rev = document.getElementById('mfRev').value.trim();
    const errEl = document.getElementById('mfError');
    if(!id || !name){ errEl.textContent = 'กรอกรหัสเอกสารและชื่อเอกสารให้ครบ'; errEl.style.display='block'; return; }

    if(mode==='new'){
      if(DOCUMENTS.some(x=>x.id===id)){ errEl.textContent = 'รหัสเอกสารนี้มีอยู่แล้ว'; errEl.style.display='block'; return; }
      const actor = document.getElementById('mfActor').value.trim();
      if(!actor){ errEl.textContent = 'กรอกชื่อผู้จัดทำก่อน'; errEl.style.display='block'; return; }
      const now = Date.now();
      DOCUMENTS.push({
        id, name, clause, link, note, rev: rev || '0',
        approvalStatus:'ร่าง', reviewerName:'', approverName:'', preparedBy:actor,
        comments:[{ by:actor, text:'ขอขึ้นทะเบียนเอกสารใหม่', time: now }], lastUpdated: now, createdDate: now, effectiveDate:null,
        approvedBy:null, approvedAt:null, approvedComment:null, lastRequestType:'new',
      });
    } else if(mode==='revise'){
      const actor = document.getElementById('mfActor').value.trim();
      if(!actor){ errEl.textContent = 'กรอกชื่อผู้ขอปรับปรุงก่อน'; errEl.style.display='block'; return; }
      const d = DOCUMENTS.find(x=>x.id===state.modal.id);
      const oldRev = d.rev;
      d.name = name; d.clause = clause; d.link = link; d.note = note;
      d.rev = rev || nextRevNumber(oldRev);
      d.approvalStatus = 'รอทบทวน';
      d.approvedBy = null; d.approvedAt = null; d.approvedComment = null;
      d.lastRequestType = 'revision'; d.lastRequestFrom = oldRev || null;
      d.comments = d.comments || [];
      d.comments.push({ by:actor, text:`ขอปรับปรุงจาก Rev.${oldRev||'-'} เป็น Rev.${d.rev}`, time: Date.now() });
      d.lastUpdated = Date.now();
    } else {
      // edit — direct correction, no workflow reset
      const d = DOCUMENTS.find(x=>x.id===state.modal.id);
      d.name = name; d.clause = clause; d.link = link; d.note = note; d.rev = rev || d.rev;
      const created = document.getElementById('mfCreated');
      const effective = document.getElementById('mfEffective');
      if(created) d.createdDate = created.value ? new Date(created.value+'T00:00:00').getTime() : null;
      if(effective) d.effectiveDate = effective.value ? new Date(effective.value+'T00:00:00').getTime() : null;
      const prep = document.getElementById('mfPrep'); if(prep) d.preparedBy = prep.value.trim();
      const rev2 = document.getElementById('mfReviewer'); if(rev2) d.reviewerName = rev2.value.trim();
      const appr = document.getElementById('mfApprover'); if(appr) d.approverName = appr.value.trim();
      const apStatus = document.getElementById('mfApprovalStatus'); if(apStatus) d.approvalStatus = apStatus.value;
      const cycle = document.getElementById('mfReviewCycle'); if(cycle){ const n = parseInt(cycle.value,10); d.reviewCycleDays = isNaN(n) ? DEFAULT_REVIEW_CYCLE_DAYS : n; }
      d.lastUpdated = Date.now();
    }
    closeModal();
    render();
    await persistDocs();
    render();
  });
}

// ============================================================
// EVIDENCE / SUPPORT VIEW — all documents with note==='สนับสนุน',
// grouped by ISO clause, shown as clickable document-name links to
// the pasted SharePoint URL (replaces the old "Records" page).
// ============================================================
function viewEvidence(){
  const items = DOCUMENTS.filter(d=> d.note==='สนับสนุน');
  const byClause = {};
  items.forEach(d=>{
    const key = d.clause || '';
    (byClause[key] = byClause[key]||[]).push(d);
  });
  const orderedKeys = [...CLAUSES.map(c=>c[0]), ''];
  const sections = orderedKeys.filter(k=> byClause[k] && byClause[k].length);

  return `
  <div class="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title">Evidence / Support</div>
        <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">เอกสารสนับสนุน/หลักฐาน (ใบรับรอง มาตรฐานอ้างอิง ฯลฯ) จัดกลุ่มตามข้อกำหนด ISO 17025 — วางลิงก์ SharePoint แล้วกดชื่อเพื่อเปิดได้เลย</div>
      </div>
      <button class="btn primary" id="btnNewEvidence">${ic('plus')} เพิ่มรายการสนับสนุน</button>
    </div>
  </div>
  ${sections.length ? sections.map(key=>{
    const docs = byClause[key];
    const label = key ? clauseLabel(key) : 'ไม่ระบุข้อกำหนด';
    return `
    <div class="panel">
      <div class="panel-title" style="margin-bottom:12px;">${label} <span style="color:var(--ink-500); font-weight:600; font-size:12px;">(${docs.length})</span></div>
      <div style="display:flex; flex-direction:column; gap:2px;">
        ${docs.map(d=>`
          <div class="evidence-item">
            <div class="file-ic">${ic('file')}</div>
            <div class="evi-main">
              ${d.link
                ? `<a class="evi-name" href="${d.link}" target="_blank" rel="noopener">${cleanName(d)}</a>`
                : `<span class="evi-name evi-nolink">${cleanName(d)}</span>`}
              <div class="evi-sub">${d.id}${!d.link ? ' · ยังไม่มีลิงก์' : ''}</div>
            </div>
            <div class="row-actions">
              <button data-edit="${d.id}" title="แก้ไข">${ic('edit')}</button>
              <button data-del="${d.id}" class="del" title="ลบ">${ic('trash')}</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('') : `<div class="panel">${emptyState('ยังไม่มีเอกสารสนับสนุน','เพิ่มรายการแรกได้จากปุ่ม "เพิ่มรายการสนับสนุน" ด้านบน')}</div>`}
  `;
}
function attachEvidenceHandlers(){
  const btn = document.getElementById('btnNewEvidence');
  if(btn) btn.addEventListener('click', ()=> openModal({ mode:'new', presetNote:'สนับสนุน' }));
  document.querySelectorAll('[data-edit]').forEach(b=> b.addEventListener('click', ()=> openModal({ mode:'edit', id:b.dataset.edit })));
  document.querySelectorAll('[data-del]').forEach(b=> b.addEventListener('click', async ()=>{
    const d = DOCUMENTS.find(x=>x.id===b.dataset.del);
    if(!d) return;
    if(!confirm(`ลบรายการ "${d.id} ${cleanName(d)}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    DOCUMENTS = DOCUMENTS.filter(x=>x.id!==d.id);
    await persistDocs();
    render();
  }));
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
          ${d.link ? `<a class="btn primary" href="${d.link}" target="_blank" rel="noopener">${ic('link')} Open in SharePoint</a>` : `<button class="btn ghost" disabled>${ic('link')} ยังไม่มีลิงก์</button>`}
          <button class="btn ghost" data-go-revision-history="1">${ic('history')} History</button>
        </div>
        <div class="detail-actions-label">จัดการเอกสาร</div>
        <div class="detail-actions">
          <button class="btn ghost" id="btnDetailEdit">${ic('edit')} แก้ไข</button>
          <button class="btn ghost" id="btnDetailRevise">${ic('history')} ปรับปรุง Rev.</button>
          <button class="btn danger" id="btnDetailDelete">${ic('trash')} ลบ</button>
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
function attachDetailActionHandlers(){
  const editBtn = document.getElementById('btnDetailEdit');
  if(editBtn) editBtn.addEventListener('click', ()=> openModal({ mode:'edit', id: state.selectedDoc }));
  const reviseBtn = document.getElementById('btnDetailRevise');
  if(reviseBtn) reviseBtn.addEventListener('click', ()=> openModal({ mode:'revise', id: state.selectedDoc }));
  const historyBtn = document.querySelector('[data-go-revision-history]');
  if(historyBtn) historyBtn.addEventListener('click', ()=> goTo('revision', { selectedDoc: state.selectedDoc, revisionDetailOpen: true, revisionTimelineExpanded: false }));
  const delBtn = document.getElementById('btnDetailDelete');
  if(delBtn) delBtn.addEventListener('click', async ()=>{
    const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
    if(!d) return;
    if(!confirm(`ลบเอกสาร "${d.id} ${cleanName(d)}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    DOCUMENTS = DOCUMENTS.filter(x=>x.id!==d.id);
    await persistDocs();
    goBack();
  });
}

// ============================================================
// REVISION / HISTORY VIEW — honest version: this system tracks a
// single lastUpdated timestamp + a comment trail, not versioned
// revisions, so we show exactly that rather than inventing Rev.00-03.
// ============================================================
// Groups a document's flat comment history into cards, one per revision/
// approval request cycle, detected from the "ขอปรับปรุงจาก Rev.X เป็น Rev.Y"
// marker comment written by the revise-request flow.
function groupHistoryByRequest(d){
  const comments = (d.comments||[]).slice(); // stored oldest → newest
  const groups = [];
  let current = null;
  comments.forEach(c=>{
    const m = c.text.match(/ขอปรับปรุงจาก Rev\.(.*?) เป็น Rev\.(.*)/);
    if(m){
      current = { type:'revision', fromRev:m[1], toRev:m[2], requestedBy:c.by, requestedAt:c.time, events:[] };
      groups.push(current);
    } else {
      if(!current){
        current = { type:'initial', toRev: d.rev || null, requestedBy: d.preparedBy || c.by, requestedAt: d.createdDate || c.time, events:[] };
        groups.push(current);
      }
      current.events.push(c);
    }
  });
  if(!groups.length){
    groups.push({ type:'initial', toRev: d.rev || null, requestedBy: d.preparedBy || '', requestedAt: d.createdDate || d.lastUpdated, events:[] });
  }
  return groups.slice().reverse(); // newest request first
}

// classifies a comment/event into an icon + color + short Thai title for
// the colored-icon timeline (revision history detail page + activity feed)
function classifyEvent(text){
  if(/เปลี่ยนรหัสเอกสารจาก/.test(text)){
    return { icon:'edit', bg:'--blue-600', title:'เปลี่ยนรหัสเอกสาร' };
  }
  if(/ขอขึ้นทะเบียนเอกสารใหม่/.test(text)){
    return { icon:'plus', bg:'--blue-600', title:'ขอขึ้นทะเบียนเอกสารใหม่' };
  }
  if(/ขอทบทวนประจำปี/.test(text)){
    return { icon:'send', bg:'--amber-600', title:'ขอทบทวนประจำปี' };
  }
  if(/^ไม่อนุมัติ|ไม่อนุมัติ$/.test(text) || (/ไม่อนุมัติ/.test(text) && !/→\s*อนุมัติแล้ว/.test(text))){
    return { icon:'alert', bg:'--red-600', title:'ปฏิเสธเอกสาร' };
  }
  if(/ขอปรับปรุงจาก/.test(text)){
    return { icon:'send', bg:'--amber-600', title:'ส่งคำขอปรับปรุง' };
  }
  if(/→\s*อนุมัติแล้ว$/.test(text)){
    return { icon:'check', bg:'--green-600', title:'อนุมัติเอกสาร' };
  }
  return { icon:'edit', bg:'--blue-600', title:'อัปเดตสถานะเอกสาร' };
}
function eitem(opts){
  // opts: { icon, bg, title, detail, actor, time }
  return `
  <div class="eitem">
    <div class="eitem-icon" style="background:var(${opts.bg})">${ic(opts.icon)}</div>
    <div class="eitem-body">
      <div class="eitem-head"><div class="eitem-title">${opts.title}</div><div class="eitem-time">${fmtDateTime(opts.time)}</div></div>
      <div class="eitem-detail">รายละเอียด: ${opts.detail}</div>
      <div class="eitem-actor">ผู้ดำเนินการ: <span class="actor-pill">${opts.actor || 'ไม่ระบุ'}</span></div>
    </div>
  </div>`;
}

function viewRevisionDetailInline(d, standalone){
  const linkBtn = d.link
    ? `<a class="btn ghost" href="${d.link}" target="_blank" rel="noopener">${ic('link')} เปิดใน SharePoint</a>`
    : `<button class="btn ghost" disabled>${ic('link')} ยังไม่มีลิงก์</button>`;
  const nrd = nextReviewDate(d);
  const days = daysUntil(nrd);
  const isOverdue = days < 0;
  const reviewPending = d.lastRequestType==='review' && ['ร่าง','รอทบทวน','รออนุมัติ'].includes(d.approvalStatus);

  const lastComment = (d.comments||[])[(d.comments||[]).length-1];
  const items = [
    eitem({ icon:'plus', bg:'--blue-600', title:'สร้าง/แก้ไขล่าสุด', time:d.lastUpdated,
      detail:`สถานะปัจจุบัน: ${d.note} · การอนุมัติ: ${d.approvalStatus||'ร่าง'}`,
      actor: lastComment ? lastComment.by : (d.preparedBy || '') }),
    ...(d.comments||[]).slice().reverse().map(c=>{
      const cls = classifyEvent(c.text);
      return eitem({ icon:cls.icon, bg:cls.bg, title:cls.title, time:c.time, detail:c.text, actor:c.by });
    }),
    ...(d.createdDate ? [eitem({ icon:'send', bg:'--amber-600', title:'จัดทำเอกสาร', time:d.createdDate,
      detail:'สร้างเอกสารเวอร์ชันแรก', actor:d.preparedBy || '' })] : []),
  ];
  const shownItems = state.revisionTimelineExpanded ? items : items.slice(0,5);

  return `
  ${standalone ? `<div class="crumb" data-back="1">‹ กลับไปที่รายการ</div>` : ''}
  <div class="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title" style="display:flex; align-items:center; gap:9px; flex-wrap:wrap;">${d.id} ${cleanName(d)} ${statusBadge(d.note)} ${approvalBadge(d.approvalStatus)}</div>
        <div style="font-size:11.5px; color:var(--ink-500); margin-top:3px;">ประวัติการแก้ไข/ขอปรับปรุงเอกสาร พร้อมลิงก์ ณ ขณะนั้น เพื่อความโปร่งใสและตรวจสอบข้อมูลย้อนหลังได้</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        ${linkBtn}
        <button class="btn ghost" id="revDetailEdit">${ic('edit')} แก้ไข</button>
        <button class="btn ghost" id="revDetailRevise">${ic('history')} ปรับปรุง Rev.</button>
        <button class="btn ghost" id="revDetailApproval">${ic('check')} Approval</button>
        <button class="btn danger" id="revDetailDelete">${ic('trash')} ลบ</button>
      </div>
    </div>

    <div class="grid grid-3" style="margin-bottom:18px;">
      <div class="side-box"><div class="side-box-title">ข้อกำหนด ISO</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.clause ? clauseLabel(d.clause) : 'ไม่ระบุ'}</div></div>
      <div class="side-box"><div class="side-box-title">ประเภท / Rev.</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${docTypeLabel(d)} · Rev.${d.rev||'—'}</div></div>
      <div class="side-box"><div class="side-box-title">ทบทวนครั้งถัดไป</div><div style="font-size:12.5px; font-weight:700; color:${isOverdue?'var(--red-600)':'var(--ink-900)'};">${fmtDate(nrd)} (${isOverdue?`เกินกำหนด ${Math.abs(days)} วัน`:`อีก ${days} วัน`})</div></div>
      <div class="side-box"><div class="side-box-title">ผู้จัดทำ</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.preparedBy || '—'}</div></div>
      <div class="side-box"><div class="side-box-title">ผู้ทบทวน</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.reviewerName || '—'}</div></div>
      <div class="side-box"><div class="side-box-title">ผู้อนุมัติ</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.approverName || d.approvedBy || '—'}</div></div>
    </div>

    <div class="side-box" style="border-color:var(--green-600); background:var(--green-50); margin-bottom:18px;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-size:12.5px; font-weight:800; color:var(--green-600);">การทบทวนประจำปี (ผ่านขั้นตอนอนุมัติเหมือนคำขอเอกสารใหม่ ตาม SOP)</div>
          <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">
            ${reviewPending
              ? `มีคำขอทบทวนประจำปีกำลังดำเนินการอยู่ (สถานะ: ${d.approvalStatus})`
              : d.lastReviewedAt ? `ทบทวนล่าสุดโดย ${d.lastReviewedBy||'ไม่ระบุ'} เมื่อ ${fmtDate(d.lastReviewedAt)}` : 'ยังไม่เคยทบทวนประจำปีสำหรับเอกสารนี้'}
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          ${reviewPending
            ? `<button class="btn ghost" id="btnGoReviewApproval">${ic('check')} ไปที่ Approval</button>`
            : `<input id="revReviewerName" placeholder="ชื่อผู้ขอทบทวน" style="border:1px solid var(--line); border-radius:8px; padding:8px 10px; font-size:12.5px; width:160px;">
               <button class="btn success" id="btnConfirmReview">${ic('send')} ขอทบทวนประจำปี</button>`}
        </div>
      </div>
    </div>

    <div class="panel-head" style="margin-bottom:10px;">
      <div class="panel-title" style="margin:0;">ไทม์ไลน์ ${items.length ? `<span style="color:var(--ink-500); font-weight:600; font-size:12px;">(${items.length})</span>` : ''}</div>
      ${items.length > 5 ? `<button class="panel-link" id="btnToggleRevTimeline" style="cursor:pointer;">${state.revisionTimelineExpanded ? 'ย่อ ▲' : `แสดงทั้งหมด (${items.length}) ▼`}</button>` : ''}
    </div>
    ${shownItems.join('')}
  </div>`;
}

// ============================================================
// REVISION DASHBOARD — landing page for "Revision" in the sidebar:
// stat cards, filterable table of every document's revision/review
// status, and a combined latest-activity feed.
// ============================================================
function viewRevisionDashboard(){
  const total = DOCUMENTS.length;
  const revised = DOCUMENTS.filter(d=>d.approvalStatus==='อนุมัติแล้ว').length;
  const pendingApproval = DOCUMENTS.filter(d=>d.approvalStatus==='รออนุมัติ').length;
  const inProgress = DOCUMENTS.filter(d=>d.approvalStatus==='ร่าง'||d.approvalStatus==='รอทบทวน').length;
  const overdue = DOCUMENTS.filter(d=> nextReviewDate(d) < Date.now()).length;

  let list = DOCUMENTS.slice();
  if(state.revFilter.clause!=='All') list = list.filter(d=>(d.clause||'')===state.revFilter.clause);
  if(state.revFilter.type!=='All') list = list.filter(d=>docTypeCode(d)===state.revFilter.type);
  if(state.revFilter.status!=='All') list = list.filter(d=>d.approvalStatus===state.revFilter.status);
  if(state.revFilter.q){
    const q = state.revFilter.q.toLowerCase();
    list = list.filter(d=> d.id.toLowerCase().includes(q) || d.name.toLowerCase().includes(q));
  }
  list = list.slice().sort((a,b)=>(b.lastUpdated||0)-(a.lastUpdated||0));
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(list.length/pageSize));
  state.revPage = Math.min(state.revPage||1, pages);
  const start = (state.revPage-1)*pageSize;
  const pageItems = list.slice(start, start+pageSize);
  if(!state.selectedDoc || !DOCUMENTS.some(x=>x.id===state.selectedDoc)) state.selectedDoc = (list[0] || DOCUMENTS[0] || {}).id;
  const selectedDoc = DOCUMENTS.find(x=>x.id===state.selectedDoc);

  // "page 2" of Revision: showing one document's detail replaces the list
  // entirely (not appended below it) — navigate back to return to the list.
  if(state.revisionDetailOpen && selectedDoc){
    return viewRevisionDetailInline(selectedDoc, true);
  }

  const clauseOpts = [['All','ทุกข้อกำหนด'], ['','ไม่ระบุ'], ...CLAUSES];
  const typeOpts = [['All','ทุกประเภท'], ...Object.entries(DOC_TYPE_MAP)];
  const statusOpts = [['All','ทุกสถานะ'], ...[...STATUS_FLOW,'ไม่อนุมัติ'].map(s=>[s,s])];

  // latest activity feed: real comment events across all docs + real overdue alerts
  const commentEvents = DOCUMENTS.flatMap(d=> (d.comments||[]).map(c=>{
    const cls = classifyEvent(c.text);
    return { ...cls, time:c.time, by:c.by, docId:d.id, docName:cleanName(d), detail:c.text };
  }));
  const overdueEvents = DOCUMENTS.filter(d=> nextReviewDate(d) < Date.now()).map(d=>({
    icon:'bell', bg:'--red-600', title:'แก้ไขเกินกำหนด', time: nextReviewDate(d), by:'',
    docId:d.id, docName:cleanName(d), detail:`กำหนดทบทวน: ${fmtDate(nextReviewDate(d))}`,
  }));
  const feed = [...commentEvents, ...overdueEvents].sort((a,b)=>(b.time||0)-(a.time||0)).slice(0,4);

  return `
  <div class="panel">
    <div class="panel-title">Revision</div>
    <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">ติดตามการแก้ไขและประวัติการอนุมัติเอกสาร</div>
  </div>
  <div class="stat-row-5">
    <div class="stat-card"><div class="stat-icon blue">${ic('doc')}</div><div><div class="stat-num">${total}</div><div class="stat-label">เอกสารทั้งหมด</div></div></div>
    <div class="stat-card"><div class="stat-icon green">${ic('check')}</div><div><div class="stat-num">${revised}</div><div class="stat-label">แก้ไขแล้ว</div></div></div>
    <div class="stat-card"><div class="stat-icon amber">${ic('send')}</div><div><div class="stat-num">${pendingApproval}</div><div class="stat-label">รออนุมัติ</div></div></div>
    <div class="stat-card"><div class="stat-icon purple">${ic('clock')}</div><div><div class="stat-num">${inProgress}</div><div class="stat-label">ร่าง/แก้ไขล่าสุด</div></div></div>
    <div class="stat-card"><div class="stat-icon red">${ic('bell')}</div><div><div class="stat-num">${overdue}</div><div class="stat-label">แก้ไขเกินกำหนด</div></div></div>
  </div>

  <div class="panel">
    <div class="toolbar">
      <div class="search"><span>${ic('search')}</span><input id="revSearch" placeholder="ค้นหาเอกสาร..." value="${state.revFilter.q}"></div>
      <select class="select" id="revFClause">${clauseOpts.map(([v,l])=>`<option value="${v}" ${v===state.revFilter.clause?'selected':''}>${l}</option>`).join('')}</select>
      <select class="select" id="revFType">${typeOpts.map(([v,l])=>`<option value="${v}" ${v===state.revFilter.type?'selected':''}>${l}</option>`).join('')}</select>
      <select class="select" id="revFStatus">${statusOpts.map(([v,l])=>`<option value="${v}" ${v===state.revFilter.status?'selected':''}>${l}</option>`).join('')}</select>
    </div>
    <div class="table-wrap"><table class="dtable">
      <thead><tr><th>เอกสาร</th><th>ข้อกำหนด</th><th>เวอร์ชันปัจจุบัน</th><th>สถานะ</th><th>แก้ไขล่าสุด</th><th>ถัดไป (ทบทวนภายใน)</th><th></th></tr></thead>
      <tbody>
        ${pageItems.length ? pageItems.map(d=>{
          const nrd = nextReviewDate(d);
          const days = daysUntil(nrd);
          const isOverdue = days < 0;
          return `
        <tr class="${d.id===state.selectedDoc?'current-row':''}" data-open-rev="${d.id}">
          <td class="mono">${d.id}<div class="name" title="${cleanName(d).replace(/"/g,'&quot;')}" style="max-width:220px;">${cleanName(d)}</div></td>
          <td>${d.clause || '<span style="color:var(--ink-400);">—</span>'}</td>
          <td>${d.rev || '—'}</td>
          <td>${approvalBadge(d.approvalStatus)}</td>
          <td>${fmtDateTime(d.lastUpdated)}</td>
          <td><div class="next-review" style="color:${isOverdue?'var(--red-600)':'var(--ink-700)'}">${fmtDate(nrd)}<div class="rel" style="color:${isOverdue?'var(--red-600)':'var(--ink-500)'}">${isOverdue ? `เกินกำหนด ${Math.abs(days)} วัน` : `อีก ${days} วัน`}</div></div></td>
          <td><button class="chev-btn" data-open-rev-btn="${d.id}">${ic('chevronRight')}</button></td>
        </tr>`;
        }).join('') : `<tr><td colspan="7" style="text-align:center; padding:40px 0; color:var(--ink-500);">ไม่มีเอกสารตรงตามเงื่อนไข</td></tr>`}
      </tbody>
    </table></div>
    <div class="pagination">
      <div>แสดง ${pageItems.length?start+1:0}–${start+pageItems.length} จาก ${list.length} รายการ</div>
      <div class="pg-btns">
        <button ${state.revPage===1?'disabled':''} id="revPgPrev">‹</button>
        ${Array.from({length:pages}).map((_,i)=>`<button class="${i+1===state.revPage?'active':''}" data-revpg="${i+1}">${i+1}</button>`).join('')}
        <button ${state.revPage===pages?'disabled':''} id="revPgNext">›</button>
      </div>
    </div>
  </div>



  <div class="panel">
    <div class="panel-head"><div class="panel-title">กิจกรรมล่าสุด (Latest Activity)</div><a class="panel-link" style="cursor:pointer;" data-go="audittrail">ดูทั้งหมด →</a></div>
    <div class="activity-grid">
      ${feed.length ? feed.map(a=>`
        <div class="activity-card">
          <div class="ac-icon" style="background:var(${a.bg})">${ic(a.icon)}</div>
          <div class="ac-title">${a.title}</div>
          <div class="ac-sub">${a.docId} ${a.docName}</div>
          <div class="ac-meta">${a.by ? `โดย ${a.by} · ` : ''}${fmtDateTime(a.time)}</div>
        </div>`).join('') : `<div style="grid-column:1/-1; color:var(--ink-500); font-size:12.5px; text-align:center; padding:20px;">ยังไม่มีกิจกรรม</div>`}
    </div>
  </div>`;
}
function attachRevisionDashboardHandlers(){
  const search = document.getElementById('revSearch');
  if(search) search.addEventListener('input', e=>{
    const cursorPos = e.target.selectionStart;
    state.revFilter.q = e.target.value;
    state.revPage = 1;
    render();
    const refreshed = document.getElementById('revSearch');
    if(refreshed){ refreshed.focus(); refreshed.setSelectionRange(cursorPos, cursorPos); }
  });
  const fc = document.getElementById('revFClause'); if(fc) fc.addEventListener('change', e=>{ state.revFilter.clause = e.target.value; state.revPage=1; render(); });
  const ft = document.getElementById('revFType'); if(ft) ft.addEventListener('change', e=>{ state.revFilter.type = e.target.value; state.revPage=1; render(); });
  const fs = document.getElementById('revFStatus'); if(fs) fs.addEventListener('change', e=>{ state.revFilter.status = e.target.value; state.revPage=1; render(); });
  document.querySelectorAll('[data-revpg]').forEach(b=>b.addEventListener('click', ()=>{ state.revPage=parseInt(b.dataset.revpg,10); render(); }));
  const revPgPrev = document.getElementById('revPgPrev'); if(revPgPrev) revPgPrev.addEventListener('click', ()=>{ state.revPage=Math.max(1,state.revPage-1); render(); });
  const revPgNext = document.getElementById('revPgNext'); if(revPgNext) revPgNext.addEventListener('click', ()=>{ state.revPage=state.revPage+1; render(); });
  document.querySelectorAll('[data-open-rev],[data-open-rev-btn]').forEach(elx=>{
    elx.addEventListener('click', e=>{
      e.stopPropagation();
      const id = elx.dataset.openRev || elx.dataset.openRevBtn;
      goTo('revision', { selectedDoc: id, revisionDetailOpen: true, revisionTimelineExpanded: false });
    });
  });
  const toggleTimelineBtn = document.getElementById('btnToggleRevTimeline');
  if(toggleTimelineBtn) toggleTimelineBtn.addEventListener('click', ()=>{ state.revisionTimelineExpanded = !state.revisionTimelineExpanded; render(); });
  const editBtn = document.getElementById('revDetailEdit');
  if(editBtn) editBtn.addEventListener('click', ()=> openModal({ mode:'edit', id: state.selectedDoc }));
  const reviseBtn = document.getElementById('revDetailRevise');
  if(reviseBtn) reviseBtn.addEventListener('click', ()=> openModal({ mode:'revise', id: state.selectedDoc }));
  const approvalBtn = document.getElementById('revDetailApproval');
  if(approvalBtn) approvalBtn.addEventListener('click', ()=>{
    const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
    const tab = d && ['อนุมัติแล้ว','ไม่อนุมัติ'].includes(d.approvalStatus) ? 'history' : 'active';
    goTo('approval', { selectedDoc: state.selectedDoc, approvalTab: tab, approvalPage: 1, approvalDetailOpen: true, approvalCommentsExpanded: false });
  });
  const delBtn = document.getElementById('revDetailDelete');
  if(delBtn) delBtn.addEventListener('click', async ()=>{
    const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
    if(!d) return;
    if(!confirm(`ลบเอกสาร "${d.id} ${cleanName(d)}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    DOCUMENTS = DOCUMENTS.filter(x=>x.id!==d.id);
    state.selectedDoc = null;
    state.revisionDetailOpen = false;
    await persistDocs();
    goBack();
  });
  const confirmReviewBtn = document.getElementById('btnConfirmReview');
  if(confirmReviewBtn) confirmReviewBtn.addEventListener('click', async ()=>{
    const nameInput = document.getElementById('revReviewerName');
    const actor = nameInput ? nameInput.value.trim() : '';
    if(!actor){ alert('กรอกชื่อผู้ขอทบทวนก่อน'); return; }
    const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
    if(!d) return;
    const now = Date.now();
    // send it through the same approval workflow as a revision request —
    // the review isn't official until it's approved through all steps
    d.approvalStatus = 'รอทบทวน';
    d.lastRequestType = 'review';
    d.lastRequestFrom = d.rev || null;
    d.approvedBy = null; d.approvedAt = null; d.approvedComment = null;
    d.comments = d.comments || [];
    d.comments.push({ by:actor, text:'ขอทบทวนประจำปี — ไม่มีการแก้ไขเอกสาร', time: now });
    d.lastUpdated = now;
    await persistDocs();
    goTo('approval', { selectedDoc: d.id, approvalTab:'active', approvalPage:1, approvalDetailOpen:true, approvalCommentsExpanded:false });
  });
  const goReviewApprovalBtn = document.getElementById('btnGoReviewApproval');
  if(goReviewApprovalBtn) goReviewApprovalBtn.addEventListener('click', ()=>{
    goTo('approval', { selectedDoc: state.selectedDoc, approvalTab:'active', approvalPage:1, approvalDetailOpen:true, approvalCommentsExpanded:false });
  });
}

// ============================================================
// APPROVAL VIEW (ported logic from previous app — actor name +
// comment required, writes STATUS_FLOW transitions to Firestore)
// ============================================================
let lastActorName = '';
const STEP_LABEL = { 'ร่าง':'รอส่งตรวจ', 'รอทบทวน':'รอผู้ทบทวน', 'รออนุมัติ':'รอผู้อนุมัติ', 'อนุมัติแล้ว':'เสร็จสมบูรณ์', 'ไม่อนุมัติ':'ถูกปฏิเสธ' };
const STEP_COLOR_VAR = { active:'--green-600', review:'--amber-600', pending:'--blue-600', overdue:'--red-600', draft:'--ink-400' };
function stepIndicator(status){
  const cls = APPROVAL_STATUS_STYLE[status] || 'draft';
  const cv = STEP_COLOR_VAR[cls];
  return `<span style="display:inline-flex; align-items:center; gap:6px; font-weight:600; font-size:12px; color:var(${cv});"><span style="width:7px;height:7px;border-radius:50%;background:var(${cv});display:inline-block; flex-shrink:0;"></span>${STEP_LABEL[status]||status}</span>`;
}
function actorForDoc(d){
  const status = d.approvalStatus || 'ร่าง';
  if(status==='ร่าง') return { name: d.preparedBy||'', role:'เจ้าหน้าที่เอกสาร' };
  if(status==='รอทบทวน') return { name: d.reviewerName||'', role:'ผู้ทบทวน' };
  if(status==='รออนุมัติ') return { name: d.approverName||'', role:'ผู้อนุมัติ' };
  if(status==='อนุมัติแล้ว') return { name: d.approvedBy||d.approverName||'', role:'ผู้อนุมัติ' };
  if(status==='ไม่อนุมัติ') return { name: d.approvedBy||'', role:'ผู้พิจารณา' };
  return { name:'', role:'' };
}
function initials(name){
  if(!name) return '?';
  return name.trim().slice(0,2);
}

function viewApproval(){
  const queue = pendingQueue();
  if(!state.selectedDoc) state.selectedDoc = (queue[0] || DOCUMENTS[0] || {}).id;

  // "page 2" of Approval: showing one document's detail replaces the list
  // entirely (not appended below it) — navigate back to return to the list.
  if(state.approvalDetailOpen){
    const selectedDoc = DOCUMENTS.find(x=>x.id===state.selectedDoc);
    if(selectedDoc) return `<div class="crumb" data-back="1">‹ กลับไปที่รายการ</div>${viewApprovalDetail()}`;
  }

  const countDraft = DOCUMENTS.filter(x=>x.approvalStatus==='ร่าง'||!x.approvalStatus).length;
  const countReview = DOCUMENTS.filter(x=>x.approvalStatus==='รอทบทวน').length;
  const countWaitApprove = DOCUMENTS.filter(x=>x.approvalStatus==='รออนุมัติ').length;
  const countApproved = DOCUMENTS.filter(x=>x.approvalStatus==='อนุมัติแล้ว').length;
  const countRejected = DOCUMENTS.filter(x=>x.approvalStatus==='ไม่อนุมัติ').length;
  const total = DOCUMENTS.length;
  const activeCount = countDraft + countReview + countWaitApprove;
  const historyCount = countApproved + countRejected;

  const tabs = [
    { key:'active', label:'คำขอที่กำลังดำเนินการ', n: activeCount },
    { key:'history', label:'ประวัติ', n: historyCount },
  ];

  let filtered = state.approvalTab==='history'
    ? DOCUMENTS.filter(x=> x.approvalStatus==='อนุมัติแล้ว' || x.approvalStatus==='ไม่อนุมัติ')
    : DOCUMENTS.filter(x=> !x.approvalStatus || x.approvalStatus==='ร่าง' || x.approvalStatus==='รอทบทวน' || x.approvalStatus==='รออนุมัติ');
  if(state.approvalTypeFilter!=='All') filtered = filtered.filter(x=>docTypeCode(x)===state.approvalTypeFilter);
  filtered = filtered.slice().sort((a,b)=> (b.lastUpdated||0)-(a.lastUpdated||0));

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(filtered.length/pageSize));
  state.approvalPage = Math.min(state.approvalPage, pages);
  const start = (state.approvalPage-1)*pageSize;
  const pageItems = filtered.slice(start, start+pageSize);
  const typeOpts = [['All','ทุกประเภท'], ...Object.entries(DOC_TYPE_MAP)];

  return `
  <div class="stat-row-5">
    <div class="stat-card"><div class="stat-icon blue">${ic('doc')}</div>
      <div><div class="stat-num">${total}</div><div class="stat-label">รายการทั้งหมด</div></div></div>
    <div class="stat-card"><div class="stat-icon purple">${ic('edit')}</div>
      <div><div class="stat-num">${countDraft}</div><div class="stat-label">ร่าง</div></div></div>
    <div class="stat-card"><div class="stat-icon amber">${ic('clock')}</div>
      <div><div class="stat-num">${countReview}</div><div class="stat-label">รอทบทวน</div></div></div>
    <div class="stat-card"><div class="stat-icon blue">${ic('clock')}</div>
      <div><div class="stat-num">${countWaitApprove}</div><div class="stat-label">รออนุมัติ</div></div></div>
    <div class="stat-card"><div class="stat-icon green">${ic('check')}</div>
      <div><div class="stat-num">${countApproved}</div><div class="stat-label">อนุมัติแล้ว</div></div></div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title">Approval</div>
        <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">ติดตามสถานะการพิจารณาและอนุมัติเอกสาร</div>
      </div>
      <div style="display:flex; gap:8px;">
        <select class="select" id="apTypeFilter">${typeOpts.map(([v,l])=>`<option value="${v}" ${v===state.approvalTypeFilter?'selected':''}>${l}</option>`).join('')}</select>
        <button class="btn primary" id="btnApNewDoc">${ic('plus')} นำรายการใหม่</button>
      </div>
    </div>

    <div class="tabs">
      ${tabs.map(t=>`<button class="tab ${state.approvalTab===t.key?'active':''}" data-ap-tab="${t.key}">${t.label}<span class="cnt">${t.n}</span></button>`).join('')}
    </div>

    <div class="table-wrap"><table class="dtable">
      <thead><tr><th>รหัสเอกสาร</th><th>ชื่อเอกสาร</th><th>สถานะ</th><th>ขั้นตอนปัจจุบัน</th><th>ผู้ดำเนินการ</th><th>อัปเดตล่าสุด</th></tr></thead>
      <tbody>
        ${pageItems.length ? pageItems.map(d=>{
          const actor = actorForDoc(d);
          return `
        <tr class="${d.id===state.selectedDoc?'current-row':''}" data-select-approval="${d.id}">
          <td class="mono">${d.id}</td>
          <td class="name" title="${cleanName(d).replace(/"/g,'&quot;')}">${cleanName(d)}</td>
          <td>${approvalBadge(d.approvalStatus)}</td>
          <td>${stepIndicator(d.approvalStatus||'ร่าง')}</td>
          <td><div class="actor-cell"><div class="row-avatar">${initials(actor.name)}</div><div><div class="actor-name">${actor.name||'—'}</div><div class="actor-role">${actor.role}</div></div></div></td>
          <td>${fmtDateTime(d.lastUpdated)}</td>
        </tr>`;
        }).join('') : `<tr><td colspan="6" style="text-align:center; padding:40px 0; color:var(--ink-500);">ไม่มีเอกสารในหมวดนี้</td></tr>`}
      </tbody>
    </table></div>
    <div class="pagination">
      <div>แสดง ${pageItems.length?start+1:0}–${start+pageItems.length} จาก ${filtered.length} รายการ</div>
      <div class="pg-btns">
        <button ${state.approvalPage===1?'disabled':''} id="apPgPrev">‹</button>
        ${Array.from({length:pages}).map((_,i)=>`<button class="${i+1===state.approvalPage?'active':''}" data-appg="${i+1}">${i+1}</button>`).join('')}
        <button ${state.approvalPage===pages?'disabled':''} id="apPgNext">›</button>
      </div>
    </div>
  </div>
  `;
}

function viewApprovalDetail(){
  const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
  if(!d) return '';
  const status = d.approvalStatus || 'ร่าง';
  const currentIdx = STATUS_FLOW.indexOf(status);
  const isRejected = status === 'ไม่อนุมัติ';

  const steps = STATUS_FLOW.map((s,i)=>{
    const done = !isRejected && i<=currentIdx;
    const isNext = !isRejected && i===currentIdx+1;
    return { label:s, cls: done?'done':(isNext?'pending':'waiting') };
  });

  const isApproved = status === 'อนุมัติแล้ว';
  const lastComment = (d.comments||[])[ (d.comments||[]).length-1 ];
  const approvedBy = d.approvedBy || (lastComment ? lastComment.by : '');
  const approvedAt = d.approvedAt || (lastComment ? lastComment.time : d.lastUpdated);
  const approvedComment = d.approvedComment !== undefined ? d.approvedComment : (lastComment ? lastComment.text : '');
  const requestLabel = d.lastRequestType==='new' ? 'เอกสารใหม่' : d.lastRequestType==='revision' ? `ปรับปรุง (Rev.${d.lastRequestFrom||'-'} → ${d.rev||'-'})` : d.lastRequestType==='review' ? 'ทบทวนประจำปี (ไม่มีการแก้ไข)' : null;
  const allComments = (d.comments||[]).slice().reverse();
  const shownComments = state.approvalCommentsExpanded ? allComments : allComments.slice(0,5);

  return `
  <div class="panel">
    <div class="panel-head">
      <div>
        <div class="panel-title" style="display:flex; align-items:center; gap:9px; flex-wrap:wrap;">${d.id} ${cleanName(d)} ${approvalBadge(status)}</div>
        <div style="font-size:12px; color:var(--ink-500); margin-top:3px; font-weight:600;">ข้อกำหนด: ${d.clause ? clauseLabel(d.clause) : 'ไม่ระบุ'}${requestLabel ? ` · คำขอ: ${requestLabel}` : ''}</div>
      </div>
      <button class="btn ghost" data-go="docdetail">${ic('doc')} ดูรายละเอียดเอกสาร</button>
    </div>

    <div class="grid grid-3" style="margin-bottom:18px;">
      <div class="side-box"><div class="side-box-title">ผู้จัดทำ / ผู้ร่าง</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.preparedBy || '—'}</div></div>
      <div class="side-box"><div class="side-box-title">ผู้ทบทวน</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.reviewerName || '—'}</div></div>
      <div class="side-box"><div class="side-box-title">ผู้อนุมัติ</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.approverName || d.approvedBy || '—'}</div></div>
      <div class="side-box"><div class="side-box-title">วันที่จัดทำ</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.createdDate ? fmtDate(d.createdDate) : '—'}</div></div>
      <div class="side-box"><div class="side-box-title">วันที่ประกาศใช้</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${d.effectiveDate ? fmtDate(d.effectiveDate) : '—'}</div></div>
      <div class="side-box"><div class="side-box-title">อัปเดตล่าสุด</div><div style="font-size:12.5px; font-weight:700; color:var(--ink-900);">${fmtDateTime(d.lastUpdated)}</div></div>
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
    <div class="field" style="max-width:320px;"><label>ชื่อผู้ดำเนินการ</label><input id="approvalActor" placeholder="ชื่อ-นามสกุล" value="${lastActorName.replace(/"/g,'&quot;')}"></div>
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

    <div class="panel-head" style="margin:20px 0 10px;">
      <div class="panel-title" style="margin:0;">ประวัติความเห็น ${allComments.length ? `<span style="color:var(--ink-500); font-weight:600; font-size:12px;">(${allComments.length})</span>` : ''}</div>
      ${allComments.length > 5 ? `<button class="panel-link" id="btnToggleComments" style="cursor:pointer;">${state.approvalCommentsExpanded ? 'ย่อ ▲' : `แสดงทั้งหมด (${allComments.length}) ▼`}</button>` : ''}
    </div>
    ${shownComments.length ? shownComments.map(c=>`
      <div class="at-item"><div class="at-icon">${ic('user')}</div>
        <div class="at-main"><div class="at-title">${c.by}</div><div class="at-meta">${c.text}</div></div>
        <div class="at-time">${fmtDateTime(c.time)}</div>
      </div>`).join('') : `<div style="color:var(--ink-500); font-size:12.5px;">ยังไม่มีความเห็น</div>`}
  </div>`;
}

function attachApprovalHandlers(){
  document.querySelectorAll('[data-ap-tab]').forEach(elx=>{
    elx.addEventListener('click', ()=>{ state.approvalTab = elx.dataset.apTab; state.approvalPage = 1; render(); });
  });
  const typeFilter = document.getElementById('apTypeFilter');
  if(typeFilter) typeFilter.addEventListener('change', e=>{ state.approvalTypeFilter = e.target.value; state.approvalPage = 1; render(); });
  const newBtn = document.getElementById('btnApNewDoc');
  if(newBtn) newBtn.addEventListener('click', ()=> openModal({ mode:'new' }));
  document.querySelectorAll('[data-appg]').forEach(b=>b.addEventListener('click', ()=>{ state.approvalPage=parseInt(b.dataset.appg,10); render(); }));
  const pgPrev = document.getElementById('apPgPrev'); if(pgPrev) pgPrev.addEventListener('click', ()=>{ state.approvalPage=Math.max(1,state.approvalPage-1); render(); });
  const pgNext = document.getElementById('apPgNext'); if(pgNext) pgNext.addEventListener('click', ()=>{ state.approvalPage=state.approvalPage+1; render(); });
  document.querySelectorAll('[data-select-approval]').forEach(row=>{
    row.addEventListener('click', ()=>{ goTo('approval', { selectedDoc: row.dataset.selectApproval, approvalDetailOpen: true, approvalCommentsExpanded: false }); });
  });

  const d = DOCUMENTS.find(x=>x.id===state.selectedDoc);
  if(!d) return;
  const status = d.approvalStatus || 'ร่าง';
  const currentIdx = STATUS_FLOW.indexOf(status);

  const toggleCommentsBtn = document.getElementById('btnToggleComments');
  if(toggleCommentsBtn) toggleCommentsBtn.addEventListener('click', ()=>{ state.approvalCommentsExpanded = !state.approvalCommentsExpanded; render(); });

  const approveBtn = document.getElementById('btnApprove');
  if(approveBtn) approveBtn.addEventListener('click', async ()=>{
    const actor = document.getElementById('approvalActor').value.trim();
    const errEl = document.getElementById('approvalError');
    if(!actor){ errEl.textContent='กรอกชื่อผู้ดำเนินการก่อน'; errEl.style.display='block'; return; }
    lastActorName = actor;
    const comment = document.getElementById('approvalComment').value.trim();
    const nextIdx = Math.min(currentIdx+1, STATUS_FLOW.length-1);
    const now = Date.now();
    d.approvalStatus = STATUS_FLOW[nextIdx];
    d.lastUpdated = now;
    d.comments = d.comments || [];
    d.comments.push({ by:actor, text: comment || `อนุมัติ → ${d.approvalStatus}`, time: now });
    // record the reviewer/approver names on the document's formal record —
    // only for actual new-document or revision-update requests, per SOP
    // (annual review confirmations don't touch these role fields)
    const isFormalRequest = d.lastRequestType==='new' || d.lastRequestType==='revision';
    if(isFormalRequest && d.approvalStatus==='รออนุมัติ'){
      d.reviewerName = actor;
    }
    if(d.approvalStatus==='อนุมัติแล้ว'){
      d.approvedBy = actor;
      d.approvedAt = now;
      d.approvedComment = comment || '';
      if(isFormalRequest){
        d.approverName = actor;
      }
      if(d.lastRequestType==='review'){
        d.lastReviewedAt = now;
        d.lastReviewedBy = actor;
      }
      // per lab decision: an approved revision is the trigger point to
      // migrate an old RDI- id to the new MPIR-xx-###-rr format
      if(d.lastRequestType==='revision' && !/^MPIR-/i.test(d.id)){
        const typeCode = docTypeCode(d);
        const oldId = d.id;
        const newId = toMpirId(oldId, typeCode, d.rev);
        d.id = newId;
        d.comments.push({ by:actor, text:`เปลี่ยนรหัสเอกสารจาก ${oldId} เป็น ${newId} ตามรูปแบบใหม่`, time: now });
        state.selectedDoc = newId;
      }
    }
    if(['อนุมัติแล้ว','ไม่อนุมัติ'].includes(d.approvalStatus)){
      state.approvalTab = 'history';
      state.approvalPage = 1;
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
    lastActorName = actor;
    d.approvalStatus = 'ไม่อนุมัติ';
    d.lastUpdated = Date.now();
    d.comments = d.comments || [];
    d.comments.push({ by:actor, text:comment, time: Date.now() });
    d.approvedBy = null; d.approvedAt = null; d.approvedComment = null;
    state.approvalTab = 'history';
    state.approvalPage = 1;
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
    <div class="panel-head">
      <div>
        <div class="panel-title">Audit View</div>
        <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">ภาพรวมสถานข้อกำหนด ISO/IEC 17025</div>
      </div>
      <button class="btn ghost" data-go="iso">${ic('doc')} View All Clauses</button>
    </div>
    <div class="clause-select-row" style="margin-top:8px;">
      <div class="panel-title" style="font-size:12.5px;">Select Clause</div>
      <select class="select" id="auditClausePicker">
        <option value="">ไม่ระบุข้อกำหนด</option>
        ${CLAUSES.map(([c,l])=>`<option value="${c}" ${c===clause?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>
  </div>

  <div class="stat-row">
    <div class="stat-card clickable" data-audit-clause="${clause}">
      <div class="stat-icon blue">${ic('doc')}</div>
      <div><div class="stat-num">${docs.length}</div><div class="stat-label">Documents<br>เอกสารที่เกี่ยวข้อง</div><a class="stat-card-link">View details →</a></div>
    </div>
    <div class="stat-card clickable" data-audit-scroll="auditColDocs">
      <div class="stat-icon green">${ic('check')}</div>
      <div><div class="stat-num">${approvedCount}</div><div class="stat-label">Approved<br>อนุมัติแล้ว</div><a class="stat-card-link">View details →</a></div>
    </div>
    <div class="stat-card clickable" data-go="records">
      <div class="stat-icon purple">${ic('user')}</div>
      <div><div class="stat-num">${evidence.length}</div><div class="stat-label">Evidence / Support<br>หลักฐาน / ข้อมูลสนับสนุน</div><a class="stat-card-link">View details →</a></div>
    </div>
    <div class="stat-card clickable" data-audit-scroll="auditColRelated">
      <div class="stat-icon amber">${ic('link')}</div>
      <div><div class="stat-num">${related.length}</div><div class="stat-label">Related Clauses<br>ข้อกำหนดที่เกี่ยวข้อง</div><a class="stat-card-link">View details →</a></div>
    </div>
  </div>

  <div class="panel">
    <div class="audit-cols" style="grid-template-columns:1fr 1fr 1fr;">
      <div class="audit-col-panel" id="auditColDocs">
        <div class="audit-col-head">${ic('doc')}<span class="audit-col-title" style="margin-bottom:0;">Documents</span></div>
        <div class="audit-col-body">
          ${docs.length ? docs.slice(0,6).map(d=>`<div class="audit-link" data-open-doc="${d.id}"><span class="dot"></span>${d.id} ${cleanName(d)}</div>`).join('') : `<div style="color:var(--ink-400); font-size:12px;">—</div>`}
        </div>
        <div class="audit-col-foot"><a data-go="documents" data-preset="all">View all documents →</a></div>
      </div>
      <div class="audit-col-panel">
        <div class="audit-col-head">${ic('user')}<span class="audit-col-title" style="margin-bottom:0;">Evidence / Support</span></div>
        <div class="audit-col-body">
          ${evidence.length ? evidence.slice(0,6).map(d=>`<div class="audit-link" data-open-doc="${d.id}"><span class="dot"></span>${d.id} ${cleanName(d)}</div>`).join('') : `
          <div class="audit-empty">${ic('search')}<p>ยังไม่มีข้อมูล</p></div>`}
        </div>
        <div class="audit-col-foot"><a data-go="records">View all evidence →</a></div>
      </div>
      <div class="audit-col-panel" id="auditColRelated">
        <div class="audit-col-head">${ic('link')}<span class="audit-col-title" style="margin-bottom:0;">Related Clauses</span></div>
        <div class="audit-col-body">
          ${related.length ? related.slice(0,6).map(r=>`<div class="audit-link" data-clause-jump-audit="${r.id}"><span class="dot"></span>${r.id} ${r.title}</div>`).join('') : `<div style="color:var(--ink-400); font-size:12px;">—</div>`}
        </div>
        <div class="audit-col-foot"><a data-go="iso">View all related clauses →</a></div>
      </div>
    </div>
  </div>`;
}
function attachAuditHandlers(){
  const picker = document.getElementById('auditClausePicker');
  if(picker) picker.addEventListener('change', e=>{ state.selectedClause = e.target.value; render(); });
  document.querySelectorAll('[data-clause-jump-audit]').forEach(elx=>{
    elx.addEventListener('click', ()=>{ state.selectedClause = elx.dataset.clauseJumpAudit; render(); });
  });
  document.querySelectorAll('[data-audit-scroll]').forEach(elx=>{
    elx.addEventListener('click', ()=>{
      const target = document.getElementById(elx.dataset.auditScroll);
      if(target) target.scrollIntoView({ behavior:'smooth', block:'center' });
    });
  });
  const docsCard = document.querySelector('[data-audit-clause]');
  if(docsCard) docsCard.addEventListener('click', ()=>{
    goTo('documents', { docFilter:{ clause: state.selectedClause, type:'All', status:'All', q:'', preset:'all' }, docPage:1 });
  });
}

// ============================================================
// DOC PICKER (shared by revision/approval views)
// ============================================================

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
